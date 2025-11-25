import { CONTRACTS } from './dao-config.js';

let provider, signer;
let daoCoreContract, daoDelegationContract, daoTokenContract, daoViewsContract;
let currentAccount;
let contractTokenDecimals = 0;

// ABIs cargados dinámicamente
let DAOCoreABI, DAODelegationABI, DAOTokenABI, DAOViewsABI, SimpleMultiSigABI;

const q = id => document.getElementById(id);
const fmtAddr = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "-";
const alertErr = e => {
  console.error(e);

  const reason =
    e.reason ||                               
    e.shortMessage ||                        
    e.info?.error?.message ||                 
    e.data?.message ||                        
    e.message;                             

  alert("Error: " + reason.replace("execution reverted: ", ""));
};

const setOwnerUIVisible = visible => {
  const ids = [
    "btnMint","paramPrice","paramMinVote","paramMinProp","paramVotingPeriod",
    "paramTokensPerVP","paramLockTime","btnUpdateParams","newOwnerAddr","btnTransferOwner",
    "panicWalletAddr","btnSetPanicWallet","btnToggleVotingMode"
  ];
  ids.forEach(id => {
    const el = q(id);
    if (!el) return;
    el.disabled = !visible;
    if (!visible) el.classList.add("opacity-50");
    else el.classList.remove("opacity-50");
  });
};

function parseTokenAmountToBigInt(amountStr, decimals) {
  const parts = amountStr.split(".");
  const whole = parts[0] || "0";
  const frac = parts[1] || "";
  const fracAdj = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + fracAdj);
}

function safeBigIntFromInput(v) {
  if (!v) return 0n;
  if (v.includes(".")) return BigInt(Math.floor(parseFloat(v)));
  return BigInt(v);
}

// Función para cargar todos los ABIs
async function loadABIs() {
  try {
    console.log("Cargando ABIs...");
    const [core, delegation, token, views, multisig] = await Promise.all([
      fetch('./abis/DAOCore.json').then(r => r.json()),
      fetch('./abis/DAODelegation.json').then(r => r.json()),
      fetch('./abis/DAOToken.json').then(r => r.json()),
      fetch('./abis/DAOViews.json').then(r => r.json()),
      fetch('./abis/SimpleMultiSig.json').then(r => r.json())
    ]);
    
    DAOCoreABI = core;
    DAODelegationABI = delegation;
    DAOTokenABI = token;
    DAOViewsABI = views;
    SimpleMultiSigABI = multisig;
    
    console.log("✅ ABIs cargados correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error cargando ABIs:", error);
    alert("Error al cargar los ABIs. Verificá que los archivos existan en ./abis/");
    return false;
  }
}

async function initDAO() {
  if (!daoCoreContract || !daoViewsContract) return;

  try {
    let multisigAddr = null;
    try {
      multisigAddr = await daoCoreContract.owner();
    } catch (e) {
      console.warn("No owner() available?", e);
    }

    let isOwner = false;

    if (multisigAddr && currentAccount) {
      try {
        const multisig = new ethers.Contract(
          multisigAddr,
          SimpleMultiSigABI,
          signer
        );

        const owners = await multisig.owners();
        isOwner = owners.some(
          o => o.toLowerCase() === currentAccount.toLowerCase()
        );

        console.log("Owners multisig:", owners);
      } catch (err) {
        console.warn("No se pudieron leer owners() del multisig", err);
      }
    }

    setOwnerUIVisible(isOwner);
    if (isOwner)
      q("ownerMsg").textContent = `Eres owner del multisig (${fmtAddr(currentAccount)})`;
    else
      q("ownerMsg").textContent = `No sos owner. Algunas acciones están deshabilitadas.`;

    let panicMsg = "";
    try {
      const pw = await daoCoreContract.panicWallet();
      panicMsg += pw && pw !== ethers.ZeroAddress
        ? `Panic wallet: ${fmtAddr(pw)} `
        : `Panic wallet no configurada `;
    } catch {}

    try {
      const pan = await daoCoreContract.isPanicked();
      if (pan) {
        panicMsg += " - DAO en modo PÁNICO";
        document.querySelectorAll("button").forEach(b => b.disabled = true);
        q("btnRestoreNormal").disabled = false;
      } else {
        document.querySelectorAll("button").forEach(b => b.disabled = false);
        setOwnerUIVisible(isOwner);
      }
    } catch {}

    if (q("panicMsg")) q("panicMsg").textContent = panicMsg;

    await loadProposals();
    await updateVotingModeUI();

  } catch (e) {
    console.error("initDAO error:", e);
  }
}

async function loadProposals() {
  try {
    const proposals = await daoViewsContract.getAllProposals();

    const list = q("proposalsList");
    if (!list) return;
    list.innerHTML = "";

    for (const [idx, p] of proposals.entries()) {
      const id = p.id ?? idx + 1;
      const title = p.title ?? "Sin título";
      const description = p.description ?? "";
      const votesFor = p.votesFor?.toString() ?? "0";
      const votesAgainst = p.votesAgainst?.toString() ?? "0";
      const status = Number(p.status);
      const statusLabel = ["Activa", "Aprobada", "Rechazada"][status] || status;

      let delegationBadge = "";
      if (currentAccount && daoViewsContract) {
        try {
          const [delegate, amount, active] = await daoViewsContract.getDelegationInfo(
            id,
            currentAccount
          );
          if (active && delegate !== ethers.ZeroAddress) {
            delegationBadge = `<span class="delegation-badge">🤝 Delegado a ${fmtAddr(delegate)}</span>`;
          }
        } catch (e) {
          console.log("No se pudo verificar delegación:", e);
        }
      }

      const el = document.createElement("div");
      el.className = "border p-3 rounded mb-3";
      el.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="mb-1"><b>#${id}</b> - ${title} ${delegationBadge}</h5>
            <small class="text-muted">${description}</small>
          </div>
          <span class="badge bg-${status === 0 ? 'primary' : status === 1 ? 'success' : 'danger'}">
            ${statusLabel}
          </span>
        </div>
        <div class="mt-3">
          <span class="me-3">🟩 A favor: <strong>${votesFor}</strong></span>
          <span>🟥 En contra: <strong>${votesAgainst}</strong></span>
        </div>
        <div class="mt-3 d-flex gap-2">
          <button class="btn btn-sm btn-success" onclick="window.vote(${id}, true)">
            ✅ Votar a favor
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.vote(${id}, false)">
            ❌ Votar en contra
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.finalizeProposal(${id})">
            🏁 Finalizar
          </button>
          <button class="btn btn-sm btn-info" onclick="window.showDelegateModal(${id})">
            🤝 Delegar
          </button>
        </div>
      `;
      list.appendChild(el);
    }

  } catch (e) {
    console.error("loadProposals error", e);
  }
}

async function vote(id, inFavor) {
  try {
    const amount = prompt("Tokens a stakear:");
    if (!amount) return;
    const stake = safeBigIntFromInput(amount);
    
    const tx = await daoCoreContract.vote(id, inFavor, stake);
    await tx.wait();
    alert("Voto registrado");
    await loadProposals();
  } catch (e) { alertErr(e); }
}

async function finalizeProposal(id) {
  try {
    const tx = await daoCoreContract.finalize(id);
    await tx.wait();
    alert("Propuesta finalizada");
    await loadProposals();
  } catch (e) { alertErr(e); }
}

function showDelegateModal(proposalId) {
  const delegateAddr = prompt("Dirección del delegado:");
  if (!delegateAddr) return;
  
  const amount = prompt("Cantidad de tokens a delegar:");
  if (!amount) return;
  
  q("delegateProposalId").value = proposalId;
  q("delegateAddress").value = delegateAddr;
  q("delegateAmount").value = amount;

  const delegationTab = document.querySelector('#delegation-tab');
  if (delegationTab) {
    const tab = new bootstrap.Tab(delegationTab);
    tab.show();
    
    setTimeout(() => {
      q("btnDelegateVote")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

async function delegateVoteQuick(proposalId, delegateAddress, amount) {
  try {
    const stake = safeBigIntFromInput(amount);
    const tx = await daoDelegationContract.delegateVote(
      proposalId,
      delegateAddress,
      stake
    );
    await tx.wait();
    alert("✅ Voto delegado exitosamente");
    await loadProposals();
  } catch (e) { 
    alertErr(e); 
  }
}

async function voteWithDelegation(proposalId) {
  const delegatorAddr = prompt("Dirección del delegador:");
  if (!delegatorAddr) return;
  
  const inFavor = confirm("¿Votar a favor? (Cancelar = En contra)");
  
  try {
    const tx = await daoDelegationContract.voteWithDelegation(proposalId, delegatorAddr, inFavor);
    await tx.wait();
    alert("Voto con delegación registrado");
    await loadProposals();
  } catch (e) { alertErr(e); }
}

async function revokeDelegation(proposalId) {
  try {
    const tx = await daoDelegationContract.revokeDelegation(proposalId);
    await tx.wait();
    alert("Delegación revocada");
  } catch (e) { alertErr(e); }
}

async function updateVotingModeUI() {
  try {
    const mode = await daoCoreContract.votingMode();
    const text = Number(mode) === 0 ? "Lineal" : "Cuadrático";
    q("votingModeStatus").innerHTML = `<b>Modo actual:</b> ${text}`;
    q("btnToggleVotingMode").textContent = Number(mode) === 0
      ? "Cambiar a Cuadrático"
      : "Cambiar a Lineal";
  } catch {}
}

// Exponer funciones globalmente para los onclick en HTML
window.vote = vote;
window.finalizeProposal = finalizeProposal;
window.showDelegateModal = showDelegateModal;

// Inicialización cuando el DOM está listo
window.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM listo. Cargando ABIs...");
  
  // Cargar ABIs primero
  const abisLoaded = await loadABIs();
  if (!abisLoaded) {
    console.error("No se pudieron cargar los ABIs. La aplicación no funcionará correctamente.");
    return;
  }

  console.log("Inicializando listeners...");

  q("connectWalletBtn")?.addEventListener("click", async () => {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      currentAccount = await signer.getAddress();

      daoCoreContract = new ethers.Contract(CONTRACTS.daoCore, DAOCoreABI, signer);
      daoDelegationContract = new ethers.Contract(CONTRACTS.daoDelegation, DAODelegationABI, signer);
      daoTokenContract = new ethers.Contract(CONTRACTS.daoToken, DAOTokenABI, signer);
      
      daoViewsContract = new ethers.Contract(CONTRACTS.daoViews, DAOViewsABI, provider);

      q("connectWalletBtn").textContent = `Conectado: ${fmtAddr(currentAccount)}`;
      q("connectWalletBtn").classList.replace("btn-outline-primary","btn-success");

      try {
        const tokenAddr = await daoCoreContract.token();
        if (tokenAddr !== ethers.ZeroAddress) {
          const ercAbi = [
            "function decimals() view returns (uint8)"
          ];
          const tokenContract = new ethers.Contract(tokenAddr, ercAbi, provider);
          contractTokenDecimals = Number(await tokenContract.decimals());
        }
      } catch {}

      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnCreateProp")?.addEventListener("click", async () => {
    try {
      const title = q("propTitle").value.trim();
      const desc = q("propDesc").value.trim();
      const stakeStr = q("propStake").value.trim();

      if (!title || !stakeStr) return alert("Título y stake requeridos.");

      const stake = safeBigIntFromInput(stakeStr);
      const tx = await daoCoreContract.createProposal(title, desc, stake);
      await tx.wait();
      alert("Propuesta creada");
      await loadProposals();
    } catch (e) { alertErr(e); }
  });

  q("btnBuy")?.addEventListener("click", async () => {
    try {
      const eth = q("buyEth").value;
      if (!eth) return alert("Ingrese ETH");
      const value = ethers.parseEther(eth);
      
      const tx = await daoTokenContract.buyTokens({ value });
      await tx.wait();
      alert("Tokens comprados");
    } catch (e) { alertErr(e); }
  });

  q("btnActivatePanic")?.addEventListener("click", async () => {
    try {
      const tx = await daoCoreContract.panic();
      await tx.wait();
      alert("PÁNICO ACTIVADO");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnRestoreNormal")?.addEventListener("click", async () => {
    try {
      const tx = await daoCoreContract.tranquility();
      await tx.wait();
      alert("Tranquilidad restaurada");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnMint")?.addEventListener("click", async () => {
    try {
      const amount = q("mintAmount").value;
      if (!amount) return alert("Ingrese amount");

      const tx = await daoTokenContract.mintTokens(amount);
      await tx.wait();

      alert("Tokens minteados");
    } catch (e) { alertErr(e); }
  });

  q("btnCheckStakes")?.addEventListener("click", async () => {
    try {
      const addr = q("addrToCheck").value.trim();
      if (!addr) return alert("Ingrese una dirección");

      const balance = await daoViewsContract.getUserTokenBalance(addr);
      const staking = await daoViewsContract.getUserStaking(addr);

      let html = `
        <h5>Balance: ${balance.toString()} tokens</h5>
        <hr>
        <h6>Staking por propuesta:</h6>
      `;

      for (let i = 0; i < staking.proposalIds.length; i++) {
        html += `
          <div class="border p-2 mb-2 rounded">
            <b>Propuesta #${staking.proposalIds[i]}</b><br>
            🟦 Stake de voto: ${staking.voteStakes[i]}<br>
            🟥 Stake de propuesta: ${staking.proposalStakes[i]}
          </div>
        `;
      }

      q("stakesResult").innerHTML = html;

    } catch (e) {
      alertErr(e);
    }
  });

  q("btnUpdateParams")?.addEventListener("click", async () => {
    try {
      const price = q("paramPrice").value.trim();
      const minVote = q("paramMinVote").value.trim();
      const minProp = q("paramMinProp").value.trim();
      const votingPeriod = q("paramVotingPeriod").value.trim();
      const tokensPerVP = q("paramTokensPerVP").value.trim();
      const lockTime = q("paramLockTime").value.trim();

      if (!price || !minVote || !minProp || !votingPeriod || !tokensPerVP || !lockTime) {
        return alert("Complete todos los campos de parámetros");
      }

      const tx = await daoCoreContract.updateParams(
        safeBigIntFromInput(price),
        safeBigIntFromInput(minVote),
        safeBigIntFromInput(minProp),
        safeBigIntFromInput(votingPeriod),
        safeBigIntFromInput(tokensPerVP),
        safeBigIntFromInput(lockTime)
      );
      await tx.wait();
      alert("Parámetros actualizados");
    } catch (e) { alertErr(e); }
  });

  q("btnTransferOwner")?.addEventListener("click", async () => {
    try {
      const newOwner = q("newOwnerAddr").value.trim();
      if (!newOwner) return alert("Ingrese una dirección");

      const tx = await daoCoreContract.changeOwner(newOwner);
      await tx.wait();
      alert("Ownership transferido");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnSetPanicWallet")?.addEventListener("click", async () => {
    try {
      const wallet = q("panicWalletAddr").value.trim();
      if (!wallet) return alert("Ingrese una dirección");

      const tx = await daoCoreContract.setPanicWallet(wallet);
      await tx.wait();
      alert("Panic wallet configurada");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnUnstake")?.addEventListener("click", async () => {
    try {
      const proposalId = q("unstakeProposalId").value.trim();
      if (!proposalId) return alert("Ingrese un ID de propuesta");

      const tx = await daoCoreContract.unstakeProposal(safeBigIntFromInput(proposalId));
      await tx.wait();
      alert("Tokens desbloqueados de la propuesta");
    } catch (e) { alertErr(e); }
  });

  q("btnToggleVotingMode")?.addEventListener("click", async () => {
    try {
      const tx = await daoCoreContract.toggleVotingMode();
      await tx.wait();
      alert("Modo de votación cambiado");
      await updateVotingModeUI();
    } catch (e) { alertErr(e); }
  });

  q("filterStatus")?.addEventListener("change", async () => {
    try {
      const filter = q("filterStatus").value;
      const list = q("proposalsList");
      if (!list) return;

      let proposals;
      if (filter === "ALL") {
        proposals = await daoViewsContract.getAllProposals();
      } else {
        const statusMap = { "ACTIVE": 0, "ACCEPTED": 1, "REJECTED": 2 };
        proposals = await daoViewsContract.getProposalsByStatus(statusMap[filter]);
      }

      list.innerHTML = "";
      proposals.forEach((p, idx) => {
        const id = p.id ?? idx + 1;
        const title = p.title ?? "Sin título";
        const description = p.description ?? "";
        const votesFor = p.votesFor?.toString() ?? "0";
        const votesAgainst = p.votesAgainst?.toString() ?? "0";
        const status = Number(p.status);
        const statusLabel = ["Activa", "Aprobada", "Rechazada"][status] || status;

        const el = document.createElement("div");
        el.className = "border p-2 rounded mb-2";
        el.innerHTML = `
          <div class="d-flex justify-content-between">
            <div><b>#${id}</b> - ${title}</div>
            <small>Estado: ${statusLabel}</small>
          </div>
          <div class="mt-1"><small>${description}</small></div>
          <div class="mt-2">🟩 ${votesFor} / 🟥 ${votesAgainst}</div>
          <div class="mt-2">
            <button class="btn btn-sm btn-success me-1" onclick="window.vote(${id}, true)">Votar a favor</button>
            <button class="btn btn-sm btn-danger me-1" onclick="window.vote(${id}, false)">Votar en contra</button>
            <button class="btn btn-sm btn-secondary" onclick="window.finalizeProposal(${id})">Finalizar</button>
            <button class="btn btn-sm btn-info" onclick="window.showDelegateModal(${id})">Delegar</button>
          </div>
        `;
        list.appendChild(el);
      });

    } catch (e) {
      console.error("Error filtering proposals", e);
    }
  });

  q("btnDelegateVote")?.addEventListener("click", async () => {
    try {
      const proposalId = q("delegateProposalId").value.trim();
      const delegateAddr = q("delegateAddress").value.trim();
      const amount = q("delegateAmount").value.trim();

      if (!proposalId || !delegateAddr || !amount) {
        return alert("Complete todos los campos");
      }

      const stake = safeBigIntFromInput(amount);
      const tx = await daoDelegationContract.delegateVote(
        safeBigIntFromInput(proposalId),
        delegateAddr,
        stake
      );
      await tx.wait();
      
      alert("✅ Voto delegado exitosamente");
      
      q("delegateProposalId").value = "";
      q("delegateAddress").value = "";
      q("delegateAmount").value = "";
    } catch (e) { alertErr(e); }
  });

  q("btnVoteWithDelegation")?.addEventListener("click", async () => {
    try {
      const proposalId = q("voteWithDelegationProposalId").value.trim();
      const delegatorAddr = q("delegatorAddress").value.trim();
      const inFavor = q("delegatedVoteChoice").value === "true";

      if (!proposalId || !delegatorAddr) {
        return alert("Complete todos los campos");
      }

      const tx = await daoDelegationContract.voteWithDelegation(
        safeBigIntFromInput(proposalId),
        delegatorAddr,
        inFavor
      );
      await tx.wait();
      
      alert("✅ Voto con delegación registrado");
      await loadProposals();
      
      q("voteWithDelegationProposalId").value = "";
      q("delegatorAddress").value = "";
    } catch (e) { alertErr(e); }
  });

  q("btnRevokeDelegation")?.addEventListener("click", async () => {
    try {
      const proposalId = q("revokeProposalId").value.trim();

      if (!proposalId) {
        return alert("Ingrese el ID de la propuesta");
      }

      const tx = await daoDelegationContract.revokeDelegation(
        safeBigIntFromInput(proposalId)
      );
      await tx.wait();
      
      alert("✅ Delegación revocada");
      
      q("revokeProposalId").value = "";
    } catch (e) { alertErr(e); }
  });

  q("btnCheckDelegation")?.addEventListener("click", async () => {
    try {
      const proposalId = q("checkDelegationProposalId").value.trim();
      const addr = q("checkDelegationAddress").value.trim();

      if (!proposalId || !addr) {
        return alert("Complete todos los campos");
      }

      const [delegate, amount, active] = await daoViewsContract.getDelegationInfo(
        safeBigIntFromInput(proposalId),
        addr
      );

      const resultDiv = q("delegationResult");
      
      if (delegate === ethers.ZeroAddress) {
        resultDiv.innerHTML = `
          <div class="alert alert-info">
            <strong>ℹ️ No hay delegación activa</strong><br>
            Esta dirección no ha delegado su voto para esta propuesta.
          </div>
        `;
      } else {
        resultDiv.innerHTML = `
          <div class="alert alert-${active ? 'success' : 'warning'}">
            <h6><strong>📋 Información de Delegación</strong></h6>
            <hr>
            <p><strong>Delegado:</strong> ${fmtAddr(delegate)}</p>
            <p><strong>Cantidad:</strong> ${amount.toString()} tokens</p>
            <p><strong>Estado:</strong> ${active ? '✅ Activa' : '❌ Inactiva (ya fue usada o revocada)'}</p>
          </div>
        `;
      }
    } catch (e) { 
      alertErr(e);
      q("delegationResult").innerHTML = "";
    }
  });
});