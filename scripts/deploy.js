const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // -----------------------------
  // 1) DEPLOY MULTISIG (OWNER DE LA DAO)
  // -----------------------------
  const SimpleMultiSig = await hre.ethers.getContractFactory("SimpleMultiSig");
  const owners = [deployer.address]; // agregar más addresses
  const requiredConfirmations = 1;
  const multisig = await SimpleMultiSig.deploy(owners, requiredConfirmations);
  await multisig.waitForDeployment();
  console.log("✔ Multisig deployed at:", multisig.target);

  // -----------------------------
  // 2) DEPLOY TOKEN
  // -----------------------------
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("✔ Token deployed at:", token.target);

  // -----------------------------
  // 3) DEPLOY DAO CORE
  // -----------------------------
  const DAOCore = await hre.ethers.getContractFactory("DAOCore");

  const priceWeiPerToken = hre.ethers.parseEther("0.0001"); // 0.0001 ETH por token
  const minStakeVote = hre.ethers.parseUnits("50", 18);
  const minStakeProposal = hre.ethers.parseUnits("100", 18);
  const votingPeriodSeconds = 3 * 24 * 60 * 60; // 3 días
  const tokensPerVotingPower = 10n; // 10 tokens = 1 power
  const lockTimeSeconds = 2 * 24 * 60 * 60; // 2 días

  const daoCore = await DAOCore.deploy(
    token.target,    // _token
    multisig.target, // _multisigOwner
    priceWeiPerToken,
    minStakeVote,
    minStakeProposal,
    votingPeriodSeconds,
    tokensPerVotingPower,
    lockTimeSeconds
  );
  await daoCore.waitForDeployment();
  console.log("✔ DAOCore deployed at:", daoCore.target);

  // -----------------------------
  // 4) DEPLOY DAO DELEGATION
  // -----------------------------
  const DAODelegation = await hre.ethers.getContractFactory("DAODelegation");
  const daoDelegation = await DAODelegation.deploy(daoCore.target);
  await daoDelegation.waitForDeployment();
  console.log("✔ DAODelegation deployed at:", daoDelegation.target);

  // -----------------------------
  // 5) DEPLOY DAO TOKEN
  // -----------------------------
  const DAOToken = await hre.ethers.getContractFactory("DAOToken");
  const daoToken = await DAOToken.deploy(daoCore.target);
  await daoToken.waitForDeployment();
  console.log("✔ DAOToken deployed at:", daoToken.target);

  // -----------------------------
  // 6) DEPLOY DAO VIEWS
  // -----------------------------
  const DAOViews = await hre.ethers.getContractFactory("DAOViews");
  const daoViews = await DAOViews.deploy(daoCore.target, daoDelegation.target);
  await daoViews.waitForDeployment();
  console.log("✔ DAOViews deployed at:", daoViews.target);

  // -----------------------------
  // 7) TRANSFERIR OWNERSHIP DEL TOKEN AL DAO TOKEN CONTRACT
  // -----------------------------
  const tx1 = await token.transferOwnership(daoToken.target);
  await tx1.wait();
  console.log("✔ Token ownership transferred to DAOToken");

  // -----------------------------
  // 8) DEPLOY STAKING (vinculado a DAOCore en constructor)
  // -----------------------------
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(token.target, daoCore.target);
  await staking.waitForDeployment();
  console.log("✔ Staking deployed at:", staking.target);

  // -----------------------------
  // 9) CONFIGURACIÓN DEL DAO CORE
  // -----------------------------
  // Preparar las llamadas que deben hacerse desde el multisig
  
  // 9a) Registrar Staking
  const dataSetStaking = daoCore.interface.encodeFunctionData(
    "setStakingAddress",
    [staking.target]
  );

  // 9b) Configurar Panic Wallet
  const dataSetPanic = daoCore.interface.encodeFunctionData(
    "setPanicWallet",
    [multisig.target]
  );

  // 9c) Vincular DAODelegation
  const dataSetDelegation = daoCore.interface.encodeFunctionData(
    "setDelegationContract",
    [daoDelegation.target]
  );

  // 9d) Vincular DAOToken
  const dataSetTokenContract = daoCore.interface.encodeFunctionData(
    "setTokenContract",
    [daoToken.target]
  );

  // -----------------------------
  // 10) TRANSFERIR TOKENS INICIALES AL DAO TOKEN CONTRACT (OPCIONAL)
  // -----------------------------
  // Si quieres que DAOToken tenga tokens disponibles para vender
  const initialTokenSupply = hre.ethers.parseUnits("1000000", 18); // 1M tokens
  const dataMintTokens = daoToken.interface.encodeFunctionData(
    "mintTokens",
    [initialTokenSupply]
  );

  console.log("\n" + "=".repeat(70));
  console.log("📌 SIGUIENTES TRANSACCIONES DEBEN EJECUTARSE DESDE EL MULTISIG:");
  console.log("=".repeat(70));
  
  console.log("\n1️⃣  Registrar Staking en DAOCore:");
  console.log("   Target:", daoCore.target);
  console.log("   Data:", dataSetStaking);
  console.log("   Value: 0");
  
  console.log("\n2️⃣  Configurar Panic Wallet en DAOCore:");
  console.log("   Target:", daoCore.target);
  console.log("   Data:", dataSetPanic);
  console.log("   Value: 0");
  
  console.log("\n3️⃣  Vincular DAODelegation en DAOCore:");
  console.log("   Target:", daoCore.target);
  console.log("   Data:", dataSetDelegation);
  console.log("   Value: 0");
  
  console.log("\n4️⃣  Vincular DAOToken en DAOCore:");
  console.log("   Target:", daoCore.target);
  console.log("   Data:", dataSetTokenContract);
  console.log("   Value: 0");
  
  console.log("\n5️⃣  (OPCIONAL) Mintear tokens iniciales en DAOToken:");
  console.log("   Target:", daoToken.target);
  console.log("   Data:", dataMintTokens);
  console.log("   Value: 0");
  console.log("   Nota: Esto creará", hre.ethers.formatUnits(initialTokenSupply, 18), "tokens en DAOToken para vender");

  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOY COMPLETO");
  console.log("=".repeat(70));
  console.log("Owner del DAO = multisig");
  console.log("Funciones sensibles requieren firma multisig");
  console.log("\n📋 DIRECCIONES DE CONTRATOS:");
  console.log("   Multisig:      ", multisig.target);
  console.log("   Token:         ", token.target);
  console.log("   DAOCore:       ", daoCore.target);
  console.log("   DAODelegation: ", daoDelegation.target);
  console.log("   DAOToken:      ", daoToken.target);
  console.log("   DAOViews:      ", daoViews.target);
  console.log("   Staking:       ", staking.target);
  console.log("=".repeat(70));

  // -----------------------------
  // 11) GUARDAR DIRECCIONES EN ARCHIVO JSON
  // -----------------------------
  const fs = require('fs');
  const addresses = {
    multisig: multisig.target,
    token: token.target,
    daoCore: daoCore.target,
    daoDelegation: daoDelegation.target,
    daoToken: daoToken.target,
    daoViews: daoViews.target,
    staking: staking.target,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };

  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${deploymentsDir}/${hre.network.name}-deployment.json`;
  fs.writeFileSync(filename, JSON.stringify(addresses, null, 2));
  console.log(`\n💾 Addresses saved to: ${filename}`);

  // -----------------------------
  // 12) INSTRUCCIONES DE VERIFICACIÓN
  // -----------------------------
  console.log("\n" + "=".repeat(70));
  console.log("📝 COMANDOS PARA VERIFICAR EN ETHERSCAN:");
  console.log("=".repeat(70));
  
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${multisig.target} '${JSON.stringify(owners)}' ${requiredConfirmations}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${token.target} ${deployer.address}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoCore.target} ${token.target} ${multisig.target} ${priceWeiPerToken} ${minStakeVote} ${minStakeProposal} ${votingPeriodSeconds} ${tokensPerVotingPower} ${lockTimeSeconds}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoDelegation.target} ${daoCore.target}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoToken.target} ${daoCore.target}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${daoViews.target} ${daoCore.target} ${daoDelegation.target}`);
  console.log(`\nnpx hardhat verify --network ${hre.network.name} ${staking.target} ${token.target} ${daoCore.target}`);
  
  console.log("\n" + "=".repeat(70));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});