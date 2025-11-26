import { CONTRACTS } from './dao-config.js';


let provider, signer;
let daoCoreContract, daoDelegationContract, daoTokenContract, daoViewsContract;
let currentAccount;
let contractTokenDecimals = 18;


// ABIs cargados dinámicamente
let DAOCoreABI, DAODelegationABI, DAOTokenABI, DAOViewsABI, SimpleMultiSigABI;


let erc20TokenContract;


const q = id => document.getElementById(id);
const fmtAddr = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "-";


// --- UTILIDADES ---


function clearInputs(ids) {
  ids.forEach(id => {
    const el = q(id);
    if (el) el.value = "";
  });
}


function showToast(message, type = "info") {
  const toastId = "toast-" + Date.now();
  const html = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  const container = document.getElementById("toastContainer");
  if (container) {
    container.insertAdjacentHTML("beforeend", html);
    const el = document.getElementById(toastId);
    const toast = new bootstrap.Toast(el);
    toast.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  } else {
    // Fallback si no hay container
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}


const alertErr = e => {
  console.error(e);
  const reason =
    e.reason ||
    e.shortMessage ||
    e.error?.message ||
    e.data?.message ||
    e.data?.originalError?.message ||
    e.body?.error?.message ||
    e.info?.error?.message ||
    e.message ||
    "Transacción fallida";


  const cleanMsg = reason
    .replace("execution reverted: ", "")
    .replace("VM Exception while processing transaction: revert ", "")
    .replace("unknown custom error", "Error desconocido (Revisar consola)");


  showToast("Error: " + cleanMsg, "danger");
};


// --- CORE: SAFETX ---
async function safeTx(contract, method, args = [], options = {}) {
  try {
    // 1. Simulación (StaticCall) para detectar revert real
    try {
      await contract[method].staticCall(...args, options);
    } catch (err) {
      console.warn(`StaticCall falló en ${method}:`, err);
      throw err; // Lanza para que alertErr lo capture abajo
    }


    // 2. Ejecución
    const tx = await contract[method](...args, options);
    return await tx.wait();


  } catch (e) {
    alertErr(e);
    throw e; // Interrumpe el flujo
  }
}


// --- CORE: MULTISIG PROPOSALS ---
async function submitMultisigProposal(targetContractAddr, functionName, args, isPanic = false) {
  if (!daoCoreContract) return showToast("Conecta tu wallet", "danger");


  try {
    showToast("🕒 Preparando propuesta...", "info");


    // Identificar multisig
    const ownerAddr = await daoCoreContract.owner();
    const panicAddr = await daoCoreContract.panicWallet();
    const multisigAddr = isPanic ? panicAddr : ownerAddr;


    if (!multisigAddr || multisigAddr === ethers.ZeroAddress) {
      return showToast("Dirección de Multisig no configurada.", "danger");
    }


    const multisigContract = new ethers.Contract(multisigAddr, SimpleMultiSigABI, signer);


    // Codificar llamada
    let targetInterface;
    if (targetContractAddr === await daoCoreContract.getAddress()) targetInterface = daoCoreContract.interface;
    else if (targetContractAddr === await daoTokenContract.getAddress()) targetInterface = daoTokenContract.interface;
    else return showToast("Contrato destino desconocido", "danger");


    const callData = targetInterface.encodeFunctionData(functionName, args);


    // Enviar usando safeTx
    await safeTx(multisigContract, "submitTransaction", [targetContractAddr, 0, callData]);


    showToast("✅ Propuesta creada. Requiere confirmaciones.", "success");
   
    await loadMultisigPendingTxs();


  } catch (e) {
    // safeTx ya manejó el error visual
  }
}


// --- MODALES Y FORMATOS ---


function modalInput(title, placeholder = "", helpText = "") {
  return new Promise(resolve => {
    q("modalInputTitle").textContent = title;
    q("modalInputField").value = "";
    q("modalInputField").placeholder = placeholder;
    q("modalInputHelp").textContent = helpText;


    const modalEl = q("modalInput");
    const modal = new bootstrap.Modal(modalEl);
    const okBtn = q("modalInputOk");


    const handler = () => {
      okBtn.removeEventListener("click", handler);
      modal.hide();
      resolve(q("modalInputField").value);
    };


    okBtn.addEventListener("click", handler);
    modal.show();
  });
}


function modalConfirm(text) {
  return new Promise(resolve => {
    q("modalConfirmText").textContent = text;
    const modalEl = q("modalConfirm");
    const modal = new bootstrap.Modal(modalEl);
    const okBtn = q("modalConfirmOk");


    const handler = () => {
      okBtn.removeEventListener("click", handler);
      modal.hide();
      resolve(true);
    };


    okBtn.addEventListener("click", handler);
    modalEl.addEventListener("hidden.bs.modal", () => resolve(false), { once: true });
    modal.show();
  });
}


const formatTokens = (baseUnits) => {
  if (!baseUnits) return "0";
  return ethers.formatUnits(baseUnits, contractTokenDecimals);
};


const parseTokens = (amountStr) => {
  if (!amountStr) return 0n;
  try { return ethers.parseUnits(amountStr, contractTokenDecimals); }
  catch { return 0n; }
};


const parseWei = (amountStr) => {
  if (!amountStr) return 0n;
  try { return ethers.parseEther(amountStr); }
  catch { return 0n; }
};


function safeBigIntFromInput(v) {
  if (!v) return 0n;
  const str = v.toString();
  if (str.includes(".")) return BigInt(Math.floor(Number(str)));
  return BigInt(str);
}


// --- GESTIÓN DE UI ---


const setOwnerUIVisible = visible => {
  const ids = [
    "mintAmount", "btnMint",
    "paramPrice", "paramMinVote", "paramMinProp", "paramVotingPeriod",
    "paramTokensPerVP", "paramLockTime", "btnUpdateParams",
    "newOwnerAddr", "btnTransferOwner",
    "panicWalletAddr", "btnSetPanicWallet",
    "btnToggleVotingMode"
  ];
  ids.forEach(id => {
    const el = q(id);
    if (!el) return;
    el.disabled = !visible;
    el.classList.toggle("opacity-50", !visible);
  });
};


const setWalletUIVisible = visible => {
  const ids = [
    "propTitle", "propDesc", "propStake", "btnCreateProp",
    "delegateProposalId", "delegateAddress", "delegateAmount", "btnDelegateVote",
    "voteWithDelegationProposalId", "delegatorAddress", "delegatedVoteChoice", "btnVoteWithDelegation",
    "revokeProposalId", "btnRevokeDelegation",
    "buyEth", "btnBuy",
    "unstakeProposalId", "btnUnstake", "unstakeVoteId", "btnUnstakeVote",
    "btnActivatePanic", "btnRestoreNormal"
  ];
  ids.forEach(id => {
    const el = q(id);
    if(el) el.disabled = !visible;
  });
};


// --- CARGA DE DATOS ---


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
    DAOCoreABI = core; DAODelegationABI = delegation; DAOTokenABI = token;
    DAOViewsABI = views; SimpleMultiSigABI = multisig;
    return true;
  } catch (error) {
    showToast("Error cargando ABIs. Verifica ./abis/", "warning");
    return false;
  }
}


async function loadUserBalance() {
  if (!erc20TokenContract || !currentAccount) return;
  const el = q("userBalance");
  if (!el) return;
  try {
    const bal = await erc20TokenContract.balanceOf(currentAccount);
    el.innerText = formatTokens(bal) + " tokens";
  } catch {}
}


async function loadDAOCurrentParams() {
  if (!daoCoreContract) return;
  try {
    const params = await daoCoreContract.getParams();
    const [price, minVote, minProp, votingPeriod, tokensPerVP, lockTime] = params;


    if(q("paramPrice")) q("paramPrice").value = ethers.formatEther(price);
    if(q("paramMinVote")) q("paramMinVote").value = formatTokens(minVote);
    if(q("paramMinProp")) q("paramMinProp").value = formatTokens(minProp);
    if(q("paramVotingPeriod")) q("paramVotingPeriod").value = votingPeriod;
    if(q("paramTokensPerVP")) q("paramTokensPerVP").value = tokensPerVP;
    if(q("paramLockTime")) q("paramLockTime").value = lockTime;


    // Display Modal
    if(q("displayPrice")) q("displayPrice").innerText = ethers.formatEther(price);
    if(q("displayMinVote")) q("displayMinVote").innerText = formatTokens(minVote);
    if(q("displayMinProp")) q("displayMinProp").innerText = formatTokens(minProp);
    if(q("displayVotingPeriod")) q("displayVotingPeriod").innerText = votingPeriod;
    if(q("displayTokensPerVP")) q("displayTokensPerVP").innerText = tokensPerVP;
    if(q("displayLockTime")) q("displayLockTime").innerText = lockTime;
  } catch (e) { console.error(e); }
}


// --- RENDERIZADO PROPUESTAS ---


async function loadProposals(filter = "ALL") {
  const list = q("proposalsList");
  if (!list || !daoViewsContract) return;


  list.innerHTML = "<div class='text-center my-4'><div class='spinner-border text-primary'></div><p>Cargando propuestas...</p></div>";


  try {
    let proposals;
    if (filter === "ALL") {
      proposals = await daoViewsContract.getAllProposals();
    } else {
      const map = { "ACTIVE": 0, "ACCEPTED": 1, "REJECTED": 2 };
      proposals = await daoViewsContract.getProposalsByStatus(map[filter]);
    }


    list.innerHTML = "";
    if (proposals.length === 0) {
      list.innerHTML = `<div class="alert alert-secondary text-center">No hay propuestas (${filter}).</div>`;
      return;
    }


    for (const [idx, p] of proposals.entries()) {
      const id = p.id; // El ID viene del contrato
      const status = Number(p.status);
      const statusLabel = ["Activa", "Aprobada", "Rechazada"][status] || status;
      const bgClass = status === 0 ? 'primary' : status === 1 ? 'success' : 'danger';


      let delegationBadge = "";
      if (currentAccount) {
        try {
          const [del, , act] = await daoViewsContract.getDelegationInfo(id, currentAccount);
          if (act && del !== ethers.ZeroAddress) delegationBadge = `<span class="delegation-badge">🤝 Delegado a ${fmtAddr(del)}</span>`;
        } catch {}
      }


      const card = document.createElement("div");
      card.className = "card mb-3 el-propuesta shadow-sm";
      card.innerHTML = `
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1 d-flex align-items-center gap-2">
                <b>${p.title}</b> <span class="text-muted small">#${id}</span> ${delegationBadge}
              </h5>
              <p class="mt-2 mb-0 text-muted">${p.description}</p>
            </div>
            <span class="estado-propuesta bg-${bgClass}">${statusLabel}</span>
          </div>
          <hr class="my-3">
          <div class="d-flex justify-content-between align-items-center flex-wrap mt-3">
            <div class="d-flex gap-4 flex-wrap">
              <div class="info-box">🟩 A favor: <strong>${formatTokens(p.votesFor)}</strong></div>
              <div class="info-box">🟥 En contra: <strong>${formatTokens(p.votesAgainst)}</strong></div>
            </div>
            <div class="d-flex gap-2 mt-2 mt-md-0">
              ${status === 0 ? `
                <button class="btn btn-sm btn-success" onclick="window.vote(${id}, true)">✅ A favor</button>
                <button class="btn btn-sm btn-danger" onclick="window.vote(${id}, false)">❌ En contra</button>
                <button class="btn btn-sm btn-secondary" onclick="window.finalizeProposal(${id})">🏁 Finalizar</button>
                <button class="btn btn-sm btn-info" onclick="window.showDelegateModal(${id})">🤝 Delegar</button>
              ` : ""}
            </div>
          </div>
        </div>`;
      list.appendChild(card);
    }
  } catch (e) {
    console.error(e);
    list.innerHTML = "<div class='alert alert-danger'>Error cargando propuestas.</div>";
  }
}


// --- RENDERIZADO MULTISIG (LISTAS SEPARADAS) ---


async function renderTxsInContainer(msigAddr, containerId, label, badgeClass) {
  const list = q(containerId);
  if (!list) return;


  if (!msigAddr || msigAddr === ethers.ZeroAddress) {
    list.innerHTML = `<div class="alert alert-warning small">⚠️ Wallet de ${label} no configurada.</div>`;
    return;
  }


  list.innerHTML = "<div class='d-flex justify-content-center my-2'><div class='spinner-border spinner-border-sm text-secondary'></div></div>";


  try {
    const msig = new ethers.Contract(msigAddr, SimpleMultiSigABI, provider);
    const count = await msig.transactionCount();
    const req = await msig._requiredConfirmations();
    let html = "";
    let hasPending = false;


    for (let i = Number(count) - 1; i >= 0; i--) {
      try {
        const txData = await msig.getTransaction(i);
        if (txData.executed) continue;
        hasPending = true;


        let funcDesc = "Desconocida";
        try {
          let decoded = daoCoreContract.interface.parseTransaction({ data: txData.data });
          if (!decoded) decoded = daoTokenContract.interface.parseTransaction({ data: txData.data });
          if (decoded) funcDesc = decoded.name;
        } catch {}


        const canExec = Number(txData.numConfirmations) >= Number(req);


        html += `
          <div class="alert alert-light border shadow-sm mb-2">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <span class="badge ${badgeClass} mb-1">${label}</span>
                <strong>#${i}: ${funcDesc}</strong>
                <div class="small text-muted mt-1">Confirmaciones: <b>${txData.numConfirmations}/${req}</b></div>
              </div>
              <div class="d-flex flex-column gap-1">
                 <button onclick="window.confirmTx('${msigAddr}', ${i})" class="btn btn-sm btn-outline-primary">✍️ Firmar</button>
                 <button onclick="window.executeTx('${msigAddr}', ${i})" class="btn btn-sm btn-success" ${!canExec ? 'disabled' : ''}>🚀 Ejecutar</button>
              </div>
            </div>
          </div>`;
      } catch (err) { console.warn(err); }
    }
    list.innerHTML = hasPending ? html : `<p class="text-muted text-center small my-3">No hay pendientes en ${label}.</p>`;
  } catch (e) {
    list.innerHTML = `<div class="alert alert-danger small">Error cargando contrato.</div>`;
  }
}


window.loadMultisigPendingTxs = async () => {
  if (!daoCoreContract || !currentAccount) return;
  try {
    const ownerAddr = await daoCoreContract.owner();
    const panicAddr = await daoCoreContract.panicWallet();
    await Promise.all([
      renderTxsInContainer(ownerAddr, "ownerPendingList", "DAO", "bg-primary"),
      renderTxsInContainer(panicAddr, "panicPendingList", "PÁNICO", "bg-danger")
    ]);
  } catch (e) { console.error(e); }
};


// --- INICIALIZACIÓN PRINCIPAL ---


async function initDAO() {
  if (!daoCoreContract || !daoViewsContract) return;


  try {
    // Verificar Owners
    let multisigAddr = null, isOwner = false;
    try { multisigAddr = await daoCoreContract.owner(); } catch {}


    if (multisigAddr && currentAccount) {
      try {
        const msig = new ethers.Contract(multisigAddr, SimpleMultiSigABI, signer);
        const owners = await msig.owners();
        isOwner = owners.some(o => o.toLowerCase() === currentAccount.toLowerCase());
      } catch {}
    }


    setOwnerUIVisible(isOwner);
    setWalletUIVisible(true);
    q("ownerMsg").textContent = isOwner ? `Eres owner (${fmtAddr(currentAccount)})` : "No eres owner.";


    // Verificar Pánico
    try {
      const isPanicked = await daoCoreContract.isPanicked();
      if (isPanicked) {
        q("panicMsg").textContent = "🚨 DAO EN MODO PÁNICO 🚨";
        q("panicMsg").style.display = "block";
        q("votingModeStatus").style.display = "none";
        // Bloquear todo excepto restaurar y conectar
        document.querySelectorAll("button:not(#connectWalletBtn):not(#panic-tab):not(#btnRestoreNormal):not(#disconnectWalletBtn):not(#openConnectModalBtn)").forEach(b => b.disabled = true);
        q("btnRestoreNormal").disabled = false;
      } else {
        q("panicMsg").style.display = "none";
        q("votingModeStatus").style.display = "block";
        setWalletUIVisible(true);
        setOwnerUIVisible(isOwner);
      }
    } catch {}


    await loadProposals();
    await updateVotingModeUI();
    await loadUserBalance();
    await loadDAOCurrentParams();
    await loadMultisigPendingTxs();


  } catch (e) { console.error(e); }
}


async function updateVotingModeUI() {
  try {
    const mode = await daoCoreContract.votingMode();
    const text = Number(mode) === 0 ? "Lineal" : "Cuadrático";
    q("votingModeStatus").innerHTML = `<b>Modo actual:</b> ${text}`;
    q("btnToggleVotingMode").textContent = Number(mode) === 0 ? "Cambiar a Cuadrático" : "Cambiar a Lineal";
  } catch {}
}


// --- ACCIONES GLOBALES (MULTISIG & USUARIO) ---


window.confirmTx = async (msigAddr, id) => {
  try {
    const msig = new ethers.Contract(msigAddr, SimpleMultiSigABI, signer);
    showToast("⏳ Confirmando...", "info");
    await safeTx(msig, "confirmTransaction", [id]);
    showToast("✅ Confirmado", "success");
    await loadMultisigPendingTxs();
  } catch {}
};


window.executeTx = async (msigAddr, id) => {
  try {
    const msig = new ethers.Contract(msigAddr, SimpleMultiSigABI, signer);
    showToast("⏳ Ejecutando...", "info");
    // Gas Limit manual para evitar fallo de estimación en llamadas internas
    await safeTx(msig, "executeTransaction", [id], { gasLimit: 6000000 });
    showToast("🚀 Ejecutado correctamente", "success");
    await loadMultisigPendingTxs();
    await initDAO();
  } catch {}
};


window.vote = async (id, inFavor) => {
  try {
    const am = await modalInput("Tokens a stakear", "Ej: 10");
    if (!am) return;
    const stake = parseTokens(am);
    if (stake === 0n) return showToast("Monto inválido", "danger");


    const stakingAddr = await daoCoreContract.staking();
    if (!await modalConfirm("¿Aprobar tokens?")) return;


    await safeTx(erc20TokenContract, "approve", [stakingAddr, stake]);
    showToast("Aprobado. Votando...", "info");
    await safeTx(daoCoreContract, "vote", [id, inFavor, stake]);
    showToast("Voto registrado", "success");
    await loadProposals();
    await loadUserBalance();
  } catch {}
};


window.finalizeProposal = async (id) => {
  try {
    await safeTx(daoCoreContract, "finalize", [id]);
    showToast("Finalizada", "success");
    await loadProposals();
  } catch {}
};


window.showDelegateModal = (pid) => {
  q("delegateProposalId").value = pid;
  new bootstrap.Tab(q('delegation-tab')).show();
};


window.showDaoParamsModal = async () => {
  if (daoCoreContract) await loadDAOCurrentParams();
  new bootstrap.Modal(q('paramsModal')).show();
};


window.connectWallet = async (type) => {
  try {
    if (!window.ethereum) return showToast("No se detectó wallet", "warning");
    await window.ethereum.request({ method: "eth_requestAccounts" });


    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    currentAccount = await signer.getAddress();


    // Contratos
    daoCoreContract = new ethers.Contract(CONTRACTS.daoCore, DAOCoreABI, signer);
    daoDelegationContract = new ethers.Contract(CONTRACTS.daoDelegation, DAODelegationABI, signer);
    daoTokenContract = new ethers.Contract(CONTRACTS.daoToken, DAOTokenABI, signer);
    daoViewsContract = new ethers.Contract(CONTRACTS.daoViews, DAOViewsABI, provider);


    // Token
    try {
      const tokenAddr = await daoCoreContract.token();
      const ercAbi = ["function decimals() view returns (uint8)", "function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"];
      erc20TokenContract = new ethers.Contract(tokenAddr, ercAbi, signer);
      contractTokenDecimals = Number(await erc20TokenContract.decimals());
    } catch { contractTokenDecimals = 18; }


    // UI Updates
    const modal = bootstrap.Modal.getInstance(q('walletModal'));
    if (modal) modal.hide();
    q("openConnectModalBtn").style.display = "none";
    q("disconnectWalletBtn").style.display = "block";
    showToast(`Conectado: ${fmtAddr(currentAccount)}`, "success");


    await initDAO();
  } catch (e) { alertErr(e); }
};


// --- EVENT LISTENERS ---


window.addEventListener("DOMContentLoaded", async () => {
  setOwnerUIVisible(false); setWalletUIVisible(false);
  if (!await loadABIs()) return;


  // Desconectar
  q("disconnectWalletBtn")?.addEventListener("click", () => {
    provider = null; signer = null; currentAccount = null;
    q("openConnectModalBtn").style.display = "block";
    q("disconnectWalletBtn").style.display = "none";
    q("proposalsList").innerHTML = "";
    q("userBalance").innerText = "--";
    setOwnerUIVisible(false); setWalletUIVisible(false);
    showToast("Desconectado", "info");
  });


  // Filtro Propuestas
  q("filterStatus")?.addEventListener("change", (e) => {
    if (daoViewsContract) loadProposals(e.target.value);
  });


  // ACCIONES DE USUARIO
  q("btnCreateProp")?.addEventListener("click", async () => {
    try {
      const title = q("propTitle").value;
      const desc = q("propDesc").value;
      const stake = parseTokens(q("propStake").value);
      const stakingAddr = await daoCoreContract.staking();


      await safeTx(erc20TokenContract, "approve", [stakingAddr, stake]);
      await safeTx(daoCoreContract, "createProposal", [title, desc, stake]);
     
      showToast("Creada", "success");
      clearInputs(["propTitle", "propDesc", "propStake"]);
      await loadProposals();
      await loadUserBalance();
    } catch {}
  });


  q("btnBuy")?.addEventListener("click", async () => {
    try {
      const val = ethers.parseEther(q("buyEth").value);
      await safeTx(daoTokenContract, "buyTokens", [], { value: val });
      showToast("Comprado", "success");
      await loadUserBalance();
    } catch {}
  });


  q("btnDelegateVote")?.addEventListener("click", async () => {
    try {
      const pid = q("delegateProposalId").value;
      const to = q("delegateAddress").value;
      const am = parseTokens(q("delegateAmount").value);
      const stakingAddr = await daoCoreContract.staking();


      await safeTx(erc20TokenContract, "approve", [stakingAddr, am]);
      await safeTx(daoDelegationContract, "delegateVote", [pid, to, am]);
      showToast("Delegado", "success");
    } catch {}
  });


  q("btnVoteWithDelegation")?.addEventListener("click", async () => {
    try {
      const pid = q("voteWithDelegationProposalId").value;
      const from = q("delegatorAddress").value;
      const choice = q("delegatedVoteChoice").value === "true";
      await safeTx(daoDelegationContract, "voteWithDelegation", [pid, from, choice]);
      showToast("Voto delegado registrado", "success");
      await loadProposals();
    } catch {}
  });


  q("btnRevokeDelegation")?.addEventListener("click", async () => {
    try {
      await safeTx(daoDelegationContract, "revokeDelegation", [q("revokeProposalId").value]);
      showToast("Revocado", "success");
    } catch {}
  });


  q("btnCheckDelegation")?.addEventListener("click", async () => {
    try {
      const pid = q("checkDelegationProposalId").value;
      const addr = q("checkDelegationAddress").value;
      const [del, am, act] = await daoViewsContract.getDelegationInfo(pid, addr);
      q("delegationResult").innerHTML = del === ethers.ZeroAddress
        ? "<div class='alert alert-info'>Sin delegación</div>"
        : `<div class='alert alert-${act?"success":"warning"}'>Delegado: ${fmtAddr(del)} (${formatTokens(am)})<br>Activa: ${act?"Sí":"No"}</div>`;
    } catch {}
  });


  q("btnUnstake")?.addEventListener("click", async () => {
    try {
      await safeTx(daoCoreContract, "unstakeProposal", [q("unstakeProposalId").value]);
      showToast("Unstaked", "success");
      await loadUserBalance();
    } catch {}
  });


  q("btnUnstakeVote")?.addEventListener("click", async () => {
    try {
      await safeTx(daoCoreContract, "unstakeVote", [q("unstakeVoteId").value]);
      showToast("Unstaked", "success");
      await loadUserBalance();
    } catch {}
  });


  // ACCIONES DE OWNER (MULTISIG)
  q("btnMint")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoToken, "mintTokens", [parseTokens(q("mintAmount").value)]
  ));


  q("btnUpdateParams")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoCore, "updateParams", [
      parseWei(q("paramPrice").value),
      parseTokens(q("paramMinVote").value),
      parseTokens(q("paramMinProp").value),
      safeBigIntFromInput(q("paramVotingPeriod").value),
      safeBigIntFromInput(q("paramTokensPerVP").value),
      safeBigIntFromInput(q("paramLockTime").value)
    ]
  ));


  q("btnToggleVotingMode")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoCore, "toggleVotingMode", []
  ));


  q("btnTransferOwner")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoCore, "changeOwner", [q("newOwnerAddr").value]
  ));


  q("btnSetPanicWallet")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoCore, "setPanicWallet", [q("panicWalletAddr").value]
  ));


  // ACCIONES DE PANIC (MULTISIG)
  q("btnActivatePanic")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoCore, "panic", [], true
  ));


  q("btnRestoreNormal")?.addEventListener("click", () => submitMultisigProposal(
    CONTRACTS.daoCore, "tranquility", [], true
  ));
});