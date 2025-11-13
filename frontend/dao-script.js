// ---- CONFIG ----
const DAO_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
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

// State
let provider, signer, daoContract, currentAccount;
let contractTokenDecimals = 0; // fallback

// DOM helpers
const q = id => document.getElementById(id);
const fmtAddr = a => a ? `${a.slice(0,6)}...${a.slice(-4)}` : "-";
const alertErr = e => {
  console.error(e);
  alert("Error: " + (e?.message || e));
};
const setOwnerUIVisible = (visible) => {
  // deshabilita/oculta todos los controles del owner si no es owner
  const ownerControls = [
    "btnMint","paramPrice","paramMinVote","paramMinProp","paramVotingPeriod",
    "paramTokensPerVP","paramLockTime","btnUpdateParams","newOwnerAddr","btnTransferOwner",
    "panicWalletAddr","btnSetPanicWallet","btnToggleVotingMode"
  ];
  ownerControls.forEach(id => {
    const el = q(id);
    if (!el) return;
    el.disabled = !visible;
    if (!visible) el.classList.add("opacity-50");
    else el.classList.remove("opacity-50");
  });
};

// Utility: safe BigInt parse for token amounts using decimals
function parseTokenAmountToBigInt(amountStr, decimals) {
  // amountStr can be "1.5" etc. decimals is an integer.
  if (!amountStr && amountStr !== "0") throw new Error("Amount required");
  // Use string arithmetic to avoid float issues
  const parts = amountStr.toString().split('.');
  const whole = parts[0] || "0";
  const frac = parts[1] || "";
  if (frac.length > decimals) {
    // truncate (could also round)
    const truncatedFrac = frac.slice(0, decimals);
    const combined = whole + truncatedFrac.padEnd(decimals, '0');
    return BigInt(combined);
  } else {
    const combined = whole + frac.padEnd(decimals, '0');
    return BigInt(combined);
  }
}

function safeBigIntFromInput(valueStr) {
  if (valueStr === "" || valueStr == null) return BigInt(0);
  // if contains dot -> treat as decimal ether? prefer int
  if (valueStr.includes('.')) {
    // attempt to parse as float * 1e18? Not desired here, use parseFloat then BigInt
    return BigInt(Math.floor(parseFloat(valueStr)));
  }
  return BigInt(valueStr);
}

// Connect wallet button
q("connectWalletBtn")?.addEventListener("click", async () => {
  if (!window.ethereum) return alert("Por favor instala MetaMask u otro proveedor Ethereum.");
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    currentAccount = await signer.getAddress();
    daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

    q("connectWalletBtn").textContent = `Conectado: ${fmtAddr(currentAccount)}`;
    q("connectWalletBtn").classList.replace("btn-outline-primary","btn-success");

    // read token decimals if available
    try {
      const tokenAddr = await daoContract.token();
      if (tokenAddr && tokenAddr !== ethers.ZeroAddress) {
        // create ERC20 minimal interface
        const ercAbi = [
          "function decimals() view returns (uint8)",
          "function balanceOf(address) view returns (uint256)"
        ];
        const tokenContract = new ethers.Contract(tokenAddr, ercAbi, provider);
        contractTokenDecimals = Number(await tokenContract.decimals());
      }
    } catch (e) {
      console.debug("No token decimals available or token() call failed", e);
      contractTokenDecimals = 0;
    }

    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

// Initialize UI based on contract state
async function initDAO() {
  if (!daoContract) return;
  try {
    // owner check
    let ownerAddr;
    try {
      ownerAddr = await daoContract.owner();
    } catch (e) {
      console.warn("owner() not available in contract ABI or call failed", e);
      ownerAddr = null;
    }

    const isOwner = ownerAddr ? ownerAddr.toLowerCase() === currentAccount.toLowerCase() : false;
    setOwnerUIVisible(isOwner);
    if (isOwner) {
      q("ownerMsg").textContent = `Eres el owner (${fmtAddr(ownerAddr)}).`;
    } else {
      q("ownerMsg").textContent = `No sos owner. Algunas acciones están deshabilitadas.`;
    }

    // panic wallet & panicked state (if exist)
    let panicMsg = "";
    try {
      if (typeof daoContract.panicWallet === "function") {
        const panicWalletAddr = await daoContract.panicWallet();
        if (panicWalletAddr && panicWalletAddr !== ethers.ZeroAddress) {
          panicMsg += `Panic wallet: ${fmtAddr(panicWalletAddr)}. `;
        } else {
          panicMsg += `Panic wallet no configurada. `;
        }
      }
    } catch (e) {
      console.debug("panicWallet not available", e);
    }

    try {
      if (typeof daoContract.isPanicked === "function") {
        const pan = await daoContract.isPanicked();
        if (pan) {
          panicMsg += "DAO en modo PÁNICO.";
          // disable most UI except restore
          document.querySelectorAll("button").forEach(b=>b.disabled = true);
          q("btnRestoreNormal") && (q("btnRestoreNormal").disabled = false);
        } else {
          // enable all normally (owner controls handled separately)
          document.querySelectorAll("button").forEach(b=>b.disabled = false);
          setOwnerUIVisible(isOwner);
        }
      }
    } catch (e) {
      console.debug("isPanicked not available", e);
    }

    q("panicMsg") && (q("panicMsg").textContent = panicMsg);

    // Load proposals list
    await loadProposals();
    // Update voting mode UI if available
    await updateVotingModeUI();
  } catch (e) {
    console.error("initDAO error", e);
  }
}

// ---------- OWNER ACTIONS ----------

// Mint tokens
q("btnMint")?.addEventListener("click", async () => {
  try {
    // note: your ABI has mintTokens(uint256 amount)
    const amountStr = q("mintAmount").value.trim();
    if (!amountStr) return alert("Ingresá cantidad a mintear.");
    // convert to token units using token decimals if possible
    let amountBig;
    if (contractTokenDecimals > 0) {
      amountBig = parseTokenAmountToBigInt(amountStr, contractTokenDecimals);
    } else {
      // assume whole units
      amountBig = safeBigIntFromInput(amountStr);
    }
    const tx = await daoContract.mintTokens(amountBig);
    q("ownerMsg").textContent = "⏳ Minteando tokens...";
    await tx.wait();
    q("ownerMsg").textContent = "✅ Tokens minteados.";
    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

// Update Params
q("btnUpdateParams")?.addEventListener("click", async () => {
  try {
    // ensure BigInt conversion
    const args = [
      safeBigIntFromInput(q("paramPrice").value || "0"),
      safeBigIntFromInput(q("paramMinVote").value || "0"),
      safeBigIntFromInput(q("paramMinProp").value || "0"),
      safeBigIntFromInput(q("paramVotingPeriod").value || "0"),
      safeBigIntFromInput(q("paramTokensPerVP").value || "0"),
      safeBigIntFromInput(q("paramLockTime").value || "0")
    ];
    const tx = await daoContract.updateParams(...args);
    q("ownerMsg").textContent = "Actualizando parámetros...";
    await tx.wait();
    q("ownerMsg").textContent = "✅ Parámetros actualizados";
    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

// Transfer Ownership
q("btnTransferOwner")?.addEventListener("click", async () => {
  try {
    const newOwner = q("newOwnerAddr").value.trim();
    if (!ethers.isAddress(newOwner)) return alert("Dirección inválida");
    // your contract has transferOwnership or changeOwner? try both
    if (daoContract.transferOwnership) {
      const tx = await daoContract.transferOwnership(newOwner);
      q("ownerMsg").textContent = "Transfiriendo ownership...";
      await tx.wait();
      q("ownerMsg").textContent = "✅ Ownership transferido";
    } else if (daoContract.changeOwner) {
      const tx = await daoContract.changeOwner(newOwner);
      q("ownerMsg").textContent = "Transfiriendo ownership...";
      await tx.wait();
      q("ownerMsg").textContent = "✅ Ownership transferido (changeOwner)";
    } else {
      alert("La función de transferencia de ownership no está disponible en el contrato.");
    }
    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

// Set Panic Wallet
q("btnSetPanicWallet")?.addEventListener("click", async () => {
  try {
    const addr = q("panicWalletAddr").value.trim();
    if (!ethers.isAddress(addr)) return alert("Dirección inválida");
    if (!daoContract.setPanicWallet) return alert("setPanicWallet no disponible en el contrato.");
    const tx = await daoContract.setPanicWallet(addr);
    q("ownerMsg").textContent = "Guardando wallet de pánico...";
    await tx.wait();
    q("ownerMsg").textContent = "✅ Wallet de pánico configurada";
    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

// Toggle Voting Mode (if present)
q("btnToggleVotingMode")?.addEventListener("click", async () => {
  try {
    if (!daoContract.toggleVotingMode) return alert("toggleVotingMode no disponible.");
    const tx = await daoContract.toggleVotingMode();
    q("votingModeStatus") && (q("votingModeStatus").textContent = "Cambiando modo...");
    await tx.wait();
    await updateVotingModeUI();
    q("votingModeStatus") && (q("votingModeStatus").textContent = "✅ Modo actualizado");
  } catch (e) {
    alertErr(e);
  }
});

async function updateVotingModeUI() {
  try {
    if (!daoContract.votingMode) {
      q("votingModeStatus") && (q("votingModeStatus").textContent = "");
      return;
    }
    const mode = await daoContract.votingMode();
    const text = Number(mode) === 0 ? "Lineal" : "Cuadrático";
    q("btnToggleVotingMode") && (q("btnToggleVotingMode").textContent = Number(mode) === 0 ? "Cambiar a Cuadrático" : "Cambiar a Lineal");
    q("votingModeStatus") && (q("votingModeStatus").innerHTML = `<b>Modo actual:</b> ${text}`);
  } catch (e) {
    console.debug("updateVotingModeUI:", e);
  }
}

// ---------- PROPOSALS ----------

// Create proposal
q("btnCreateProp")?.addEventListener("click", async () => {
  try {
    const title = q("propTitle").value.trim();
    const desc = q("propDesc").value.trim();
    const stakeStr = q("propStake").value.trim();
    if (!title || !stakeStr) return alert("Título y stake requeridos.");
    const stake = safeBigIntFromInput(stakeStr);
    const tx = await daoContract.createProposal(title, desc, stake);
    await tx.wait();
    alert("✅ Propuesta creada");
    await loadProposals();
  } catch (e) {
    alertErr(e);
  }
});

// Load proposals (tries getAllProposals or falls back to looping via proposalCount)
async function loadProposals() {
  try {
    let proposals = [];
    // prefer getProposalsByStatus if user filters in future; for now use getAllProposals if available
    if (daoContract.getAllProposals) {
      proposals = await daoContract.getAllProposals();
    } else if (daoContract.proposalCount) {
      const count = Number(await daoContract.proposalCount());
      for (let i = 1; i <= count; i++) {
        try {
          const p = await daoContract.getProposal(i);
          proposals.push(p);
        } catch (e) {
          // skip missing indices
        }
      }
    } else {
      console.warn("No hay forma directa de listar propuestas (no getAllProposals ni proposalCount).");
    }

    const list = q("proposalsList");
    if (!list) return;
    list.innerHTML = "";

    // proposals may be an ethers Struct array; normalize
    proposals.forEach((p, idx) => {
      // p may be { id, creator, title, description, votesFor, votesAgainst, startTime, status, voters }
      const id = p.id ?? idx+1;
      const title = p.title ?? p[2] ?? "Sin título";
      const description = p.description ?? p[3] ?? "";
      const votesFor = p.votesFor ? p.votesFor.toString() : (p[4] ? p[4].toString() : "0");
      const votesAgainst = p.votesAgainst ? p.votesAgainst.toString() : (p[5] ? p[5].toString() : "0");
      const status = typeof p.status !== "undefined" ? Number(p.status) : 0;
      const statusLabel = ["Activa","Aprobada","Rechazada"][status] || status;

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
          <button class="btn btn-sm btn-success me-1" data-id="${id}" onclick="vote(${id}, true)">Votar a favor</button>
          <button class="btn btn-sm btn-danger me-1" data-id="${id}" onclick="vote(${id}, false)">Votar en contra</button>
          <button class="btn btn-sm btn-secondary" onclick="finalizeProposal(${id})">Finalizar</button>
        </div>
      `;
      list.appendChild(el);
    });

  } catch (e) {
    console.error("loadProposals error", e);
  }
}

// Vote
async function vote(id, inFavor) {
  try {
    const amountStr = prompt("Tokens a stakear para votar:");
    if (!amountStr) return;
    const stake = safeBigIntFromInput(amountStr);
    const tx = await daoContract.vote(id, inFavor, stake);
    await tx.wait();
    alert("✅ Voto emitido");
    await loadProposals();
  } catch (e) {
    alertErr(e);
  }
}

// Finalize
async function finalizeProposal(id) {
  try {
    const tx = await daoContract.finalize(id);
    await tx.wait();
    alert("✅ Propuesta finalizada");
    await loadProposals();
  } catch (e) {
    alertErr(e);
  }
}

// ---------- TOKENS & STAKING ----------

// Buy tokens (payable)
q("btnBuy")?.addEventListener("click", async () => {
  try {
    const eth = q("buyEth").value;
    if (!eth) return alert("Ingrese cantidad en ETH");
    const value = ethers.parseEther(String(eth));
    const tx = await daoContract.buyTokens({ value });
    await tx.wait();
    alert("✅ Tokens comprados");
  } catch (e) {
    alertErr(e);
  }
});

// Unstake proposal
q("btnUnstake")?.addEventListener("click", async () => {
  try {
    const idStr = q("unstakeProposalId").value;
    if (!idStr) return alert("Ingrese ID de propuesta");
    const id = Number(idStr);
    const tx = await daoContract.unstakeProposal(id);
    await tx.wait();
    alert("✅ Tokens desbloqueados");
  } catch (e) {
    alertErr(e);
  }
});

// ---------- PANIC / TRANQUILITY ----------

q("btnActivatePanic")?.addEventListener("click", async () => {
  try {
    // use panic() or triggerPanic/whatever present
    if (daoContract.panic) {
      const tx = await daoContract.panic();
      await tx.wait();
      alert("🚨 Pánico activado");
    } else if (daoContract.triggerPanic) {
      const tx = await daoContract.triggerPanic();
      await tx.wait();
      alert("🚨 Pánico activado (triggerPanic)");
    } else {
      alert("La función de pánico no está disponible en el contrato.");
    }
    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

q("btnRestoreNormal")?.addEventListener("click", async () => {
  try {
    if (daoContract.tranquility) {
      const tx = await daoContract.tranquility();
      await tx.wait();
      alert("🕊 Tranquilidad restaurada");
    } else if (daoContract.restoreNormalOperation) {
      const tx = await daoContract.restoreNormalOperation();
      await tx.wait();
      alert("🕊 Tranquilidad restaurada (restoreNormalOperation)");
    } else {
      alert("La función para restaurar no está disponible.");
    }
    await initDAO();
  } catch (e) {
    alertErr(e);
  }
});

// ---------- Helpers on page load ----------
// ---------- Helpers on page load ----------
window.addEventListener("load", () => {
  if (window.ethereum) console.log("Ethereum provider listo");
  else console.log("No se detectó proveedor Ethereum (MetaMask).");
});
