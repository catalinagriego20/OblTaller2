const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Coverage Final - Edge Cases & Branches", function () {
  let daoCore, token, staking, multisig, reverter;
  let owner, alice, bob, charlie, panicWallet;

  const PRICE = 1n;
  const MIN_STAKE_VOTE = 10n;
  const MIN_STAKE_PROPOSAL = 20n;
  const VOTING_PERIOD = 60 * 60 * 24;
  const TOKENS_PER_VP = 1n;
  const LOCK_TIME = 60 * 60;

  beforeEach(async function () {
    [owner, alice, bob, charlie, panicWallet] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const MultiSig = await ethers.getContractFactory("SimpleMultiSig");
    multisig = await MultiSig.deploy([owner.address, alice.address], 2);
    await multisig.waitForDeployment();

    const Reverter = await ethers.getContractFactory("Reverter");
    reverter = await Reverter.deploy();
    await reverter.waitForDeployment();

    const Staking = await ethers.getContractFactory("MockStaking");
    staking = await Staking.deploy();
    await staking.waitForDeployment();

    const DAOCore = await ethers.getContractFactory("DAOCore");
    daoCore = await DAOCore.deploy(
      await token.getAddress(),
      owner.address,
      PRICE,
      MIN_STAKE_VOTE,
      MIN_STAKE_PROPOSAL,
      VOTING_PERIOD,
      TOKENS_PER_VP,
      LOCK_TIME
    );
    await daoCore.waitForDeployment();

    await daoCore.setStakingAddress(await staking.getAddress());
    await daoCore.setPanicWallet(panicWallet.address);

    await token.mint(alice.address, 1000);
    await token.mint(bob.address, 1000);
    await token.mint(charlie.address, 1000);
  });

  describe("Token.sol - Branch Coverage", function () {
    it("Debe revertir si un NO-owner intenta mintear (Branch: onlyOwner)", async function () {
      await expect(
        token.connect(alice).mint(alice.address, 100)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("SimpleMultiSig.sol - Líneas 139,140 (ExecutionFailed)", function () {
    it("Debe revertir con ExecutionFailed si la llamada externa falla", async function () {
      const callData = reverter.interface.encodeFunctionData("alwaysReverts");

      await multisig.submitTransaction(await reverter.getAddress(), 0, callData);

      await multisig.connect(owner).confirmTransaction(0);
      await multisig.connect(alice).confirmTransaction(0);

      await expect(
        multisig.executeTransaction(0)
      ).to.be.revertedWithCustomError(multisig, "ExecutionFailed");
    });
  });

  describe("DAOCore.sol - Logic Branches", function () {
    beforeEach(async function () {
      await daoCore.connect(alice).createProposal("Prop", "Desc", MIN_STAKE_PROPOSAL);
    });

    it("Debe manejar 'unstakeVote' cuando el voto fue EN CONTRA (Branch: else)", async function () {
      await daoCore.connect(bob).vote(1, false, MIN_STAKE_VOTE);

      const pBefore = await daoCore.getProposal(1);
      expect(pBefore.votesAgainst).to.be.gt(0);

      await daoCore.connect(bob).unstakeVote(1);

      const pAfter = await daoCore.getProposal(1);
      expect(pAfter.votesAgainst).to.equal(0);
    });

    it("Debe manejar 'finalize' cuando la propuesta es RECHAZADA (Branch: else)", async function () {
        await daoCore.connect(alice).createProposal("FailProp", "Desc", MIN_STAKE_PROPOSAL);

        await daoCore.connect(bob).vote(2, false, MIN_STAKE_VOTE);

        await ethers.provider.send("evm_increaseTime", [VOTING_PERIOD + 10]);
        await ethers.provider.send("evm_mine");

        await daoCore.finalize(2);
        
        const p = await daoCore.getProposal(2);
        expect(p.status).to.equal(2);
    });

    it("Debe manejar la eliminación de votantes en medio del array (Branch: loop swap)", async function () {
      await daoCore.connect(alice).vote(1, true, MIN_STAKE_VOTE);
      await daoCore.connect(bob).vote(1, true, MIN_STAKE_VOTE);
      await daoCore.connect(charlie).vote(1, true, MIN_STAKE_VOTE);

      await daoCore.connect(bob).unstakeVote(1);

      const p = await daoCore.getProposal(1);
      const voters = p.voters;
      
      expect(voters.length).to.equal(2);
      expect(voters).to.include(alice.address);
      expect(voters).to.include(charlie.address);
      expect(voters).to.not.include(bob.address);
    });
  });
});