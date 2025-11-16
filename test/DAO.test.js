const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO full coverage", function () {
  let dao;
  let token;
  let staking;
  let owner;
  let alice;
  let bob;
  let panicWallet;
  let outsider;

  const PRICE = 1n;
  const TOKENS_PER_VP = 1n;
  const MIN_STAKE_VOTE = 10n;
  const MIN_STAKE_PROPOSAL = 20n;
  const VOTING_PERIOD = 60 * 60 * 24;
  const LOCK_TIME = 60 * 60;

  beforeEach(async function () {
    [owner, alice, bob, panicWallet, outsider] = await ethers.getSigners();

    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    token = await MockTokenFactory.deploy();
    await token.waitForDeployment();

    const MockStakingFactory = await ethers.getContractFactory("MockStaking");
    staking = await MockStakingFactory.deploy();
    await staking.waitForDeployment();

    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(
      await token.getAddress(),
      owner.address,
      PRICE,
      MIN_STAKE_VOTE,
      MIN_STAKE_PROPOSAL,
      VOTING_PERIOD,
      TOKENS_PER_VP,
      LOCK_TIME
    );
    await dao.waitForDeployment();
  });

  it("constructor invalid cases (reverts)", async function () {
    const F = await ethers.getContractFactory("DAO");

    await expect(
      F.deploy(
        ethers.ZeroAddress,
        owner.address,
        PRICE,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        VOTING_PERIOD,
        TOKENS_PER_VP,
        LOCK_TIME
      )
    ).to.be.reverted;

    await expect(
      F.deploy(
        await token.getAddress(),
        ethers.ZeroAddress,
        PRICE,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        VOTING_PERIOD,
        TOKENS_PER_VP,
        LOCK_TIME
      )
    ).to.be.reverted;

    await expect(
      F.deploy(
        await token.getAddress(),
        owner.address,
        0n,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        VOTING_PERIOD,
        TOKENS_PER_VP,
        LOCK_TIME
      )
    ).to.be.revertedWith("Invalid price");

    await expect(
      F.deploy(
        await token.getAddress(),
        owner.address,
        PRICE,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        VOTING_PERIOD,
        0n,
        LOCK_TIME
      )
    ).to.be.revertedWith("Invalid tokensPerVP");

    await expect(
      F.deploy(
        await token.getAddress(),
        owner.address,
        PRICE,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        0,
        TOKENS_PER_VP,
        LOCK_TIME
      )
    ).to.be.revertedWith("Invalid voting period");

    await expect(
      F.deploy(
        await token.getAddress(),
        owner.address,
        PRICE,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        LOCK_TIME - 1,
        TOKENS_PER_VP,
        LOCK_TIME
      )
    ).to.be.revertedWith("Voting period cannot be less than lock time");
  });

  it("panic flows", async function () {
    await expect(dao.mintTokens(100n)).to.be.reverted; // panic wallet not set -> revert (msg varies)

    await expect(
      dao.connect(outsider).setPanicWallet(panicWallet.address)
    ).to.be.reverted;

    await expect(dao.setPanicWallet(ethers.ZeroAddress)).to.be.revertedWith("Invalid wallet");

    await expect(dao.setPanicWallet(panicWallet.address)).to.emit(dao, "PanicSet").withArgs(panicWallet.address);

    await expect(dao.connect(outsider).panic()).to.be.revertedWith("Only panic wallet can trigger panic");
    await expect(dao.connect(panicWallet).panic()).to.emit(dao, "PanicTriggered");
    expect(await dao.isPanicked()).to.equal(true);

    await expect(dao.mintTokens(1n)).to.be.revertedWith("Panic mode active");
    await expect(dao.connect(outsider).tranquility()).to.be.revertedWith("Only panic wallet can restore tranquility");
    await expect(dao.connect(panicWallet).tranquility()).to.emit(dao, "TranquilityRestored");
    expect(await dao.isPanicked()).to.equal(false);
  });

  it("owner mintTokens updateParams changeOwner", async function () {
    await expect(dao.mintTokens(100n)).to.be.reverted; // panic not configured

    await dao.setPanicWallet(panicWallet.address);

    await expect(dao.connect(outsider).mintTokens(100n)).to.be.reverted;
    await expect(dao.mintTokens(500n)).to.not.be.reverted;
    expect(await token.balanceOf(await dao.getAddress())).to.equal(500n);

    await expect(dao.updateParams(0n, 1n, 2n, VOTING_PERIOD, 1n, LOCK_TIME)).to.be.revertedWith("Invalid price");
    await expect(dao.updateParams(PRICE, 1n, 2n, VOTING_PERIOD, 0n, LOCK_TIME)).to.be.revertedWith("Invalid tokensPerVP");
    await expect(dao.updateParams(PRICE, 1n, 2n, 0, 1n, LOCK_TIME)).to.be.revertedWith("Invalid voting period");

    const newPrice = PRICE * 2n;
    await expect(dao.updateParams(newPrice, 5n, 6n, VOTING_PERIOD, 2n, LOCK_TIME)).to.emit(dao, "ParamsUpdated").withArgs(newPrice, 5n, 6n, VOTING_PERIOD, 2n, LOCK_TIME);
    expect(await dao.priceWeiPerToken()).to.equal(newPrice);

    await expect(dao.changeOwner(ethers.ZeroAddress)).to.be.revertedWith("Invalid new owner");
    await expect(dao.connect(outsider).changeOwner(outsider.address)).to.be.reverted;
    await dao.changeOwner(alice.address);
    await expect(dao.setPanicWallet(outsider.address)).to.be.reverted;
    await dao.connect(alice).changeOwner(owner.address);
  });

  it("buyTokens flow and edge cases", async function () {
    await dao.setPanicWallet(panicWallet.address);

    const decimals = Number(await token.decimals());
    const amountToMint = 1000n * 10n ** BigInt(decimals);
    await token.mint(await dao.getAddress(), amountToMint);

    const buyer = bob;
    const weiSent = 1n;
    await expect(dao.connect(buyer).buyTokens({ value: weiSent })).to.emit(dao, "TokensPurchased");
    const tokensOut = (weiSent * 10n ** BigInt(decimals)) / BigInt(await dao.priceWeiPerToken());
    expect(await token.balanceOf(buyer.address)).to.equal(tokensOut);

    await expect(dao.connect(buyer).buyTokens({ value: 0n })).to.be.revertedWith("No ETH sent");

    const NewDAO = await ethers.getContractFactory("DAO");
    const dao2 = await NewDAO.deploy(await token.getAddress(), owner.address, PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, TOKENS_PER_VP, LOCK_TIME);
    await dao2.waitForDeployment();
    await dao2.setPanicWallet(panicWallet.address);
    await expect(dao2.connect(buyer).buyTokens({ value: 1n })).to.be.revertedWith("Not enough tokens in DAO");

    // force "Too little ETH": set price very large
    await dao.updateParams(10n ** 30n, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, TOKENS_PER_VP, LOCK_TIME);
    await expect(dao.connect(buyer).buyTokens({ value: 1n })).to.be.revertedWith("Too little ETH");
  });

  it("staking proposals voting unstake finalize flows", async function () {
    await dao.setPanicWallet(panicWallet.address);
    await expect(dao.setStakingAddress(await staking.getAddress())).to.emit(dao, "StakingChanged");
    expect(await dao.staking()).to.equal(await staking.getAddress());

    await expect(dao.connect(alice).createProposal("t", "d", Number(MIN_STAKE_PROPOSAL) - 1)).to.be.revertedWith("Insufficient proposal stake");

    await expect(dao.connect(alice).createProposal("Title1", "Desc1", Number(MIN_STAKE_PROPOSAL))).to.emit(dao, "ProposalCreated");
    expect(await staking.proposalStakeOf(alice.address, 1)).to.equal(Number(MIN_STAKE_PROPOSAL));

    await expect(dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE) - 1)).to.be.revertedWith("Insufficient voting stake");
    await expect(dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE))).to.emit(dao, "Voted");

    const all = await dao.getAllProposals();
    expect(all.length).to.equal(1);
    expect(all[0].votesFor.toString()).to.equal((Number(MIN_STAKE_VOTE) / Number(TOKENS_PER_VP)).toString());

    // another voter against
    await expect(dao.connect(outsider).vote(1, false, Number(MIN_STAKE_VOTE))).to.emit(dao, "Voted");

    await expect(dao.connect(alice).unstakeVote(1)).to.be.revertedWith("User did not vote");
    await expect(dao.connect(bob).unstakeVote(1)).to.emit(staking, "UnstakedVote");
    const afterUn = await dao.getAllProposals();
    expect(afterUn[0].voters.find(v => v.voter === bob.address) === undefined).to.equal(true);

    // toggle to quadratic mode and exercise branch
    await expect(dao.toggleVotingMode()).to.emit(dao, "VotingModeToggled");
    expect(Number(await dao.votingMode())).to.equal(1);

    // outsider had previously voted; try unstakeVote when stake exists (unstake again)
    await expect(dao.connect(outsider).unstakeVote(1)).to.emit(staking, "UnstakedVote");

    // vote again to increase votesFor and cover more branches
    await expect(dao.connect(outsider).vote(1, true, 100)).to.emit(dao, "Voted");
    const propAfter = (await dao.getAllProposals())[0];
    expect(propAfter.votesFor.toString()).to.equal("10");

    await expect(dao.finalize(1)).to.be.revertedWith("Voting period not ended");

    await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
    await ethers.provider.send("evm_mine");

    await expect(dao.finalize(1)).to.emit(dao, "ProposalFinalized");
    const accepted = await dao.getProposalsByStatus(1);
    expect(accepted.length).to.equal(1);
    expect(accepted[0].id).to.equal(1);

    // create new proposal and let it be rejected (no votes)
    await dao.connect(alice).createProposal("Title2", "Desc2", Number(MIN_STAKE_PROPOSAL));
    await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
    await ethers.provider.send("evm_mine");
    await expect(dao.finalize(2)).to.emit(dao, "ProposalFinalized");
    const rejected = await dao.getProposalsByStatus(2);
    expect(rejected.length).to.equal(1);
    expect(rejected[0].id).to.equal(2);
  });

  it("unstakeProposal proxies to staking", async function () {
    await dao.setPanicWallet(panicWallet.address);
    await dao.setStakingAddress(await staking.getAddress());
    await dao.connect(alice).createProposal("P", "D", Number(MIN_STAKE_PROPOSAL));
    await expect(dao.connect(alice).unstakeProposal(1)).to.emit(staking, "UnstakedProposal");
  });

  it("views and getters", async function () {
    await dao.setPanicWallet(panicWallet.address);
    await dao.setStakingAddress(await staking.getAddress());
    await dao.connect(alice).createProposal("A", "a", Number(MIN_STAKE_PROPOSAL));
    await dao.connect(bob).createProposal("B", "b", Number(MIN_STAKE_PROPOSAL));
    const all = await dao.getAllProposals();
    expect(all.length).to.equal(2);
    expect(await dao.isValidProposal(1)).to.equal(true);
    expect(await dao.isValidProposal(0)).to.equal(false);
    expect(await dao.proposalCreator(1)).to.equal(alice.address);
    expect(await dao.lockTime()).to.equal(LOCK_TIME);
    const active = await dao.getProposalsByStatus(0);
    expect(active.length).to.equal(2);
  });

  it("notPanicked modifier blocks functions when panicked", async function () {
    await dao.setPanicWallet(panicWallet.address);
    await dao.setStakingAddress(await staking.getAddress());
    await dao.connect(alice).createProposal("ok", "ok", Number(MIN_STAKE_PROPOSAL));
    await dao.connect(panicWallet).panic();

    await expect(dao.connect(bob).createProposal("x", "y", Number(MIN_STAKE_PROPOSAL))).to.be.revertedWith("Panic mode active");
    await expect(dao.mintTokens(1n)).to.be.revertedWith("Panic mode active");
    await expect(dao.connect(bob).unstakeProposal(1)).to.be.revertedWith("Panic mode active");
    await expect(dao.buyTokens({ value: 1n })).to.be.revertedWith("Panic mode active");
  });

  it("vote zero voting power branch", async function () {
    await dao.setPanicWallet(panicWallet.address);
    await dao.setStakingAddress(await staking.getAddress());
    await dao.updateParams(PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, 100n, LOCK_TIME);
    await dao.connect(alice).createProposal("ZeroVP", "z", Number(MIN_STAKE_PROPOSAL));
    await expect(dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE))).to.be.revertedWith("Zero voting power");
  });

  // additional explicit checks for panic/permission branches
  it("panic/tranquility unauthorized calls revert", async function () {
    await dao.setPanicWallet(panicWallet.address);
    await expect(dao.connect(alice).panic()).to.be.revertedWith("Only panic wallet can trigger panic");
    await dao.connect(panicWallet).panic();
    await expect(dao.connect(alice).tranquility()).to.be.revertedWith("Only panic wallet can restore tranquility");
    await dao.connect(panicWallet).tranquility();
  });
});