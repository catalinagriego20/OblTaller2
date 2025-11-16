const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO Full Coverage", () => {
    let DAO, dao;
    let Token, token;
    let Staking, staking;
    let owner, multisig, panicWallet, addr1, addr2, outsider;

    beforeEach(async () => {
        [owner, multisig, panicWallet, addr1, addr2, outsider] = await ethers.getSigners();

        Token = await ethers.getContractFactory("DAOToken");
        token = await Token.deploy(owner.address);
        await token.waitForDeployment();

        Staking = await ethers.getContractFactory("MockStaking");
        staking = await Staking.deploy();
        await staking.waitForDeployment();

        DAO = await ethers.getContractFactory("DAO");
        dao = await DAO.deploy(
            token.target,
            multisig.address,
            100,
            10,
            20,
            60,
            10,
            30
        );
        await dao.waitForDeployment();

        await dao.connect(multisig).setPanicWallet(panicWallet.address);
        await token.connect(owner).mint(dao.target, ethers.parseUnits("1000000", 18));
        await dao.setStakingAddress(staking.target);
    });

    it("constructor configs OK", async () => {
        expect(await dao.priceWeiPerToken()).to.equal(100);
        expect(await dao.minStakeForVote()).to.equal(10);
        expect(await dao.minStakeForProposal()).to.equal(20);
    });

    it("owner puede mintear tokens", async () => {
        await dao.connect(multisig).mintTokens(1000);
    });

    it("mintTokens falla si panicWallet no configurada (coverage require)", async () => {
        let dao2 = await DAO.deploy(
            token.target,
            multisig.address,
            100,
            10,
            20,
            60,
            10,
            30
        );
        await expect(dao2.connect(multisig).mintTokens(1000))
            .to.be.revertedWith("Panic wallet not set");
    });

    it("updateParams OK", async () => {
        await dao.connect(multisig).updateParams(200, 11, 22, 61, 9, 31);
        expect(await dao.priceWeiPerToken()).to.equal(200);
    });

    it("changeOwner OK", async () => {
        await dao.connect(multisig).changeOwner(addr1.address);
        expect(await dao.owner()).to.equal(addr1.address);
    });

    it("setPanicWallet OK", async () => {
        await dao.connect(multisig).setPanicWallet(addr1.address);
        expect(await dao.panicWallet()).to.equal(addr1.address);
    });

    it("panic / tranquility OK", async () => {
        await dao.connect(panicWallet).panic();
        expect(await dao.isPanicked()).to.equal(true);

        await dao.connect(panicWallet).tranquility();
        expect(await dao.isPanicked()).to.equal(false);
    });

    it("panic fail si caller no es panic wallet", async () => {
        await expect(dao.connect(addr1).panic())
            .to.be.revertedWith("Only panic wallet can trigger panic");
    });

    it("buyTokens ok", async () => {
        await dao.connect(addr1).buyTokens({ value: 100 });
        expect(await token.balanceOf(addr1.address)).to.be.gt(0);
    });

    it("fail buyTokens sin tokens suficientes", async () => {
        const smallDao = await DAO.deploy(
            token.target,
            multisig.address,
            100,
            10,
            20,
            60,
            10,
            30
        );
        await smallDao.connect(multisig).setPanicWallet(panicWallet.address);
        await smallDao.setStakingAddress(staking.target);

        await expect(
            smallDao.connect(addr1).buyTokens({ value: 100 })
        ).to.be.revertedWith("Not enough tokens in DAO");
    });

    it("createProposal OK", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        expect((await dao.getAllProposals()).length).to.equal(1);
    });

    it("createProposal falla si stake insuficiente", async () => {
        await expect(
            dao.connect(addr1).createProposal("A", "B", 1)
        ).to.be.revertedWith("Insufficient proposal stake");
    });

    it("vote linear ok", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await dao.connect(addr1).vote(1, true, 20);

        const list = await dao.getAllProposals();
        expect(list[0].votesFor).to.equal(2);
    });

    it("vote quadratic ok", async () => {
        await dao.connect(multisig).toggleVotingMode();
        await dao.connect(addr1).createProposal("A", "B", 20);
        await dao.connect(addr1).vote(1, true, 20);

        const list = await dao.getAllProposals();
        expect(list[0].votesFor).to.equal(1);
    });

    it("vote falla si stake insuficiente", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await expect(
            dao.connect(addr1).vote(1, true, 1)
        ).to.be.revertedWith("Insufficient voting stake");
    });

    it("unstakeVote ok", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await dao.connect(addr1).vote(1, true, 20);

        await dao.connect(addr1).unstakeVote(1);
    });

    it("unstakeVote falla si usuario no votó", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await expect(
            dao.connect(addr1).unstakeVote(1)
        ).to.be.revertedWith("User did not vote");
    });

    it("unstakeProposal ok", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await dao.connect(addr1).unstakeProposal(1);
    });

    it("finalize accepted", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await dao.connect(addr1).vote(1, true, 20);

        await ethers.provider.send("evm_increaseTime", [1000]);
        await ethers.provider.send("evm_mine");

        await dao.finalize(1);
        const p = (await dao.getAllProposals())[0];
        expect(p.status).to.equal(1);
    });

    it("finalize rejected", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);

        await ethers.provider.send("evm_increaseTime", [1000]);
        await ethers.provider.send("evm_mine");

        await dao.finalize(1);
        const p = (await dao.getAllProposals())[0];
        expect(p.status).to.equal(2);
    });

    it("finalize falla si no terminó periodo", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        await expect(dao.finalize(1))
            .to.be.revertedWith("Voting period not ended");
    });

    it("getProposalsByStatus OK", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);

        let list = await dao.getProposalsByStatus(0);
        expect(list.length).to.equal(1);
    });

    it("isValidProposal OK", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        expect(await dao.isValidProposal(1)).to.equal(true);
        expect(await dao.isValidProposal(99)).to.equal(false);
    });

    it("proposalCreator OK", async () => {
        await dao.connect(addr1).createProposal("A", "B", 20);
        expect(await dao.proposalCreator(1)).to.equal(addr1.address);
    });
});