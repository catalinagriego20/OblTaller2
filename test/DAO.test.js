const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Full Coverage", function () {
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

  describe("Constructor validations", function() {
    it("should revert with zero token address", async function () {
      const F = await ethers.getContractFactory("DAO");
      await expect(
        F.deploy(ethers.ZeroAddress, owner.address, PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, TOKENS_PER_VP, LOCK_TIME)
      ).to.be.revertedWith("Invalid token");
    });

    it("should revert with zero owner address", async function () {
      const F = await ethers.getContractFactory("DAO");
      await expect(
        F.deploy(await token.getAddress(), ethers.ZeroAddress, PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, TOKENS_PER_VP, LOCK_TIME)
      ).to.be.reverted; // Ownable throws
    });

    it("should revert with zero price", async function () {
      const F = await ethers.getContractFactory("DAO");
      await expect(
        F.deploy(await token.getAddress(), owner.address, 0n, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, TOKENS_PER_VP, LOCK_TIME)
      ).to.be.revertedWith("Invalid price");
    });

    it("should revert with zero tokensPerVP", async function () {
      const F = await ethers.getContractFactory("DAO");
      await expect(
        F.deploy(await token.getAddress(), owner.address, PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, 0n, LOCK_TIME)
      ).to.be.revertedWith("Invalid tokensPerVP");
    });

    it("should revert with zero voting period", async function () {
      const F = await ethers.getContractFactory("DAO");
      await expect(
        F.deploy(await token.getAddress(), owner.address, PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, 0, TOKENS_PER_VP, LOCK_TIME)
      ).to.be.revertedWith("Invalid voting period");
    });

    it("should revert when voting period less than lock time", async function () {
      const F = await ethers.getContractFactory("DAO");
      await expect(
        F.deploy(await token.getAddress(), owner.address, PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, LOCK_TIME - 1, TOKENS_PER_VP, LOCK_TIME)
      ).to.be.revertedWith("Voting period cannot be less than lock time");
    });
  });

  describe("Panic wallet and panic mode", function() {
    it("should revert mintTokens when panic wallet not set", async function () {
      await expect(dao.mintTokens(100n))
        .to.be.revertedWith("Panic wallet not set");
    });

    it("should revert setPanicWallet with zero address", async function () {
      await expect(dao.setPanicWallet(ethers.ZeroAddress)).to.be.revertedWith("Invalid wallet");
    });

    it("should revert setPanicWallet if not owner", async function () {
      await expect(dao.connect(outsider).setPanicWallet(panicWallet.address)).to.be.reverted;
    });

    it("should set panic wallet successfully", async function () {
      await expect(dao.setPanicWallet(panicWallet.address))
        .to.emit(dao, "PanicSet")
        .withArgs(panicWallet.address);
      expect(await dao.panicWallet()).to.equal(panicWallet.address);
    });

    it("should revert panic if not panic wallet", async function () {
      await dao.setPanicWallet(panicWallet.address);
      await expect(dao.connect(outsider).panic()).to.be.revertedWith("Only panic wallet can trigger panic");
    });

    it("should trigger panic successfully", async function () {
      await dao.setPanicWallet(panicWallet.address);
      await expect(dao.connect(panicWallet).panic())
        .to.emit(dao, "PanicTriggered");
      expect(await dao.isPanicked()).to.equal(true);
    });

    it("should block functions when panicked", async function () {
      await dao.setPanicWallet(panicWallet.address);
      await dao.connect(panicWallet).panic();
      
      await expect(dao.mintTokens(1n)).to.be.revertedWith("Panic mode active");
      await expect(dao.buyTokens({ value: 1n })).to.be.revertedWith("Panic mode active");
    });

    it("should revert tranquility if not panic wallet", async function () {
      await dao.setPanicWallet(panicWallet.address);
      await dao.connect(panicWallet).panic();
      await expect(dao.connect(outsider).tranquility()).to.be.revertedWith("Only panic wallet can restore tranquility");
    });

    it("should restore tranquility successfully", async function () {
      await dao.setPanicWallet(panicWallet.address);
      await dao.connect(panicWallet).panic();
      await expect(dao.connect(panicWallet).tranquility())
        .to.emit(dao, "TranquilityRestored");
      expect(await dao.isPanicked()).to.equal(false);
    });
  });

  describe("Owner functions", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
    });

    it("should mint tokens successfully", async function () {
      await dao.setPanicWallet(panicWallet.address);
      await dao.mintTokens(500n);
      expect(await token.balanceOf(await dao.getAddress())).to.equal(500n);
    });


    it("should revert mintTokens if not owner", async function () {
      await expect(dao.connect(outsider).mintTokens(100n)).to.be.reverted;
    });

    it("should revert updateParams with invalid price", async function () {
      await expect(
        dao.updateParams(0n, 1n, 2n, VOTING_PERIOD, 1n, LOCK_TIME)
      ).to.be.revertedWith("Invalid price");
    });

    it("should revert updateParams with invalid tokensPerVP", async function () {
      await expect(
        dao.updateParams(PRICE, 1n, 2n, VOTING_PERIOD, 0n, LOCK_TIME)
      ).to.be.revertedWith("Invalid tokensPerVP");
    });

    it("should revert updateParams with invalid voting period", async function () {
      await expect(
        dao.updateParams(PRICE, 1n, 2n, 0, 1n, LOCK_TIME)
      ).to.be.revertedWith("Invalid voting period");
    });

    it("should update params successfully", async function () {
      const newPrice = PRICE * 2n;
      await expect(
        dao.updateParams(newPrice, 5n, 6n, VOTING_PERIOD, 2n, LOCK_TIME)
      ).to.emit(dao, "ParamsUpdated")
       .withArgs(newPrice, 5n, 6n, VOTING_PERIOD, 2n, LOCK_TIME);
      
      expect(await dao.priceWeiPerToken()).to.equal(newPrice);
    });

    it("should revert changeOwner with zero address", async function () {
      await expect(dao.changeOwner(ethers.ZeroAddress)).to.be.revertedWith("Invalid new owner");
    });

    it("should revert changeOwner if not owner", async function () {
      await expect(dao.connect(outsider).changeOwner(outsider.address)).to.be.reverted;
    });

    it("should change owner successfully", async function () {
      await dao.changeOwner(alice.address);
      await expect(dao.setPanicWallet(outsider.address)).to.be.reverted;
      await dao.connect(alice).changeOwner(owner.address);
    });
  });

  describe("Buy tokens", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
      const decimals = Number(await token.decimals());
      const amountToMint = 1000n * 10n ** BigInt(decimals);
      await token.mint(await dao.getAddress(), amountToMint);
    });

    it("should buy tokens successfully", async function () {
      const weiSent = 100n;
      await expect(dao.connect(bob).buyTokens({ value: weiSent }))
        .to.emit(dao, "TokensPurchased");
      
      const decimals = Number(await token.decimals());
      const tokensOut = (weiSent * 10n ** BigInt(decimals)) / BigInt(await dao.priceWeiPerToken());
      expect(await token.balanceOf(bob.address)).to.equal(tokensOut);
    });

    it("should revert with zero ETH sent", async function () {
      await expect(dao.connect(bob).buyTokens({ value: 0n }))
        .to.be.revertedWith("No ETH sent");
    });

    it("should revert when DAO has insufficient tokens", async function () {
      const NewDAO = await ethers.getContractFactory("DAO");
      const dao2 = await NewDAO.deploy(
        await token.getAddress(),
        owner.address,
        PRICE,
        MIN_STAKE_VOTE,
        MIN_STAKE_PROPOSAL,
        VOTING_PERIOD,
        TOKENS_PER_VP,
        LOCK_TIME
      );
      await dao2.waitForDeployment();
      await dao2.setPanicWallet(panicWallet.address);
      
      await expect(dao2.connect(bob).buyTokens({ value: 1n }))
        .to.be.revertedWith("Not enough tokens in DAO");
    });

    it("should revert with too little ETH", async function () {
      await dao.updateParams(10n ** 30n, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, TOKENS_PER_VP, LOCK_TIME);
      await expect(dao.connect(bob).buyTokens({ value: 1n }))
        .to.be.revertedWith("Too little ETH");
    });
  });

  describe("Staking and proposals", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
    });

    it("should revert setStakingAddress with zero address", async function () {
      await expect(dao.setStakingAddress(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid staking");
    });

    it("should set staking address", async function () {
      await expect(dao.setStakingAddress(await staking.getAddress()))
        .to.emit(dao, "StakingChanged");
      expect(await dao.staking()).to.equal(await staking.getAddress());
    });

    it("should revert createProposal with insufficient stake", async function () {
      await dao.setStakingAddress(await staking.getAddress());
      await expect(
        dao.connect(alice).createProposal("t", "d", Number(MIN_STAKE_PROPOSAL) - 1)
      ).to.be.revertedWith("Insufficient proposal stake");
    });

    it("should create proposal successfully", async function () {
      await dao.setStakingAddress(await staking.getAddress());
      await expect(
        dao.connect(alice).createProposal("Title1", "Desc1", Number(MIN_STAKE_PROPOSAL))
      ).to.emit(dao, "ProposalCreated");
      
      expect(await staking.proposalStakeOf(alice.address, 1)).to.equal(Number(MIN_STAKE_PROPOSAL));
    });
  });

  describe("Voting", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
      await dao.setStakingAddress(await staking.getAddress());
      await dao.connect(alice).createProposal("P1", "D1", Number(MIN_STAKE_PROPOSAL));
    });

    it("should revert vote with insufficient stake", async function () {
      await expect(
        dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE) - 1)
      ).to.be.revertedWith("Insufficient voting stake");
    });

    it("should vote successfully in LINEAR mode", async function () {
      await expect(dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE)))
        .to.emit(dao, "Voted");
      
      const proposals = await dao.getAllProposals();
      expect(proposals[0].votesFor).to.equal(Number(MIN_STAKE_VOTE) / Number(TOKENS_PER_VP));
    });

    it("should vote successfully in QUADRATIC mode", async function () {
      await dao.toggleVotingMode();
      expect(Number(await dao.votingMode())).to.equal(1);
      
      await dao.connect(bob).vote(1, true, 100);
      const proposals = await dao.getAllProposals();
      expect(proposals[0].votesFor).to.equal(10); // sqrt(100/1) = 10
    });

    it("should revert vote with zero voting power", async function () {
      await dao.updateParams(PRICE, MIN_STAKE_VOTE, MIN_STAKE_PROPOSAL, VOTING_PERIOD, 100n, LOCK_TIME);
      await expect(
        dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE))
      ).to.be.revertedWith("Zero voting power");
    });

    it("should vote against successfully", async function () {
      await dao.connect(bob).vote(1, false, Number(MIN_STAKE_VOTE));
      const proposals = await dao.getAllProposals();
      expect(proposals[0].votesAgainst).to.equal(Number(MIN_STAKE_VOTE) / Number(TOKENS_PER_VP));
    });

    it("should revert vote when proposal is finalized (NOT ACTIVE)", async function () {
      // Finalize the proposal first
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
      await ethers.provider.send("evm_mine");
      await dao.finalize(1);
      
      // Try to vote - should fail because status is not ACTIVE (covers line 260)
      await expect(
        dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE))
      ).to.be.revertedWith("Not active");
    });

    it("should revert vote when voting period ended", async function () {
      // Create new proposal
      await dao.connect(alice).createProposal("P2", "D2", Number(MIN_STAKE_PROPOSAL));
      const proposalId = await dao.proposalCount();
      
      // Wait for voting period to end but DON'T finalize
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
      await ethers.provider.send("evm_mine");
      
      // Try to vote - should fail because time expired (covers line 261)
      await expect(
        dao.connect(bob).vote(proposalId, true, Number(MIN_STAKE_VOTE))
      ).to.be.revertedWith("Not active");
    });
  });

  describe("Unstake vote", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
      await dao.setStakingAddress(await staking.getAddress());
      await dao.connect(alice).createProposal("P1", "D1", Number(MIN_STAKE_PROPOSAL));
      await dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE));
    });

    it("should revert unstakeVote if user did not vote", async function () {
      await expect(dao.connect(alice).unstakeVote(1))
        .to.be.revertedWith("User did not vote");
    });

    it("should unstake vote successfully (voted FOR)", async function () {
      await expect(dao.connect(bob).unstakeVote(1))
        .to.emit(staking, "UnstakedVote");
      
      const proposals = await dao.getAllProposals();
      expect(proposals[0].voters.find(v => v.voter === bob.address)).to.be.undefined;
    });

    it("should unstake vote successfully (voted AGAINST)", async function () {
      // Create new proposal and vote AGAINST
      await dao.connect(alice).createProposal("P2", "D2", Number(MIN_STAKE_PROPOSAL));
      await dao.connect(outsider).vote(2, false, Number(MIN_STAKE_VOTE));
      
      // Unstake the AGAINST vote - covers line 293
      await expect(dao.connect(outsider).unstakeVote(2))
        .to.emit(staking, "UnstakedVote");
    });

    it("should unstake vote in QUADRATIC mode", async function () {
      await dao.toggleVotingMode();
      await dao.connect(outsider).vote(1, true, 100);
      await dao.connect(outsider).unstakeVote(1);
    });
  });

  describe("Finalize proposal", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
      await dao.setStakingAddress(await staking.getAddress());
    });

    it("should revert finalize if voting period not ended", async function () {
      await dao.connect(alice).createProposal("P1", "D1", Number(MIN_STAKE_PROPOSAL));
      await expect(dao.finalize(1)).to.be.revertedWith("Voting period not ended");
    });

    it("should finalize as ACCEPTED", async function () {
      await dao.connect(alice).createProposal("P1", "D1", Number(MIN_STAKE_PROPOSAL));
      await dao.connect(bob).vote(1, true, Number(MIN_STAKE_VOTE));
      
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
      await ethers.provider.send("evm_mine");
      
      await expect(dao.finalize(1)).to.emit(dao, "ProposalFinalized");
      const accepted = await dao.getProposalsByStatus(1);
      expect(accepted.length).to.equal(1);
      expect(accepted[0].id).to.equal(1);
    });

    it("should finalize as REJECTED", async function () {
      await dao.connect(alice).createProposal("P2", "D2", Number(MIN_STAKE_PROPOSAL));
      
      // Get the proposal ID (should be 2 now)
      const proposalId = await dao.proposalCount();
      
      await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
      await ethers.provider.send("evm_mine");
      
      await dao.finalize(proposalId);
      const rejected = await dao.getProposalsByStatus(2);
      expect(rejected.length).to.equal(1);
    });
  });

  describe("View functions", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
      await dao.setStakingAddress(await staking.getAddress());
    });

    it("should return all proposals", async function () {
      await dao.connect(alice).createProposal("A", "a", Number(MIN_STAKE_PROPOSAL));
      await dao.connect(bob).createProposal("B", "b", Number(MIN_STAKE_PROPOSAL));
      
      const all = await dao.getAllProposals();
      expect(all.length).to.equal(2);
    });

    it("should validate proposal", async function () {
      await dao.connect(alice).createProposal("P", "D", Number(MIN_STAKE_PROPOSAL));
      expect(await dao.isValidProposal(1)).to.equal(true);
      expect(await dao.isValidProposal(0)).to.equal(false);
    });

    it("should return proposal creator", async function () {
      await dao.connect(alice).createProposal("P", "D", Number(MIN_STAKE_PROPOSAL));
      expect(await dao.proposalCreator(1)).to.equal(alice.address);
    });

    it("should return lock time", async function () {
      expect(await dao.lockTime()).to.equal(LOCK_TIME);
    });

    it("should get proposals by status", async function () {
      await dao.connect(alice).createProposal("A", "a", Number(MIN_STAKE_PROPOSAL));
      const active = await dao.getProposalsByStatus(0);
      expect(active.length).to.equal(1);
    });
  });

  describe("Unstake proposal", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
      await dao.setStakingAddress(await staking.getAddress());
      await dao.connect(alice).createProposal("P", "D", Number(MIN_STAKE_PROPOSAL));
    });

    it("should unstake proposal", async function () {
      await expect(dao.connect(alice).unstakeProposal(1))
        .to.emit(staking, "UnstakedProposal");
    });
  });

  describe("Toggle voting mode", function() {
    beforeEach(async function() {
      await dao.setPanicWallet(panicWallet.address);
    });

    it("should toggle voting mode", async function () {
      expect(Number(await dao.votingMode())).to.equal(0);
      await expect(dao.toggleVotingMode()).to.emit(dao, "VotingModeToggled");
      expect(Number(await dao.votingMode())).to.equal(1);
      await dao.toggleVotingMode();
      expect(Number(await dao.votingMode())).to.equal(0);
    });

    it("should revert toggleVotingMode if not owner", async function () {
      await expect(dao.connect(outsider).toggleVotingMode()).to.be.reverted;
    });
  });
});