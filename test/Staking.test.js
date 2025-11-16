const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", function () {
  let owner, daoMock, user, creator, otherUser;
  let token, staking;

  beforeEach(async () => {
    [owner, daoMock, user, creator, otherUser] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    token = await MockToken.deploy();
    await token.waitForDeployment();

    const MockDAO = await ethers.getContractFactory("MockDAO");
    const mockDao = await MockDAO.deploy();
    await mockDao.waitForDeployment();

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await token.getAddress(), await mockDao.getAddress());
    await staking.waitForDeployment();

    await token.mint(user.address, 1000n);
    await token.mint(creator.address, 1000n);

    await token.connect(user).approve(await staking.getAddress(), 1000n);
    await token.connect(creator).approve(await staking.getAddress(), 1000n);
  });

  it("stakeVote: should stake correctly", async () => {
    await ethers.provider.send("hardhat_impersonateAccount", [await (await ethers.getContractFactory("MockDAO")).deploy().then(c=>c.getAddress())]);
    // call staking.stakeVote through the DAO (staking requires msg.sender == dao)
    const MockDAO = await ethers.getContractFactory("MockDAO");
    const mockDao = await MockDAO.deploy();
    await mockDao.waitForDeployment();
    await staking.connect(mockDao).stakeVote(user.address, 100, 1);
    expect(await staking.voteStakeOf(user.address, 1)).to.equal(100);
  });

  it("stakeVote: should revert if proposal invalid", async () => {
    const MockDAO = await ethers.getContractFactory("MockDAO");
    const mockDao = await MockDAO.deploy();
    await mockDao.waitForDeployment();
    await expect(staking.stakeVote(user.address, 100, 1)).to.be.revertedWith("Staking: not DAO");
  });

  it("unstakeVote: should unstake correctly after unlock time", async () => {
    const MockDAO = await ethers.getContractFactory("MockDAO");
    const mockDao = await MockDAO.deploy();
    await mockDao.waitForDeployment();
    await staking.connect(mockDao).stakeVote(user.address, 100, 1);
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine");
    await staking.connect(mockDao).unstakeVote(user.address, 1);
    expect(await staking.voteStakeOf(user.address, 1)).to.equal(0);
  });

  it("stakeProposal: should allow creator to stake and reject non-creator", async () => {
    const MockDAO = await ethers.getContractFactory("MockDAO");
    const mockDao = await MockDAO.deploy();
    await mockDao.waitForDeployment();
    await expect(staking.stakeProposal(user.address, 200, 1)).to.be.revertedWith("Staking: not DAO");
  });

  it("unstakeProposal: should unstake correctly", async () => {
    const MockDAO = await ethers.getContractFactory("MockDAO");
    const mockDao = await MockDAO.deploy();
    await mockDao.waitForDeployment();
    await expect(staking.unstakeProposal(user.address, 1)).to.be.revertedWith("Staking: not DAO");
  });

  it("onlyDAO modifier blocks non-dao", async () => {
    await expect(staking.stakeVote(user.address, 10, 1)).to.be.revertedWith("Staking: not DAO");
  });
});