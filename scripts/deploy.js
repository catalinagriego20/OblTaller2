const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function exportFrontend(addresses) {
const path = require("path");

  const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
  const ABI_DIR = path.join(FRONTEND_DIR, "abis");
  const CONFIG_FILE = path.join(FRONTEND_DIR, "dao-config.js");

  if (!fs.existsSync(FRONTEND_DIR)) {
    console.warn("⚠️  FRONTEND_DIR no existe, omitiendo exportación al front:", FRONTEND_DIR);
    return;
  }
  if (!fs.existsSync(ABI_DIR)) {
    fs.mkdirSync(ABI_DIR, { recursive: true });
  }

  const contractNames = [
    "DAOCore",
    "DAODelegation",
    "DAOToken",
    "DAOViews",
    "SimpleMultiSig",
    "Staking",
    "Token",
  ];

  for (const name of contractNames) {
    const artifact = await hre.artifacts.readArtifact(name);
    const abiPath = path.join(ABI_DIR, `${name}.json`);
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`✔ ABI exportada: ${abiPath}`);
  }

  const contractsConfig = {
    daoCore:       addresses.daoCore,
    daoDelegation: addresses.daoDelegation,
    daoToken:      addresses.daoToken,
    daoViews:      addresses.daoViews,
    staking:       addresses.staking,
    token:         addresses.token,
    multisigOwner: addresses.multisigOwner,
    multisigPanic: addresses.multisigPanic,
  };

  const configJs = `// AUTO-GENERADO por scripts/deploy.js — no editar a mano
export const CONTRACTS = ${JSON.stringify(contractsConfig, null, 2)};
`;
  fs.writeFileSync(CONFIG_FILE, configJs);
  console.log(`✔ Config de contratos exportada al front: ${CONFIG_FILE}`);
}

// ============================= DEPLOY ================================
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1) MULTISIG OWNER
  const SimpleMultiSig = await hre.ethers.getContractFactory("SimpleMultiSig");
  const owners = [deployer.address];
  const requiredConfirmations = 1;

  const multisigOwner = await SimpleMultiSig.deploy(owners, requiredConfirmations);
  await multisigOwner.waitForDeployment();
  console.log("✔ Multisig OWNER deployed at:", multisigOwner.target);

  // 2) MULTISIG PÁNICO (NO configuramos la DAO acá)
  const multisigPanic = await SimpleMultiSig.deploy(owners, requiredConfirmations);
  await multisigPanic.waitForDeployment();
  console.log("✔ Multisig PANIC deployed at:", multisigPanic.target);

  // 3) TOKEN BASE
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("✔ Token deployed at:", token.target);

  // 4) DAO CORE
  const DAOCore = await hre.ethers.getContractFactory("DAOCore");

  const priceWeiPerToken     = hre.ethers.parseEther("0.0001");
  const minStakeVote         = hre.ethers.parseUnits("50", 18);
  const minStakeProposal     = hre.ethers.parseUnits("100", 18);
  const votingPeriodSeconds  = 3 * 24 * 60 * 60;   // 3 días
  const tokensPerVotingPower = 10n;                // 10 tokens = 1 VP
  const lockTimeSeconds      = 2 * 24 * 60 * 60;   // 2 días

  const daoCore = await DAOCore.deploy(
    token.target,
    deployer.address, // temporal para conectar staking
    priceWeiPerToken,
    minStakeVote,
    minStakeProposal,
    votingPeriodSeconds,
    tokensPerVotingPower,
    lockTimeSeconds
  );
  await daoCore.waitForDeployment();
  console.log("✔ DAOCore deployed at:", daoCore.target);

  // 5) DAO DELEGATION
  const DAODelegation = await hre.ethers.getContractFactory("DAODelegation");
  const daoDelegation = await DAODelegation.deploy(daoCore.target);
  await daoDelegation.waitForDeployment();
  console.log("✔ DAODelegation deployed at:", daoDelegation.target);

  // 6) DAO TOKEN
  const DAOToken = await hre.ethers.getContractFactory("DAOToken");
  const daoToken = await DAOToken.deploy(daoCore.target);
  await daoToken.waitForDeployment();
  console.log("✔ DAOToken deployed at:", daoToken.target);

  // 7) DAO VIEWS
  const DAOViews = await hre.ethers.getContractFactory("DAOViews");
  const daoViews = await DAOViews.deploy(daoCore.target, daoDelegation.target);
  await daoViews.waitForDeployment();
  console.log("✔ DAOViews deployed at:", daoViews.target);

  // 8) TRANSFERIR OWNERSHIP DEL TOKEN AL DAO TOKEN CONTRACT
  const tx1 = await token.transferOwnership(daoToken.target);
  await tx1.wait();
  console.log("✔ Token ownership transferred to DAOToken");

  // 9) STAKING
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(token.target, daoCore.target);
  await staking.waitForDeployment();
  console.log("✔ Staking deployed at:", staking.target);

  // 10) DATA PARA MULTISIG OWNER
  console.log("\n⚙️  CONFIGURANDO DAO AUTOMÁTICAMENTE...");

  // Setear Staking
  const txSetStaking = await daoCore.setStakingAddress(staking.target);
  await txSetStaking.wait();
  console.log("✔ Staking vinculado al Core");

  // Setear Delegation
  const txSetDelegation = await daoCore.setDelegationContract(daoDelegation.target);
  await txSetDelegation.wait();
  console.log("✔ Delegation vinculado al Core");

  // Setear Token Contract
  const txSetDaoToken = await daoCore.setTokenContract(daoToken.target);
  await txSetDaoToken.wait();
  console.log("✔ DAOToken vinculado al Core");

  // 11) PASO FINAL: TRANSFERIR OWNERSHIP A LA MULTISIG
  console.log("\n🔐 TRANSFIRIENDO CONTROL A LA MULTISIG...");
  const txTransfer = await daoCore.changeOwner(multisigOwner.target);
  await txTransfer.wait();
  console.log("✔ Ownership transferido a Multisig Owner");

  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOY COMPLETO");
  console.log("Owner del DAO = multisigOwner");
  console.log("Multisig de pánico sugerida:", multisigPanic.target, "(se setea luego vía dApp con setPanicWallet)");
  console.log("=".repeat(70));

  console.log("\n📋 DIRECCIONES:");
  console.log("   Multisig OWNER: ", multisigOwner.target);
  console.log("   Multisig PANIC: ", multisigPanic.target);
  console.log("   Token:          ", token.target);
  console.log("   DAOCore:        ", daoCore.target);
  console.log("   DAODelegation:  ", daoDelegation.target);
  console.log("   DAOToken:       ", daoToken.target);
  console.log("   DAOViews:       ", daoViews.target);
  console.log("   Staking:        ", staking.target);
  console.log("   Deployer:       ", deployer.address);

  // 12) GUARDAR DIRECCIONES
  const addresses = {
    multisigOwner:   multisigOwner.target,
    multisigPanic:   multisigPanic.target,
    token:           token.target,
    daoCore:         daoCore.target,
    daoDelegation:   daoDelegation.target,
    daoToken:        daoToken.target,
    daoViews:        daoViews.target,
    staking:         staking.target,
    deployer:        deployer.address,
    network:         hre.network.name,
    timestamp:       new Date().toISOString(),
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${deploymentsDir}/${hre.network.name}-deployment.json`;
  fs.writeFileSync(filename, JSON.stringify(addresses, null, 2));
  console.log(`\n💾 Addresses saved to: ${filename}`);

  // 13) EXPORTAR ABI + CONFIG PARA EL FRONT (opcional)
  await exportFrontend(addresses).catch((e) => {
    console.warn("⚠️  No se pudo exportar al front:", e.message);
  });

  // 14) COMANDOS DE VERIFY
  console.log("\n" + "=".repeat(70));
  console.log("📝 COMANDOS PARA VERIFICAR");
  console.log("=".repeat(70));

  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${multisigOwner.target} '${JSON.stringify(owners)}' ${requiredConfirmations}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${multisigPanic.target} '${JSON.stringify(owners)}' ${requiredConfirmations}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${token.target} ${deployer.address}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoCore.target} ${token.target} ${multisigOwner.target} ${priceWeiPerToken} ${minStakeVote} ${minStakeProposal} ${votingPeriodSeconds} ${tokensPerVotingPower} ${lockTimeSeconds}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoDelegation.target} ${daoCore.target}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoToken.target} ${daoCore.target}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoViews.target} ${daoCore.target} ${daoDelegation.target}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${staking.target} ${token.target} ${daoCore.target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});