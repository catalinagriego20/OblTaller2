const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // -----------------------------
  // 1) DEPLOY MULTISIG (OWNER DE LA DAO)
  // -----------------------------
  const SimpleMultiSig = await hre.ethers.getContractFactory("SimpleMultiSig");
  const owners = [deployer.address]; // agregar más addresses si querés multisig real
  const requiredConfirmations = 1;
  const multisig = await SimpleMultiSig.deploy(owners, requiredConfirmations);
  await multisig.waitForDeployment();
  console.log("✔ Multisig deployed at:", multisig.target);

  // -----------------------------
  // 2) DEPLOY TOKEN
  // -----------------------------
  const DAOToken = await hre.ethers.getContractFactory("DAOToken");
  const token = await DAOToken.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("✔ Token deployed at:", token.target);

  // -----------------------------
  // 3) DEPLOY DAO
  // -----------------------------
  const DAO = await hre.ethers.getContractFactory("DAO");

  const priceWeiPerToken = hre.ethers.parseEther("0.0001"); // 0.0001 ETH por token
  const minStakeVote = hre.ethers.parseUnits("50", 18);
  const minStakeProposal = hre.ethers.parseUnits("100", 18);
  const votingPeriodSeconds = 3 * 24 * 60 * 60; // 3 días
  const tokensPerVotingPower = 10n; // 10 tokens = 1 power
  const lockTimeSeconds = 2 * 24 * 60 * 60; // 2 días

  const dao = await DAO.deploy(
    token.target,    // _token
    multisig.target, // _multisigOwner
    priceWeiPerToken,
    minStakeVote,
    minStakeProposal,
    votingPeriodSeconds,
    tokensPerVotingPower,
    lockTimeSeconds
  );
  await dao.waitForDeployment();
  console.log("✔ DAO deployed at:", dao.target);

  // -----------------------------
  // 4) TRANSFERIR OWNERSHIP DEL TOKEN A LA DAO
  // -----------------------------
  const tx1 = await token.transferOwnership(dao.target);
  await tx1.wait();
  console.log("✔ Token ownership transferred to DAO");

  // -----------------------------
  // 5) DEPLOY STAKING (vinculado a DAO en constructor)
  // -----------------------------
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(token.target, dao.target);
  await staking.waitForDeployment();
  console.log("✔ Staking deployed at:", staking.target);

  // -----------------------------
  // 6) CONFIGURACIÓN DEL DAO QUE DEBE HACER EL MULTISIG
  // -----------------------------
  // 6a) Registrar Staking
  const dataSetStaking = dao.interface.encodeFunctionData(
    "setStakingAddress",
    [staking.target]
  );

  // 6b) Configurar Panic Wallet (ej: misma multisig)
  const dataSetPanic = dao.interface.encodeFunctionData(
    "setPanicWallet",
    [multisig.target]
  );

  console.log("\n📌 SIGUIENTES TRANSACCIONES DEBEN EJECUTARSE DESDE EL MULTISIG:");
  console.log("- Registrar Staking:");
  console.log("  target:", dao.target);
  console.log("  data:", dataSetStaking);
  console.log("- Configurar Panic Wallet:");
  console.log("  target:", dao.target);
  console.log("  data:", dataSetPanic);

  console.log("\n🎉 DEPLOY COMPLETO. Owner del DAO = multisig, funciones sensibles requieren firma multisig.");
  console.log("DAO:", dao.target);
  console.log("Token:", token.target);
  console.log("Staking:", staking.target);
  console.log("Multisig:", multisig.target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});