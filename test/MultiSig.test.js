const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleMultiSig", function () {

  let owner1, owner2, owner3, other;
  let multiSig;

  beforeEach(async () => {
    [owner1, owner2, owner3, other] = await ethers.getSigners();

    const MultiSig = await ethers.getContractFactory("SimpleMultiSig");

    multiSig = await MultiSig.deploy(
      [owner1.address, owner2.address, owner3.address],
      2 // required confirmations
    );
  });

  it("should submit a transaction", async () => {
    const tx = await multiSig.connect(owner1).submitTransaction(
      other.address,
      0,
      "0x"
    );

    await tx.wait();

    expect(await multiSig.transactionCount()).to.equal(1);
  });

  it("should confirm a transaction", async () => {
    await multiSig.connect(owner1).submitTransaction(other.address, 0, "0x");

    await expect(
      multiSig.connect(owner2).confirmTransaction(0)
    ).to.emit(multiSig, "TransactionConfirmed");
  });

  it("should execute if enough confirmations", async () => {
    // 1) submit
    await multiSig.connect(owner1).submitTransaction(other.address, 0, "0x");

    // 2) confirmations
    await multiSig.connect(owner1).confirmTransaction(0);
    await multiSig.connect(owner2).confirmTransaction(0);

    // 3) execute
    await expect(
      multiSig.connect(owner1).executeTransaction(0)
    ).to.emit(multiSig, "TransactionExecuted");
  });

  it("should fail execution if not enough confirmations", async () => {
    await multiSig.connect(owner1).submitTransaction(other.address, 0, "0x");

    await multiSig.connect(owner1).confirmTransaction(0);

    await expect(
      multiSig.connect(owner1).executeTransaction(0)
    ).to.be.revertedWithCustomError(multisig, "NotEnoughConfirmations");
  });

});