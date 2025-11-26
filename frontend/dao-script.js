import { CONTRACTS } from './dao-config.js';

let provider, signer;
let daoCoreContract, daoDelegationContract, daoTokenContract, daoViewsContract;
let currentAccount;
let contractTokenDecimals = 0;

// ABIs cargados dinámicamente
let DAOCoreABI, DAODelegationABI, DAOTokenABI, DAOViewsABI, SimpleMultiSigABI;

// 🚨 CORRECCIÓN 1: Declaración de la variable global para el contrato ERC-20 real 🚨
let erc20TokenContract;

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

  showToast("Error: " + reason.replace("execution reverted: ", ""), "danger");
};

// 🌟 MEJORA 1: Nueva función para vaciar un conjunto de inputs 🌟
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
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  const container = document.getElementById("toastContainer");
  container.insertAdjacentHTML("beforeend", html);

  const el = document.getElementById(toastId);
  const toast = new bootstrap.Toast(el);
  toast.show();

  el.addEventListener("hidden.bs.toast", () => el.remove());
}

function modalInput(title, placeholder = "", helpText = "") {
  return new Promise(resolve => {
    document.getElementById("modalInputTitle").textContent = title;
    document.getElementById("modalInputField").value = "";
    document.getElementById("modalInputField").placeholder = placeholder;
    document.getElementById("modalInputHelp").textContent = helpText;

    const modalEl = document.getElementById("modalInput");
    const modal = new bootstrap.Modal(modalEl);

    const okBtn = document.getElementById("modalInputOk");

    const handler = () => {
      okBtn.removeEventListener("click", handler);
      modal.hide();
      resolve(document.getElementById("modalInputField").value);
    };

    okBtn.addEventListener("click", handler);
    modal.show();
  });
}

function modalConfirm(text) {
  return new Promise(resolve => {
    document.getElementById("modalConfirmText").textContent = text;

    const modalEl = document.getElementById("modalConfirm");
    const modal = new bootstrap.Modal(modalEl);

    const okBtn = document.getElementById("modalConfirmOk");

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
  const decimals = contractTokenDecimals || 18;
  if (!baseUnits) return "0";
  return ethers.formatUnits(baseUnits, decimals);
};

const parseTokens = (amountStr) => {
  if (!amountStr || amountStr.trim() === "") return 0n;
  try {
    const decimals = contractTokenDecimals || 18;
    return ethers.parseUnits(amountStr, decimals);
  } catch (e) {
    console.error("Error al parsear cantidad de tokens:", e);
    return 0n;
  }
};

const parseWei = (amountStr) => {
  if (!amountStr || amountStr.trim() === "") return 0n;
  try {
    return ethers.parseEther(amountStr);
  } catch (e) {
    console.error("Error al parsear cantidad de Wei:", e);
    return 0n;
  }
};

function safeBigIntFromInput(v) {
  if (!v) return 0n;
  if (v.includes(".")) return BigInt(Math.floor(parseFloat(v)));
  return BigInt(v);
}

// --- VISIBILIDAD EN LA UI ---

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
    if (!visible) el.classList.add("opacity-50");
    else el.classList.remove("opacity-50");
  });
};

const setWalletUIVisible = visible => {
  const ids = [
    "propTitle", "propDesc", "propStake", "btnCreateProp",
    "delegateProposalId", "delegateAddress", "delegateAmount", "btnDelegateVote",
    "voteWithDelegationProposalId", "delegatorAddress", "delegatedVoteChoice", "btnVoteWithDelegation",
    "revokeProposalId", "btnRevokeDelegation",
    "buyEth", "btnBuy",
    "unstakeProposalId", "btnUnstake",
    "btnActivatePanic", "btnRestoreNormal"
  ];

  ids.forEach(id => {
    const el = q(id);
    if (!el) return;
    el.disabled = !visible;
  });
};

// --- CARGA DE ABIs ---
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

    console.log("ABIs cargados correctamente");
    return true;
  } catch (error) {
    console.error("Error cargando ABIs:", error);

    showToast("Error al cargar los ABIs. Verificá que los archivos existan en ./abis/", "warning");

    return false;
  }
}

// --- BALANCE ---
async function loadUserBalance() {
  if (!erc20TokenContract || !currentAccount) return;

  const userBalanceEl = q("userBalance");
  if (!userBalanceEl) return;

  try {
    const balance = await erc20TokenContract.balanceOf(currentAccount);
    userBalanceEl.innerText = formatTokens(balance) + " tokens";
  } catch (e) {
    console.error("Error loading user balance:", e);
  }
}

// --- PARÁMETROS DE LA DAO ---
async function loadDAOCurrentParams() {
  if (!daoCoreContract) return;

  try {
    const params = await daoCoreContract.getParams();
    const [price, minVote, minProp, votingPeriod, tokensPerVP, lockTime] = params;

    const formattedPrice = ethers.formatEther(price);
    const formattedMinVote = formatTokens(minVote);
    const formattedMinProp = formatTokens(minProp);
    const formattedTokensPerVP = tokensPerVP.toString();
    const formattedVotingPeriod = votingPeriod.toString();
    const formattedLockTime = lockTime.toString();

    if (q("paramPrice")) q("paramPrice").value = formattedPrice;
    if (q("paramMinVote")) q("paramMinVote").value = formattedMinVote;
    if (q("paramMinProp")) q("paramMinProp").value = formattedMinProp;
    if (q("paramVotingPeriod")) q("paramVotingPeriod").value = formattedVotingPeriod;
    if (q("paramTokensPerVP")) q("paramTokensPerVP").value = formattedTokensPerVP;
    if (q("paramLockTime")) q("paramLockTime").value = formattedLockTime;

    if (q("displayPrice")) q("displayPrice").innerText = formattedPrice;
    if (q("displayMinVote")) q("displayMinVote").innerText = formattedMinVote;
    if (q("displayMinProp")) q("displayMinProp").innerText = formattedMinProp;
    if (q("displayVotingPeriod")) q("displayVotingPeriod").innerText = formattedVotingPeriod;
    if (q("displayTokensPerVP")) q("displayTokensPerVP").innerText = formattedTokensPerVP;
    if (q("displayLockTime")) q("displayLockTime").innerText = formattedLockTime;

  } catch (e) {
    console.error("Error loading DAO parameters:", e);
    if (q("daoParamsDisplay")) q("daoParamsDisplay").innerHTML = "<p>Error al cargar parámetros de la DAO.</p>";
  }
}

async function initDAO() {
  if (!daoCoreContract || !daoViewsContract) return;

  try {
    let multisigAddr = null;
    let isOwner = false;

    // --- Owner multisig ---
    try {
      multisigAddr = await daoCoreContract.owner();
    } catch (e) {
      console.warn("No owner() available?", e);
    }

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
    setWalletUIVisible(true);

    if (isOwner)
      q("ownerMsg").textContent = `Eres owner del multisig (${fmtAddr(currentAccount)})`;
    else
      q("ownerMsg").textContent = `No sos owner. Algunas acciones están deshabilitadas.`;

    // --- Pánico ---
    let panicMsg = "";
    let isPanicked = false;

    try {
      isPanicked = await daoCoreContract.isPanicked();
      if (isPanicked) {
        panicMsg += "DAO en modo PÁNICO";

        document.querySelectorAll(
          "button:not(#connectWalletBtn):not(#panic-tab):not(#btnRestoreNormal)"
        ).forEach(b => b.disabled = true);

        q("btnRestoreNormal").disabled = false;
        q("panicMsg").style.display = "block";
        q("votingModeStatus").style.display = "none";
      } else {
        document.querySelectorAll(
          "button:not(#connectWalletBtn):not(#panic-tab):not(#btnRestoreNormal)"
        ).forEach(b => b.disabled = false);

        setWalletUIVisible(true);
        setOwnerUIVisible(isOwner);
        q("panicMsg").style.display = "none";
        q("votingModeStatus").style.display = "block";
      }
    } catch {
      q("panicMsg").style.display = "block";
    }

    if (q("panicMsg")) q("panicMsg").textContent = panicMsg;

    await loadProposals();
    await updateVotingModeUI();
    await loadUserBalance();
    await loadDAOCurrentParams();

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
      const votesFor = formatTokens(p.votesFor) ?? "0";
      const votesAgainst = formatTokens(p.votesAgainst) ?? "0";
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
      el.className = "card mb-3 el-propuesta shadow-sm";
      el.innerHTML = `
        <div class="card-body p-4">

          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5 class="mb-1 d-flex align-items-center gap-2">
                <b>${title}</b>
                <span class="text-muted small">#${id}</span>
                ${delegationBadge}
              </h5>

              <p class="mt-2 mb-0">
                <span class="fw-bold">Descripción:</span>
                <span class="text-muted">${description}</span>
              </p>
            </div>

            <span class="estado-propuesta bg-${status === 0 ? 'primary' : status === 1 ? 'success' : 'danger'}">
              ${statusLabel}
            </span>
          </div>

          <hr class="my-3">

          <div class="d-flex justify-content-between align-items-center flex-wrap mt-3">

            <div class="d-flex gap-4 flex-wrap">
              <div class="info-box">
                🟩 Votos a favor: <strong>${votesFor}</strong>
              </div>
              <div class="info-box">
                🟥 Votos en contra: <strong>${votesAgainst}</strong>
              </div>
            </div>

            <div class="d-flex gap-2 mt-2 mt-md-0">
              ${
                status === 0
                  ? `
                  <button class="btn btn-sm btn-success" onclick="window.vote(${id}, true)">✅ A favor</button>
                  <button class="btn btn-sm btn-danger" onclick="window.vote(${id}, false)">❌ En contra</button>
                  <button class="btn btn-sm btn-secondary" onclick="window.finalizeProposal(${id})">🏁 Finalizar</button>
                  <button class="btn btn-sm btn-info" onclick="window.showDelegateModal(${id})">🤝 Delegar</button>
                `
                  : ""
              }
            </div>

          </div>
        </div>
      `;
      list.appendChild(el);
    }

  } catch (e) {
    console.error("loadProposals error", e);
  }
}

async function vote(id, inFavor) {
  if (!daoCoreContract || !erc20TokenContract)
    return showToast("Conecta tu wallet y asegúrate de cargar el contrato del token.", "danger");

  try {
    const amountStr = await modalInput("Tokens a stakear", "Ej: 1.5");
    if (!amountStr) return;

    const stake = parseTokens(amountStr);
    if (stake === 0n)
      return showToast("Monto de stake inválido o cero.", "danger");

    const stakingAddr = await daoCoreContract.staking();
    if (!stakingAddr || stakingAddr === ethers.ZeroAddress)
      return showToast("El contrato de Staking no está configurado correctamente.", "danger");

    const confirmApprove = await modalConfirm(`Se solicitará aprobación para usar ${amountStr} tokens. ¿Continuar?`);
    if (!confirmApprove) return;

    const approveTx = await erc20TokenContract.approve(stakingAddr, stake);
    await approveTx.wait();
    showToast("Aprobación exitosa. Enviando voto...", "info");

    const tx = await daoCoreContract.vote(id, inFavor, stake);
    await tx.wait();

    showToast("Voto registrado con éxito", "success");
    await loadProposals();
    await loadUserBalance();

  } catch (e) {
    alertErr(e);
  }
}

async function finalizeProposal(id) {
  if (!daoCoreContract)
    return showToast("Conecta tu wallet para finalizar", "danger");

  try {
    const tx = await daoCoreContract.finalize(id);
    await tx.wait();
    showToast("Propuesta finalizada", "success");

    await loadProposals();
    clearInputs(["unstakeProposalId"]);
  } catch (e) { alertErr(e); }
}

function showDelegateModal(proposalId) {
  (async () => {
    const delegateAddr = await modalInput("Dirección del delegado", "0x...");
    if (!delegateAddr) return;

    const amount = await modalInput("Cantidad de tokens a delegar", "Ej: 5.2");
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
  })();
}

async function delegateVoteQuick(proposalId, delegateAddress, amountStr) {
  if (!daoDelegationContract)
    return showToast("Conecta tu wallet para delegar", "danger");

  try {
    const stake = parseTokens(amountStr);
    if (stake === 0n)
      return showToast("Monto de delegación inválido o cero.", "danger");

    const tx = await daoDelegationContract.delegateVote(
      safeBigIntFromInput(proposalId),
      delegateAddress,
      stake
    );
    await tx.wait();

    showToast("Voto delegado exitosamente", "success");
    await loadProposals();
    clearInputs(["delegateProposalId", "delegateAddress", "delegateAmount"]);

  } catch (e) { alertErr(e); }
}

async function voteWithDelegation(proposalId) {
  if (!daoDelegationContract)
    return showToast("Conecta tu wallet para votar con delegación", "danger");

  const delegatorAddr = await modalInput("Dirección del delegador", "0x...");
  if (!delegatorAddr) return;

  const inFavor = await modalConfirm("¿Votar a favor? (Cancelar = En contra)");

  try {
    const tx = await daoDelegationContract.voteWithDelegation(
      proposalId,
      delegatorAddr,
      inFavor
    );
    await tx.wait();

    showToast("Voto con delegación registrado", "success");
    await loadProposals();
    clearInputs(["voteWithDelegationProposalId", "delegatorAddress"]);

  } catch (e) { alertErr(e); }
}

async function revokeDelegation(proposalId) {
  if (!daoDelegationContract)
    return showToast("Conecta tu wallet para revocar", "danger");

  try {
    const tx = await daoDelegationContract.revokeDelegation(proposalId);
    await tx.wait();

    showToast("Delegación revocada", "success");
    q("revokeProposalId").value = "";

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

// 🌟 MEJORA 3: Función para mostrar el modal de parámetros (para el botón de info) 🌟
window.showDaoParamsModal = async () => {
  if (!daoCoreContract) {
    q("daoParamsModalBody").innerHTML = "<p>Conecta tu wallet primero.</p>";
  } else {
    await loadDAOCurrentParams();
  }
  const modal = new bootstrap.Modal(q('daoParamsModal'));
  modal.show();
};

window.addEventListener("DOMContentLoaded", async () => {

  console.log("DOM listo. Cargando ABIs...");

  setOwnerUIVisible(false); 
  setWalletUIVisible(false); 

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
            "function decimals() view returns (uint8)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function balanceOf(address account) external view returns (uint256)"
          ];

          erc20TokenContract = new ethers.Contract(tokenAddr, ercAbi, signer); 
          contractTokenDecimals = Number(await erc20TokenContract.decimals());
        }
      } catch (e) {
        console.warn("No se pudieron obtener los decimales o el contrato del token. Asumiendo 18.", e);
        contractTokenDecimals = 18;
      }

      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnCreateProp")?.addEventListener("click", async () => {
    if (!daoCoreContract || !erc20TokenContract)
      return showToast("Conecta tu wallet y asegúrate de cargar el contrato del token ERC20.", "danger");

    let approveTx;
    let tx;

    try {
      const title = q("propTitle").value.trim();
      const desc = q("propDesc").value.trim();
      const stakeStr = q("propStake").value.trim();

      if (!title || !stakeStr)
        return showToast("Título y stake requeridos.", "danger");

      const stake = parseTokens(stakeStr);
      if (stake === 0n)
        return showToast("Monto de stake inválido o cero.", "danger");

      const stakingAddr = await daoCoreContract.staking();
      if (!stakingAddr || stakingAddr === ethers.ZeroAddress) {
        return showToast("El contrato de Staking no está configurado en el DAOCore", "danger");
      }


      approveTx = await erc20TokenContract.approve(stakingAddr, stake);
      await approveTx.wait();

      showToast("Aprobación exitosa. Creando propuesta...", "info");

      tx = await daoCoreContract.createProposal(title, desc, stake);
      await tx.wait();
      showToast("Propuesta creada", "success");

      clearInputs(["propTitle", "propDesc", "propStake"]);

      await loadProposals();
      await loadUserBalance();
    } catch (e) {
      alertErr(e);
    }
  });

  q("btnBuy")?.addEventListener("click", async () => {
    if (!daoTokenContract)
      return showToast("Conecta tu wallet para comprar tokens", "danger");

    try {
      const eth = q("buyEth").value;
      if (!eth) return showToast("Ingrese ETH", "danger");

      const value = ethers.parseEther(eth);
      const tx = await daoTokenContract.buyTokens({ value });

      await tx.wait();
      showToast("Tokens comprados", "success");

      await loadUserBalance();
      clearInputs(["buyEth"]);
    } catch (e) { alertErr(e); }
  });

});

q("btnActivatePanic")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para activar pánico", "danger");

  try {
    const tx = await daoCoreContract.panic();
    await tx.wait();
    showToast("🚨 PÁNICO ACTIVADO", "success");
    await initDAO();
  } catch (e) { alertErr(e); }
});

q("btnRestoreNormal")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para restaurar", "danger");

  try {
    const tx = await daoCoreContract.tranquility();
    await tx.wait();
    showToast("🕊 Tranquilidad restaurada", "success");
    await initDAO();
  } catch (e) { alertErr(e); }
});

q("btnMint")?.addEventListener("click", async () => {
  if (!daoTokenContract) return showToast("Conecta tu wallet para mintear", "danger");

  try {
    const amountStr = q("mintAmount").value;
    if (!amountStr) return showToast("Ingrese amount", "danger");

    const amount = parseTokens(amountStr);
    if (amount === 0n) return showToast("Monto inválido o cero.", "danger");

    const tx = await daoTokenContract.mintTokens(amount);
    await tx.wait();

    showToast(`Tokens minteados: ${amountStr} tokens`, "success");
    await loadUserBalance();
    clearInputs(["mintAmount"]);
  } catch (e) { alertErr(e); }
});

q("btnCheckStakes")?.addEventListener("click", async () => {
  if (!daoViewsContract) return showToast("Conecta tu wallet para consultar staking", "danger");

  try {
    const addr = q("addrToCheck").value.trim();
    if (!addr) return showToast("Ingrese una dirección", "danger");

    const balance = await daoViewsContract.getUserTokenBalance(addr);
    const staking = await daoViewsContract.getUserStaking(addr);

    let html = `
      <h5>Balance: ${formatTokens(balance)} tokens</h5>
      <hr>
      <h6>Staking por propuesta:</h6>
    `;

    for (let i = 0; i < staking.proposalIds.length; i++) {
      html += `
        <div class="border p-2 mb-2 rounded">
          <b>Propuesta #${staking.proposalIds[i]}</b><br>
          🟦 Stake de voto: ${formatTokens(staking.voteStakes[i])} tokens<br>
          🟥 Stake de propuesta: ${formatTokens(staking.proposalStakes[i])} tokens
        </div>
      `;
    }

    q("stakesResult").innerHTML = html;

  } catch (e) {
    alertErr(e);
  }
});

q("btnUpdateParams")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para actualizar parámetros", "danger");

  try {
    const price = q("paramPrice").value.trim();
    const minVote = q("paramMinVote").value.trim();
    const minProp = q("paramMinProp").value.trim();
    const votingPeriod = q("paramVotingPeriod").value.trim();
    const tokensPerVP = q("paramTokensPerVP").value.trim();
    const lockTime = q("paramLockTime").value.trim();

    if (!price || !minVote || !minProp || !votingPeriod || !tokensPerVP || !lockTime) {
      return showToast("Complete todos los campos de parámetros", "danger");
    }

    const tx = await daoCoreContract.updateParams(
      parseWei(price),
      parseTokens(minVote),
      parseTokens(minProp),
      safeBigIntFromInput(votingPeriod),
      safeBigIntFromInput(tokensPerVP),
      safeBigIntFromInput(lockTime)
    );
    await tx.wait();

    showToast("Parámetros actualizados.", "success");
    await loadDAOCurrentParams();
  } catch (e) { alertErr(e); }
});

q("btnTransferOwner")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para transferir ownership", "danger");

  try {
    const newOwner = q("newOwnerAddr").value.trim();
    if (!newOwner) return showToast("Ingrese una dirección", "danger");

    const tx = await daoCoreContract.changeOwner(newOwner);
    await tx.wait();
    showToast("Ownership transferido", "success");
    await initDAO();
    clearInputs(["newOwnerAddr"]);
  } catch (e) { alertErr(e); }
});

q("btnSetPanicWallet")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para configurar Panic Wallet", "danger");

  try {
    const wallet = q("panicWalletAddr").value.trim();
    if (!wallet) return showToast("Ingrese una dirección", "danger");

    const tx = await daoCoreContract.setPanicWallet(wallet);
    await tx.wait();
    showToast("Panic wallet configurada", "success");
    await initDAO();
    clearInputs(["panicWalletAddr"]);
  } catch (e) { alertErr(e); }
});

q("btnUnstake")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para quitar stake", "danger");

  try {
    const proposalId = q("unstakeProposalId").value.trim();
    if (!proposalId) return showToast("Ingrese un ID de propuesta", "danger");

    const tx = await daoCoreContract.unstakeProposal(safeBigIntFromInput(proposalId));
    await tx.wait();
    showToast("Tokens desbloqueados de la propuesta", "success");
    await loadUserBalance();
    clearInputs(["unstakeProposalId"]);
  } catch (e) { alertErr(e); }
});

q("btnUnstakeVote")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para quitar stake", "danger");

  try {
    const proposalId = q("unstakeVoteId").value.trim();
    if (!proposalId) return showToast("Ingrese un ID de propuesta", "danger");

    const tx = await daoCoreContract.unstakeVote(safeBigIntFromInput(proposalId));
    await tx.wait();
    showToast("Tokens desbloqueados de la propuesta", "success");
    await loadUserBalance();
    clearInputs(["unstakeVoteId"]);
  } catch (e) { alertErr(e); }
});

q("btnToggleVotingMode")?.addEventListener("click", async () => {
  if (!daoCoreContract) return showToast("Conecta tu wallet para cambiar el modo de votación", "danger");

  try {
    const tx = await daoCoreContract.toggleVotingMode();
    await tx.wait();
    showToast("Modo de votación cambiado", "success");
    await updateVotingModeUI();
  } catch (e) { alertErr(e); }
});

q("btnDelegateVote")?.addEventListener("click", async () => {
  if (!daoDelegationContract) return showToast("Conecta tu wallet para delegar voto", "danger");

  try {
    const proposalId = q("delegateProposalId").value.trim();
    const delegateAddress = q("delegateAddress").value.trim();
    const amount = q("delegateAmount").value.trim();

    if (!proposalId || !delegateAddress || !amount) {
      return showToast("Complete todos los campos de delegación", "danger");
    }

    await delegateVoteQuick(safeBigIntFromInput(proposalId), delegateAddress, amount);

  } catch (e) { alertErr(e); }
});

q("btnVoteWithDelegation")?.addEventListener("click", async () => {
  if (!daoDelegationContract) return showToast("Conecta tu wallet para votar con delegación", "danger");

  try {
    const proposalId = q("voteWithDelegationProposalId").value.trim();
    const delegatorAddr = q("delegatorAddress").value.trim();
    const inFavor = q("delegatedVoteChoice").value === "true";

    if (!proposalId || !delegatorAddr) {
      return showToast("Complete ID de propuesta y Dirección del Delegador", "danger");
    }

    const tx = await daoDelegationContract.voteWithDelegation(
      safeBigIntFromInput(proposalId),
      delegatorAddr,
      inFavor
    );
    await tx.wait();
    showToast("Voto con delegación registrado", "success");
    await loadProposals();
    clearInputs(["voteWithDelegationProposalId", "delegatorAddress"]);
  } catch (e) { alertErr(e); }
});

q("btnRevokeDelegation")?.addEventListener("click", async () => {
  if (!daoDelegationContract) return showToast("Conecta tu wallet para revocar delegación", "danger");

  try {
    const proposalId = q("revokeProposalId").value.trim();
    if (!proposalId) return showToast("Ingrese ID de propuesta", "danger");

    const tx = await daoDelegationContract.revokeDelegation(safeBigIntFromInput(proposalId));
    await tx.wait();
    showToast("Delegación revocada", "success");
    clearInputs(["revokeProposalId"]);
  } catch (e) { alertErr(e); }
});

q("btnCheckDelegation")?.addEventListener("click", async () => {
  if (!daoViewsContract) return showToast("Conecta tu wallet para consultar delegación", "danger");

  try {
    const proposalId = q("checkDelegationProposalId").value.trim();
    const addr = q("checkDelegationAddress").value.trim();

    if (!proposalId || !addr) {
      return showToast("Complete todos los campos", "danger");
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
          <p><strong>Cantidad:</strong> ${formatTokens(amount)} tokens</p>
          <p><strong>Estado:</strong> ${active ? '✅ Activa' : '❌ Inactiva (ya fue usada o revocada)'}</p>
        </div>
      `;
    }

  } catch (e) { alertErr(e); }
});

document.addEventListener("DOMContentLoaded", () => {

  q("filterStatus")?.addEventListener("change", async () => {
    if (!daoViewsContract) return;

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

      console.log("Filtro seleccionado:", filter, "→ Recibidas:", proposals);

      list.innerHTML = "";

      for (const [idx, p] of proposals.entries()) {
        const id = p.id ?? idx + 1;
        const title = p.title ?? "Sin título";
        const description = p.description ?? "";
        const votesFor = formatTokens(p.votesFor) ?? "0";
        const votesAgainst = formatTokens(p.votesAgainst) ?? "0";
        const status = Number(p.status);
        const statusLabel = ["Activa", "Aprobada", "Rechazada"][status] || status;

        let delegationBadge = "";
        if (currentAccount && daoViewsContract) {
          try {
            const [delegate, amount, active] =
              await daoViewsContract.getDelegationInfo(id, currentAccount);

            if (active && delegate !== ethers.ZeroAddress) {
              delegationBadge = `<span class="delegation-badge">🤝 Delegado a ${fmtAddr(delegate)}</span>`;
            }
          } catch (e) {
            console.log("Error al verificar delegación:", e);
          }
        }

        const el = document.createElement("div");
        el.className = "card mb-3 el-propuesta shadow-sm";

        el.innerHTML = `
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h5 class="mb-1 d-flex align-items-center gap-2">
                  <b>${title}</b>
                  <span class="text-muted small">#${id}</span>
                  ${delegationBadge}
                </h5>

                <p class="mt-2 mb-0">
                  <span class="fw-bold">Descripción:</span>
                  <span class="text-muted">${description}</span>
                </p>
              </div>

              <span class="estado-propuesta bg-${status === 0 ? 'primary' : status === 1 ? 'success' : 'danger'}">
                ${statusLabel}
              </span>
            </div>

            <hr class="my-3">

            <div class="d-flex justify-content-between align-items-center flex-wrap mt-3">
              <div class="d-flex gap-4 flex-wrap">
                <div class="info-box">🟩 Votos a favor: <strong>${votesFor}</strong></div>
                <div class="info-box">🟥 Votos en contra: <strong>${votesAgainst}</strong></div>
              </div>

              <div class="d-flex gap-2 mt-2 mt-md-0">
                ${
                  status === 0
                    ? `
                    <button class="btn btn-sm btn-success" onclick="window.vote(${id}, true)">✅ A favor</button>
                    <button class="btn btn-sm btn-danger" onclick="window.vote(${id}, false)">❌ En contra</button>
                    <button class="btn btn-sm btn-secondary" onclick="window.finalizeProposal(${id})">🏁 Finalizar</button>
                    <button class="btn btn-sm btn-info" onclick="window.showDelegateModal(${id})">🤝 Delegar</button>
                  `
                    : ""
                }
              </div>
            </div>
          </div>
        `;

        list.appendChild(el);
      }
    } catch (e) {
      alertErr(e);
    }
  });

});
