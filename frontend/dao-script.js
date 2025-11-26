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

  alert("Error: " + reason.replace("execution reverted: ", ""));
};

// 🌟 MEJORA 1: Nueva función para vaciar un conjunto de inputs 🌟
/**
 * Vacía los valores de los inputs especificados por sus IDs.
 * @param {string[]} ids Array de IDs de inputs a vaciar.
 */
function clearInputs(ids) {
  ids.forEach(id => {
    const el = q(id);
    if (el) el.value = "";
  });
}

// --- FUNCIONES DE UTILIDAD PARA TOKENS (Decimales) ---

/**
 * Convierte unidades base (e.g., 1000000000000000000) a cantidad de tokens (e.g., "1.0")
 * USAR PARA MOSTRAR VALORES DE TOKEN AL USUARIO.
 */
const formatTokens = (baseUnits) => {
  const decimals = contractTokenDecimals || 18; // Fallback a 18
  if (!baseUnits) return "0";
  // 🌟 MEJORA 2: Usar formatUnits para el formato con decimales 🌟
  return ethers.formatUnits(baseUnits, decimals);
};

/**
 * Convierte la cantidad de tokens (e.g., "1.5") a unidades base (e.g., 1500000000000000000)
 * USAR PARA ENVIAR MONTOS DE TOKEN AL CONTRATO.
 */
const parseTokens = (amountStr) => {
  if (!amountStr || amountStr.trim() === "") return 0n;
  try {
    const decimals = contractTokenDecimals || 18; // Fallback a 18
    return ethers.parseUnits(amountStr, decimals);
  } catch (e) {
    console.error("Error al parsear cantidad de tokens:", e);
    return 0n;
  }
};

/**
 * Convierte cantidad de Ether (e.g., "0.001") a Wei (e.g., 1000000000000000)
 * USAR PARA EL PARÁMETRO priceWeiPerToken (que se espera en Wei, 18 decimales).
 */
const parseWei = (amountStr) => {
  if (!amountStr || amountStr.trim() === "") return 0n;
  try {
    // Ether siempre usa 18 decimales (Wei)
    return ethers.parseEther(amountStr);
  } catch (e) {
    console.error("Error al parsear cantidad de Wei:", e);
    return 0n;
  }
};

// --- FUNCIÓN DE UTILIDAD EXISTENTE, SOLO PARA IDs Y VALORES ENTEROS ---

function safeBigIntFromInput(v) {
  if (!v) return 0n;
  // Solo acepta enteros, útil para IDs, periodos y parámetros de configuración
  if (v.includes(".")) return BigInt(Math.floor(parseFloat(v))); 
  return BigInt(v);
}

// --- Funciones de Visibilidad y Carga de ABIs ---

const setOwnerUIVisible = visible => {
  // Lista de IDs de la UI que solo el Owner puede usar
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
        "propTitle", "propDesc", "propStake", "btnCreateProp", // Propuestas
        "delegateProposalId", "delegateAddress", "delegateAmount", "btnDelegateVote", // Delegación
        "voteWithDelegationProposalId", "delegatorAddress", "delegatedVoteChoice", "btnVoteWithDelegation", // Voto con Delegación
        "revokeProposalId", "btnRevokeDelegation", // Revocar Delegación
        "buyEth", "btnBuy", // Tokens
        "unstakeProposalId", "btnUnstake", // Unstake
        "btnActivatePanic", "btnRestoreNormal" // Pánico (requieren signer)
    ];

    ids.forEach(id => {
        const el = q(id);
        if (!el) return;
        el.disabled = !visible;
    });
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

// --- FUNCIÓN PARA MOSTRAR EL BALANCE ACTUALIZADO ---
async function loadUserBalance() {
  // Verificamos la nueva variable global del contrato ERC20
  if (!erc20TokenContract || !currentAccount) return;
  
  // 🚨 CORRECCIÓN 1: Verificamos que el elemento HTML exista antes de modificar innerText 🚨
  const userBalanceEl = q("userBalance");
  if (!userBalanceEl) return;
  
  try {
    const balance = await erc20TokenContract.balanceOf(currentAccount);
    // Uso de formatTokens()
    userBalanceEl.innerText = formatTokens(balance) + " tokens";
  } catch (e) {
    console.error("Error loading user balance:", e);
  }
}

// 🌟 MEJORA 2: Función para cargar los parámetros actuales de la DAO en los inputs y displays 🌟
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
        
        // --- PRE-CARGAR LOS INPUTS ---
        if (q("paramPrice")) q("paramPrice").value = formattedPrice;
        if (q("paramMinVote")) q("paramMinVote").value = formattedMinVote;
        if (q("paramMinProp")) q("paramMinProp").value = formattedMinProp;
        if (q("paramVotingPeriod")) q("paramVotingPeriod").value = formattedVotingPeriod;
        if (q("paramTokensPerVP")) q("paramTokensPerVP").value = formattedTokensPerVP; // <--- Usa el valor corregido
        if (q("paramLockTime")) q("paramLockTime").value = formattedLockTime;

        // --- ACTUALIZAR LOS DISPLAYS ---
        if (q("displayPrice")) q("displayPrice").innerText = formattedPrice;
        if (q("displayMinVote")) q("displayMinVote").innerText = formattedMinVote;
        if (q("displayMinProp")) q("displayMinProp").innerText = formattedMinProp;
        if (q("displayVotingPeriod")) q("displayVotingPeriod").innerText = formattedVotingPeriod;
        if (q("displayTokensPerVP")) q("displayTokensPerVP").innerText = formattedTokensPerVP; // <--- Usa el valor corregido
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

// ... (lectura de owner sin cambios)

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

// ... (lógica de Pánico sin cambios)
    let panicMsg = "";
    let isPanicked = false;
    
    try {
      const pw = await daoCoreContract.panicWallet();
      panicMsg += pw && pw !== ethers.ZeroAddress
        ? `Panic wallet: ${fmtAddr(pw)} `
        : `Panic wallet no configurada `;
    } catch {}

    try {
      isPanicked = await daoCoreContract.isPanicked();
      if (isPanicked) {
        panicMsg += " - DAO en modo PÁNICO";
        
        document.querySelectorAll("button:not(#connectWalletBtn):not(#btnCheckDelegation):not(#btnCheckStakes):not(#btnShowParams)").forEach(b => b.disabled = true);
        q("btnRestoreNormal").disabled = false;
        q("panicMsg").style.display = "block";
      } else {
        setWalletUIVisible(true); 
        setOwnerUIVisible(isOwner);
        q("panicMsg").style.display = "none";
      }
    } catch {
      q("panicMsg").style.display = "block";
    }

    if (q("panicMsg")) q("panicMsg").textContent = panicMsg;

    await loadProposals();
    await updateVotingModeUI();
    await loadUserBalance(); // Cargar balance al iniciar
    // 🌟 MEJORA 2: Cargar los parámetros actuales de la DAO al iniciar 🌟
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
      // Uso de formatTokens() para mostrar votos
      const votesFor = formatTokens(p.votesFor) ?? "0";
      const votesAgainst = formatTokens(p.votesAgainst) ?? "0";
      const status = Number(p.status);
      const statusLabel = ["Activa", "Aprobada", "Rechazada"][status] || status;

      let delegationBadge = "";
// ... (lógica de delegación sin cambios)
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
      // 🌟 MEJORA 4: Mejora el estilo visual de la lista de propuestas 🌟
      // Se ha modificado la clase para añadir más sombra y distinción, y se usó un estilo
      // mejorado para el cuerpo. (el-propuesta es una nueva clase en el CSS)
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
                <button class="btn btn-sm btn-success" onclick="window.vote(${id}, true)">✅ A favor</button>
                <button class="btn btn-sm btn-danger" onclick="window.vote(${id}, false)">❌ En contra</button>
                <button class="btn btn-sm btn-secondary" onclick="window.finalizeProposal(${id})">🏁 Finalizar</button>
                <button class="btn btn-sm btn-info" onclick="window.showDelegateModal(${id})">🤝 Delegar</button>
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
  // 1. Verificamos que existan ambos contratos (Core y el Token ERC20)
  if (!daoCoreContract || !erc20TokenContract) return alert("❌ Conecta tu wallet y asegúrate de cargar el contrato del token.");
  
  try {
    const amountStr = prompt("Tokens a stakear (ej: 1.5):"); 
    if (!amountStr) return;
    
    const stake = parseTokens(amountStr);
    if (stake === 0n) return alert("Monto de stake inválido o cero.");
    
    // --- 🔧 FIX: LÓGICA DE APROBACIÓN (IGUAL QUE EN CREATE PROPOSAL) ---
    
    // A. Obtener la dirección del contrato que guardará los tokens (Staking)
    // Es muy probable que sea el mismo address que usaste en createProposal
    const stakingAddr = await daoCoreContract.staking();
    
    if (!stakingAddr || stakingAddr === ethers.ZeroAddress) {
       return alert("❌ El contrato de Staking no está configurado correctamente.");
    }

    // B. Aprobar los tokens antes de votar
    // Nota: Es buena práctica chequear allowance primero, pero para simplificar hacemos approve directo
    const confirmApprove = confirm(`Se solicitará aprobación para usar ${amountStr} tokens. ¿Continuar?`);
    if(!confirmApprove) return;

    // Ejecutamos la transacción de aprobación
    const approveTx = await erc20TokenContract.approve(stakingAddr, stake);
    console.log("Esperando confirmación de aprobación...");
    await approveTx.wait();
    alert("✅ Aprobación exitosa. Enviando voto...");
    
    // -------------------------------------------------------------------

    // 2. Ahora sí, ejecutamos el voto
    const tx = await daoCoreContract.vote(id, inFavor, stake);
    await tx.wait();
    
    alert("✅ Voto registrado con éxito");
    await loadProposals();
    await loadUserBalance(); // Actualizamos balance para ver el descuento

  } catch (e) { 
    alertErr(e); 
  }
}

async function finalizeProposal(id) {
  if (!daoCoreContract) return alert("❌ Conecta tu wallet para finalizar");

  try {
    const tx = await daoCoreContract.finalize(id);
    await tx.wait();
    alert("Propuesta finalizada");
    await loadProposals();
    // 🌟 MEJORA 1: Limpiar los inputs 🌟
    clearInputs(["unstakeProposalId"]);
  } catch (e) { alertErr(e); }
}

function showDelegateModal(proposalId) {
// ... (sin cambios, solo precarga de inputs)
  const delegateAddr = prompt("Dirección del delegado:");
  if (!delegateAddr) return;
  
  const amount = prompt("Cantidad de tokens a delegar (ej: 5.2):"); // Pide input en tokens
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

async function delegateVoteQuick(proposalId, delegateAddress, amountStr) {
  if (!daoDelegationContract) return alert("❌ Conecta tu wallet para delegar");

  try {
    // Uso de parseTokens()
    const stake = parseTokens(amountStr);
    if (stake === 0n) return alert("Monto de delegación inválido o cero.");

    const tx = await daoDelegationContract.delegateVote(
      safeBigIntFromInput(proposalId),
      delegateAddress,
      stake
    );
    await tx.wait();
    alert("✅ Voto delegado exitosamente");
    await loadProposals();
    // 🌟 MEJORA 1: Limpiar los inputs de delegación 🌟
    clearInputs(["delegateProposalId", "delegateAddress", "delegateAmount"]);
  } catch (e) { 
    alertErr(e); 
  }
}

async function voteWithDelegation(proposalId) {
  if (!daoDelegationContract) return alert("❌ Conecta tu wallet para votar con delegación");

  const delegatorAddr = prompt("Dirección del delegador:");
  if (!delegatorAddr) return;
  
  const inFavor = confirm("¿Votar a favor? (Cancelar = En contra)");
  
  try {
    const tx = await daoDelegationContract.voteWithDelegation(proposalId, delegatorAddr, inFavor);
    await tx.wait();
    alert("Voto con delegación registrado");
    await loadProposals();
    // 🌟 MEJORA 1: Limpiar los inputs 🌟
    // voteWithDelegation() usa prompt, pero limpiar los de la UI
    clearInputs(["voteWithDelegationProposalId", "delegatorAddress"]);
  } catch (e) { alertErr(e); }
}

async function revokeDelegation(proposalId) {
  if (!daoDelegationContract) return alert("❌ Conecta tu wallet para revocar");

  try {
    const tx = await daoDelegationContract.revokeDelegation(proposalId);
    await tx.wait();
    alert("Delegación revocada");
    // 🌟 MEJORA 1: Limpiar el input de revocar delegación 🌟
    q("revokeProposalId").value = "";
  } catch (e) { alertErr(e); }
}

async function updateVotingModeUI() {
// ... (sin cambios)
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
    // Volver a cargar los parámetros para asegurar que estén frescos
    await loadDAOCurrentParams(); 
  }
  const modal = new bootstrap.Modal(q('daoParamsModal'));
  modal.show();
};


// Inicialización cuando el DOM está listo
window.addEventListener("DOMContentLoaded", async () => {
// ... (conexión de wallet e initDAO sin cambios)
  console.log("DOM listo. Cargando ABIs...");
  
  setOwnerUIVisible(false); 
  setWalletUIVisible(false); 

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

      // Inicialización de contratos
      daoCoreContract = new ethers.Contract(CONTRACTS.daoCore, DAOCoreABI, signer);
      daoDelegationContract = new ethers.Contract(CONTRACTS.daoDelegation, DAODelegationABI, signer);
      daoTokenContract = new ethers.Contract(CONTRACTS.daoToken, DAOTokenABI, signer);
      daoViewsContract = new ethers.Contract(CONTRACTS.daoViews, DAOViewsABI, provider);

      q("connectWalletBtn").textContent = `Conectado: ${fmtAddr(currentAccount)}`;
      q("connectWalletBtn").classList.replace("btn-outline-primary","btn-success");

      // OBTENER DECIMALES DEL TOKEN Y CONTRATO ERC20 PARA TRANSACCIONES
      try {
        const tokenAddr = await daoCoreContract.token();
// ... (obtención de decimales sin cambios)
        if (tokenAddr !== ethers.ZeroAddress) {
          const ercAbi = [
            "function decimals() view returns (uint8)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function balanceOf(address account) external view returns (uint256)" 
          ];
          // Inicializamos con signer y guardamos globalmente
          erc20TokenContract = new ethers.Contract(tokenAddr, ercAbi, signer); 
          
          // Guardar los decimales
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
    if (!daoCoreContract || !erc20TokenContract) return alert("❌ Conecta tu wallet y asegúrate de cargar el contrato del token ERC20.");
    
// ... (creación de propuesta sin cambios, solo se agrega clearInputs al final)
    let approveTx;
    let tx;

    try {
      const title = q("propTitle").value.trim();
      const desc = q("propDesc").value.trim();
      const stakeStr = q("propStake").value.trim();

      if (!title || !stakeStr) return alert("Título y stake requeridos.");

      const stake = parseTokens(stakeStr);
      if (stake === 0n) return alert("Monto de stake inválido o cero.");
      
      // 🔧 FIX CRÍTICO: Obtener la dirección del contrato de Staking
      const stakingAddr = await daoCoreContract.staking();
      if (!stakingAddr || stakingAddr === ethers.ZeroAddress) {
        return alert("❌ El contrato de Staking no está configurado en el DAOCore");
      }
      
      // Aprobar al contrato de STAKING (no al DAOCore)
      alert(`Aprobando ${stakeStr} tokens para el contrato de Staking...`);
      approveTx = await erc20TokenContract.approve(stakingAddr, stake);
      await approveTx.wait();
      alert("✅ Aprobación exitosa. Creando propuesta...");
      
      // Creación de la propuesta
      tx = await daoCoreContract.createProposal(title, desc, stake);
      await tx.wait();
      alert("✅ Propuesta creada");
      
      // 🌟 MEJORA 1: Limpiar campos 🌟
      clearInputs(["propTitle", "propDesc", "propStake"]);
      
      await loadProposals();
      await loadUserBalance();
    } catch (e) { 
      alertErr(e); 
    }
  });

  q("btnBuy")?.addEventListener("click", async () => {
    if (!daoTokenContract) return alert("❌ Conecta tu wallet para comprar tokens");

    try {
      const eth = q("buyEth").value;
      if (!eth) return alert("Ingrese ETH");
      const value = ethers.parseEther(eth); // ETH se mantiene en wei/ether
      
      const tx = await daoTokenContract.buyTokens({ value });
      await tx.wait();
      alert("✅ Tokens comprados");
      await loadUserBalance(); // Actualizar balance
      // 🌟 MEJORA 1: Limpiar campos 🌟
      clearInputs(["buyEth"]);
    } catch (e) { alertErr(e); }
  });

  q("btnActivatePanic")?.addEventListener("click", async () => {
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para activar pánico");

    try {
      const tx = await daoCoreContract.panic();
      await tx.wait();
      alert("🚨 PÁNICO ACTIVADO");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnRestoreNormal")?.addEventListener("click", async () => {
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para restaurar");

    try {
      const tx = await daoCoreContract.tranquility();
      await tx.wait();
      alert("🕊 Tranquilidad restaurada");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnMint")?.addEventListener("click", async () => {
    if (!daoTokenContract) return alert("❌ Conecta tu wallet para mintear");

    try {
      const amountStr = q("mintAmount").value; // Input en tokens
      if (!amountStr) return alert("Ingrese amount");

      // Uso de parseTokens()
      const amount = parseTokens(amountStr);
      if (amount === 0n) return alert("Monto inválido o cero.");

      const tx = await daoTokenContract.mintTokens(amount);
      await tx.wait();

      alert(`✅ Tokens minteados: ${amountStr} tokens`);
      await loadUserBalance(); // Actualizar balance
      // 🌟 MEJORA 1: Limpiar campos 🌟
      clearInputs(["mintAmount"]);
    } catch (e) { alertErr(e); }
  });

  q("btnCheckStakes")?.addEventListener("click", async () => {
// ... (consulta de stakes sin cambios)
    if (!daoViewsContract) return alert("❌ Conecta tu wallet para consultar staking");

    try {
      const addr = q("addrToCheck").value.trim();
      if (!addr) return alert("Ingrese una dirección");

      const balance = await daoViewsContract.getUserTokenBalance(addr);
      const staking = await daoViewsContract.getUserStaking(addr);

      // Uso de formatTokens()
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
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para actualizar parámetros");

    try {
// ... (obtención de valores sin cambios)
      const price = q("paramPrice").value.trim(); // Price in ETH (e.g., "0.001")
      const minVote = q("paramMinVote").value.trim(); // Tokens (e.g., "10.5")
      const minProp = q("paramMinProp").value.trim(); // Tokens (e.g., "1.0")
      const votingPeriod = q("paramVotingPeriod").value.trim(); // Integer (e.g., "3600")
      const tokensPerVP = q("paramTokensPerVP").value.trim(); // Tokens (e.g., "1.0")
      const lockTime = q("paramLockTime").value.trim(); // Integer (e.g., "86400")

      if (!price || !minVote || !minProp || !votingPeriod || !tokensPerVP || !lockTime) {
        return alert("Complete todos los campos de parámetros");
      }

      // 🚨 CORRECCIÓN CLAVE: Usar las funciones de conversión adecuadas (parseWei/parseTokens)
      const tx = await daoCoreContract.updateParams(
        parseWei(price), // FIX: Price (ETH decimal -> Wei BigInt, 18 decimals)
        parseTokens(minVote), // FIX: MinVote (Token decimal -> Token Base Unit BigInt)
        parseTokens(minProp), // FIX: MinProp (Token decimal -> Token Base Unit BigInt)
        safeBigIntFromInput(votingPeriod), // OK: Integer (ID/time)
        parseTokens(tokensPerVP), // FIX: TokensPerVP (Token decimal -> Token Base Unit BigInt)
        safeBigIntFromInput(lockTime) // OK: Integer (ID/time)
      );
      await tx.wait();
      alert("✅ Parámetros actualizados. Por favor, asegúrate de configurar el precio correctamente (ej: 0.001 para 0.001 ETH por token).");
      // 🌟 MEJORA 1 y 2: Recargar los parámetros en la UI 🌟
      await loadDAOCurrentParams();
    } catch (e) { alertErr(e); }
  });

  q("btnTransferOwner")?.addEventListener("click", async () => {
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para transferir ownership");

    try {
      const newOwner = q("newOwnerAddr").value.trim();
      if (!newOwner) return alert("Ingrese una dirección");

      const tx = await daoCoreContract.changeOwner(newOwner);
      await tx.wait();
      alert("Ownership transferido");
      await initDAO();
      // 🌟 MEJORA 1: Limpiar campos 🌟
      clearInputs(["newOwnerAddr"]);
    } catch (e) { alertErr(e); }
  });

  q("btnSetPanicWallet")?.addEventListener("click", async () => {
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para configurar Panic Wallet");

    try {
      const wallet = q("panicWalletAddr").value.trim();
      if (!wallet) return alert("Ingrese una dirección");

      const tx = await daoCoreContract.setPanicWallet(wallet);
      await tx.wait();
      alert("Panic wallet configurada");
      await initDAO();
      // 🌟 MEJORA 1: Limpiar campos 🌟
      clearInputs(["panicWalletAddr"]);
    } catch (e) { alertErr(e); }
  });

  q("btnUnstake")?.addEventListener("click", async () => {
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para quitar stake");

    try {
      const proposalId = q("unstakeProposalId").value.trim();
      if (!proposalId) return alert("Ingrese un ID de propuesta");

      const tx = await daoCoreContract.unstakeProposal(safeBigIntFromInput(proposalId));
      await tx.wait();
      alert("Tokens desbloqueados de la propuesta");
      await loadUserBalance(); // Actualizar balance
      // 🌟 MEJORA 1: Limpiar campos 🌟
      clearInputs(["unstakeProposalId"]);
    } catch (e) { alertErr(e); }
  });

  q("btnUnstakeVote")?.addEventListener("click", async () => {
      if (!daoCoreContract) return alert("❌ Conecta tu wallet para quitar stake");

      try {
        const proposalId = q("unstakeProposalId").value.trim();
        if (!proposalId) return alert("Ingrese un ID de propuesta");

        const tx = await daoCoreContract.unstakeVote(safeBigIntFromInput(proposalId));
        await tx.wait();
        alert("Tokens desbloqueados de la propuesta");
        await loadUserBalance(); // Actualizar balance
        // 🌟 MEJORA 1: Limpiar campos 🌟
        clearInputs(["unstakeProposalId"]);
      } catch (e) { alertErr(e); }
    });

  q("btnToggleVotingMode")?.addEventListener("click", async () => {
    if (!daoCoreContract) return alert("❌ Conecta tu wallet para cambiar el modo de votación");

    try {
      const tx = await daoCoreContract.toggleVotingMode();
      await tx.wait();
      alert("Modo de votación cambiado");
      await updateVotingModeUI();
    } catch (e) { alertErr(e); }
  });

  q("btnDelegateVote")?.addEventListener("click", async () => {
// ... (lógica de delegar voto sin cambios, solo llama a delegateVoteQuick que limpia)
    if (!daoDelegationContract) return alert("❌ Conecta tu wallet para delegar voto");

    try {
      const proposalId = q("delegateProposalId").value.trim();
      const delegateAddress = q("delegateAddress").value.trim();
      const amountStr = q("delegateAmount").value.trim();

      if (!proposalId || !delegateAddress || !amountStr) return alert("Complete todos los campos de delegación.");

      await delegateVoteQuick(proposalId, delegateAddress, amountStr);
    } catch (e) { alertErr(e); }
  });

// Funciones expuestas globalmente para el HTML (aunque vote ya está arriba)
window.delegateVoteQuick = delegateVoteQuick;
window.voteWithDelegation = voteWithDelegation;
window.revokeDelegation = revokeDelegation;

});