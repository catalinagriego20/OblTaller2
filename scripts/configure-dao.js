const hre = require("hardhat");
const fs = require("fs");

/**
 * Script para configurar el DAO después del deploy inicial
 * Ejecuta las transacciones necesarias desde el multisig
 * 
 * Uso: npx hardhat run scripts/configure-dao.js --network <network>
 */

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Configuring with:", signer.address);

  // Cargar direcciones del deployment
  const networkName = hre.network.name;
  const deploymentFile = `./deployments/${networkName}-deployment.json`;

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ Deployment file not found: ${deploymentFile}`);
    console.log("Please run the deploy script first.");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  console.log("\n📋 Loaded addresses from:", deploymentFile);

  // Conectar a los contratos
  const multisig = await hre.ethers.getContractAt("SimpleMultiSig", addresses.multisig);
  const daoCore = await hre.ethers.getContractAt("DAOCore", addresses.daoCore);
  const daoToken = await hre.ethers.getContractAt("DAOToken", addresses.daoToken);

  console.log("\n🔧 Starting DAO configuration...\n");

  // -----------------------------
  // OPCIÓN 1: Si el signer ES el multisig (solo 1 firma requerida)
  // -----------------------------
  const isMultisigOwner = await checkIfMultisigOwner(multisig, signer.address);
  
  if (isMultisigOwner) {
    console.log("✓ Signer is a multisig owner. Proceeding with direct configuration...\n");

    // 1. Configurar Staking
    console.log("1️⃣  Setting Staking address...");
    try {
      const tx1 = await daoCore.setStakingAddress(addresses.staking);
      await tx1.wait();
      console.log("   ✅ Staking configured");
    } catch (error) {
      console.log("   ⚠️  Already configured or error:", error.message);
    }

    // 2. Configurar Panic Wallet
    console.log("\n2️⃣  Setting Panic Wallet...");
    try {
      const tx2 = await daoCore.setPanicWallet(addresses.multisig);
      await tx2.wait();
      console.log("   ✅ Panic Wallet configured");
    } catch (error) {
      console.log("   ⚠️  Already configured or error:", error.message);
    }

    // 3. Vincular DAODelegation
    console.log("\n3️⃣  Linking DAODelegation...");
    try {
      const tx3 = await daoCore.setDelegationContract(addresses.daoDelegation);
      await tx3.wait();
      console.log("   ✅ DAODelegation linked");
    } catch (error) {
      console.log("   ⚠️  Already configured or error:", error.message);
    }

    // 4. Vincular DAOToken
    console.log("\n4️⃣  Linking DAOToken...");
    try {
      const tx4 = await daoCore.setTokenContract(addresses.daoToken);
      await tx4.wait();
      console.log("   ✅ DAOToken linked");
    } catch (error) {
      console.log("   ⚠️  Already configured or error:", error.message);
    }

    // 5. Mintear tokens iniciales (OPCIONAL)
    console.log("\n5️⃣  Minting initial tokens (OPTIONAL)...");
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      readline.question('Do you want to mint initial tokens? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      const amount = hre.ethers.parseUnits("1000000", 18); // 1M tokens
      try {
        const tx5 = await daoToken.mintTokens(amount);
        await tx5.wait();
        console.log(`   ✅ Minted ${hre.ethers.formatUnits(amount, 18)} tokens`);
      } catch (error) {
        console.log("   ❌ Error minting:", error.message);
      }
    } else {
      console.log("   ⏭️  Skipping token minting");
    }

    console.log("\n🎉 DAO configuration completed!");

  } else {
    // -----------------------------
    // OPCIÓN 2: Necesita transacciones multisig
    // -----------------------------
    console.log("⚠️  Signer is NOT a multisig owner or multiple signatures required.");
    console.log("You need to submit transactions through the multisig.\n");

    console.log("Use the following transaction data:\n");
    await printMultisigTransactions(daoCore, daoToken, addresses);
  }

  // Verificar configuración
  console.log("\n" + "=".repeat(70));
  console.log("📊 CURRENT DAO CONFIGURATION:");
  console.log("=".repeat(70));
  await verifyConfiguration(daoCore, addresses);
}

async function checkIfMultisigOwner(multisig, address) {
  try {
    const owners = await multisig.owners();
    return owners.map(o => o.toLowerCase()).includes(address.toLowerCase());
  } catch (error) {
    return false;
  }
}

async function printMultisigTransactions(daoCore, daoToken, addresses) {
  const initialTokenSupply = hre.ethers.parseUnits("1000000", 18);

  console.log("1️⃣  Set Staking Address:");
  console.log("   Target:", addresses.daoCore);
  console.log("   Data:", daoCore.interface.encodeFunctionData("setStakingAddress", [addresses.staking]));
  console.log("   Value: 0\n");

  console.log("2️⃣  Set Panic Wallet:");
  console.log("   Target:", addresses.daoCore);
  console.log("   Data:", daoCore.interface.encodeFunctionData("setPanicWallet", [addresses.multisig]));
  console.log("   Value: 0\n");

  console.log("3️⃣  Link DAODelegation:");
  console.log("   Target:", addresses.daoCore);
  console.log("   Data:", daoCore.interface.encodeFunctionData("setDelegationContract", [addresses.daoDelegation]));
  console.log("   Value: 0\n");

  console.log("4️⃣  Link DAOToken:");
  console.log("   Target:", addresses.daoCore);
  console.log("   Data:", daoCore.interface.encodeFunctionData("setTokenContract", [addresses.daoToken]));
  console.log("   Value: 0\n");

  console.log("5️⃣  Mint Initial Tokens (OPTIONAL):");
  console.log("   Target:", addresses.daoToken);
  console.log("   Data:", daoToken.interface.encodeFunctionData("mintTokens", [initialTokenSupply]));
  console.log("   Value: 0\n");
}

async function verifyConfiguration(daoCore, addresses) {
  try {
    const staking = await daoCore.staking();
    console.log("Staking:        ", staking === addresses.staking ? "✅" : "❌", staking);
  } catch (e) {
    console.log("Staking:         ❌ Not configured");
  }

  try {
    const panicWallet = await daoCore.panicWallet();
    console.log("Panic Wallet:   ", panicWallet === addresses.multisig ? "✅" : "❌", panicWallet);
  } catch (e) {
    console.log("Panic Wallet:    ❌ Not configured");
  }

  try {
    const delegation = await daoCore.delegation();
    console.log("Delegation:     ", delegation === addresses.daoDelegation ? "✅" : "❌", delegation);
  } catch (e) {
    console.log("Delegation:      ❌ Not configured");
  }

  try {
    const tokenContract = await daoCore.daoToken();
    console.log("Token Contract: ", tokenContract === addresses.daoToken ? "✅" : "❌", tokenContract);
  } catch (e) {
    console.log("Token Contract:  ❌ Not configured");
  }

  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});