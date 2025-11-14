// ---- CONFIG ----
const DAO_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
const DAO_ABI = [ 
  {
      "inputs": [
        {
          "internalType": "address",
          "name": "_token",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_multisigOwner",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_priceWeiPerToken",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_minStakeVote",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_minStakeProposal",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_votingPeriodSeconds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_tokensPerVotingPower",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_lockTimeSeconds",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "wallet",
          "type": "address"
        }
      ],
      "name": "PanicSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "PanicTriggered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "priceWeiPerToken",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "minStakeVote",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "minStakeProposal",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "votingPeriod",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokensPerVP",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "lockTimeSeconds",
          "type": "uint256"
        }
      ],
      "name": "ParamsUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "title",
          "type": "string"
        }
      ],
      "name": "ProposalCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum DAO.ProposalStatus",
          "name": "status",
          "type": "uint8"
        }
      ],
      "name": "ProposalFinalized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldStaking",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newStaking",
          "type": "address"
        }
      ],
      "name": "StakingChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "buyer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "weiPaid",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokensMinted",
          "type": "uint256"
        }
      ],
      "name": "TokensPurchased",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [],
      "name": "TranquilityRestored",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "inFavor",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "power",
          "type": "uint256"
        }
      ],
      "name": "Voted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "enum DAO.VotingMode",
          "name": "mode",
          "type": "uint8"
        }
      ],
      "name": "VotingModeToggled",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "buyTokens",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "changeOwner",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "title",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "stakingAmount",
          "type": "uint256"
        }
      ],
      "name": "createProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "finalize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAllProposals",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "creator",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "title",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "votesFor",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "votesAgainst",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "enum DAO.ProposalStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "voter",
                  "type": "address"
                },
                {
                  "internalType": "bool",
                  "name": "choice",
                  "type": "bool"
                }
              ],
              "internalType": "struct DAO.VoterInfo[]",
              "name": "voters",
              "type": "tuple[]"
            }
          ],
          "internalType": "struct DAO.ProposalView[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "enum DAO.ProposalStatus",
          "name": "status_",
          "type": "uint8"
        }
      ],
      "name": "getProposalsByStatus",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "creator",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "title",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "description",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "votesFor",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "votesAgainst",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startTime",
              "type": "uint256"
            },
            {
              "internalType": "enum DAO.ProposalStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "components": [
                {
                  "internalType": "address",
                  "name": "voter",
                  "type": "address"
                },
                {
                  "internalType": "bool",
                  "name": "choice",
                  "type": "bool"
                }
              ],
              "internalType": "struct DAO.VoterInfo[]",
              "name": "voters",
              "type": "tuple[]"
            }
          ],
          "internalType": "struct DAO.ProposalView[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isPanicked",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        }
      ],
      "name": "isValidProposal",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "lockTime",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "lockTimeSeconds",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "minStakeForProposal",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "minStakeForVote",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mintTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "panic",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "panicWallet",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "priceWeiPerToken",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "proposalCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        }
      ],
      "name": "proposalCreator",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_wallet",
          "type": "address"
        }
      ],
      "name": "setPanicWallet",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_staking",
          "type": "address"
        }
      ],
      "name": "setStakingAddress",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "staking",
      "outputs": [
        {
          "internalType": "contract IStaking",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "toggleVotingMode",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "token",
      "outputs": [
        {
          "internalType": "contract IMintableERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "tokenDecimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "tokensPerVotingPower",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "tranquility",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        }
      ],
      "name": "unstakeProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        }
      ],
      "name": "unstakeVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_priceWeiPerToken",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_minStakeVote",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_minStakeProposal",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_votingPeriodSeconds",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_tokensPerVotingPower",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_lockTimeSeconds",
          "type": "uint256"
        }
      ],
      "name": "updateParams",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "inFavor",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "stakingAmount",
          "type": "uint256"
        }
      ],
      "name": "vote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "votingMode",
      "outputs": [
        {
          "internalType": "enum DAO.VotingMode",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "votingPeriod",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
];

// ---------------------- STATE ----------------------
let provider, signer, daoContract, currentAccount;
let contractTokenDecimals = 0;

// ---------------------- DOM HELPERS ----------------------
const q = id => document.getElementById(id);
const fmtAddr = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "-";
const alertErr = e => {
  console.error(e);
  alert("Error: " + (e?.message || e));
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

// ---------------------- SAFE PARSING ----------------------
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

// ---------------------- DAO INITIALIZATION ----------------------
async function initDAO() {
  if (!daoContract) return;

  try {
    let ownerAddr = null;
    try {
      ownerAddr = await daoContract.owner();
    } catch(e) {
      console.warn("No owner() available?", e);
    }

    const isOwner = ownerAddr && currentAccount &&
                    ownerAddr.toLowerCase() === currentAccount.toLowerCase();

    setOwnerUIVisible(isOwner);
    if (isOwner) q("ownerMsg").textContent = `Eres el owner (${fmtAddr(ownerAddr)})`;
    else q("ownerMsg").textContent = `No sos owner. Algunas acciones están deshabilitadas.`;

    // Panic state
    let panicMsg = "";
    try {
      const pw = await daoContract.panicWallet();
      panicMsg += pw && pw !== ethers.ZeroAddress
        ? `Panic wallet: ${fmtAddr(pw)} `
        : `Panic wallet no configurada `;
    } catch {}

    try {
      const pan = await daoContract.isPanicked();
      if (pan) {
        panicMsg += " - DAO en modo PÁNICO";
        document.querySelectorAll("button").forEach(b => b.disabled = true);
        q("btnRestoreNormal").disabled = false;
      } else {
        document.querySelectorAll("button").forEach(b => b.disabled = false);
        setOwnerUIVisible(isOwner);
      }
    } catch {}

    if(q("panicMsg")) q("panicMsg").textContent = panicMsg;

    await loadProposals();
    await updateVotingModeUI();

  } catch (e) {
    console.error("initDAO error:", e);
  }
}

// ---------------------- LOAD PROPOSALS ----------------------
async function loadProposals() {
  try {
    const proposals = await daoContract.getAllProposals();

    const list = q("proposalsList");
    if (!list) return;
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
          <button class="btn btn-sm btn-success me-1" onclick="vote(${id}, true)">Votar a favor</button>
          <button class="btn btn-sm btn-danger me-1" onclick="vote(${id}, false)">Votar en contra</button>
          <button class="btn btn-sm btn-secondary" onclick="finalizeProposal(${id})">Finalizar</button>
        </div>
      `;
      list.appendChild(el);
    });

  } catch (e) {
    console.error("loadProposals error", e);
  }
}

// ---------------------- ACTIONS ----------------------
async function vote(id, inFavor) {
  try {
    const amount = prompt("Tokens a stakear:");
    if (!amount) return;
    const stake = safeBigIntFromInput(amount);
    const tx = await daoContract.vote(id, inFavor, stake);
    await tx.wait();
    alert("Voto registrado");
    await loadProposals();
  } catch (e) { alertErr(e); }
}

async function finalizeProposal(id) {
  try {
    const tx = await daoContract.finalize(id);
    await tx.wait();
    alert("Propuesta finalizada");
    await loadProposals();
  } catch (e) { alertErr(e); }
}

// ---------------------- VOTING MODE ----------------------
async function updateVotingModeUI() {
  try {
    const mode = await daoContract.votingMode();
    const text = Number(mode) === 0 ? "Lineal" : "Cuadrático";
    q("votingModeStatus").innerHTML = `<b>Modo actual:</b> ${text}`;
    q("btnToggleVotingMode").textContent = Number(mode) === 0
      ? "Cambiar a Cuadrático"
      : "Cambiar a Lineal";
  } catch {}
}

// ---------------------- PAGE INITIALIZATION ----------------------
window.addEventListener("DOMContentLoaded", () => {

  console.log("DOM listo. Inicializando listeners…");

  // CONNECT WALLET
  q("connectWalletBtn")?.addEventListener("click", async () => {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      currentAccount = await signer.getAddress();

      daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

      q("connectWalletBtn").textContent = `Conectado: ${fmtAddr(currentAccount)}`;
      q("connectWalletBtn").classList.replace("btn-outline-primary","btn-success");

      // token decimals
      try {
        const tokenAddr = await daoContract.token();
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

  // CREATE PROPOSAL
  q("btnCreateProp")?.addEventListener("click", async () => {
    try {
      const title = q("propTitle").value.trim();
      const desc = q("propDesc").value.trim();
      const stakeStr = q("propStake").value.trim();

      if (!title || !stakeStr) return alert("Título y stake requeridos.");

      const stake = safeBigIntFromInput(stakeStr);
      const tx = await daoContract.createProposal(title, desc, stake);
      await tx.wait();
      alert("Propuesta creada");
      await loadProposals();
    } catch (e) { alertErr(e); }
  });

  // BUY TOKENS
  q("btnBuy")?.addEventListener("click", async () => {
    try {
      const eth = q("buyEth").value;
      if (!eth) return alert("Ingrese ETH");
      const value = ethers.parseEther(eth);
      const tx = await daoContract.buyTokens({ value });
      await tx.wait();
      alert("Tokens comprados");
    } catch (e) { alertErr(e); }
  });

  // PANIC
  q("btnActivatePanic")?.addEventListener("click", async () => {
    try {
      const tx = await daoContract.panic();
      await tx.wait();
      alert("PÁNICO ACTIVADO");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnRestoreNormal")?.addEventListener("click", async () => {
    try {
      const tx = await daoContract.tranquility();
      await tx.wait();
      alert("Tranquilidad restaurada");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

});
