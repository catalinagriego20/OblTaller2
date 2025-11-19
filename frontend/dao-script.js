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
          "name": "delegation",
          "type": "address"
        }
      ],
      "name": "DelegationContractSet",
      "type": "event"
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
          "internalType": "enum DAOCore.ProposalStatus",
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
          "name": "tokenContract",
          "type": "address"
        }
      ],
      "name": "TokenContractSet",
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
          "internalType": "enum DAOCore.VotingMode",
          "name": "mode",
          "type": "uint8"
        }
      ],
      "name": "VotingModeToggled",
      "type": "event"
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
      "inputs": [],
      "name": "daoToken",
      "outputs": [
        {
          "internalType": "contract IDAOToken",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "delegation",
      "outputs": [
        {
          "internalType": "contract IDAODelegation",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
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
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "getProposal",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
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
          "internalType": "enum DAOCore.ProposalStatus",
          "name": "status",
          "type": "uint8"
        },
        {
          "internalType": "address[]",
          "name": "voters",
          "type": "address[]"
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
        },
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "getVoteChoice",
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
        },
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        }
      ],
      "name": "hasVoted",
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
          "name": "id",
          "type": "uint256"
        }
      ],
      "name": "isActive",
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
      "inputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "inFavor",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "votingPower",
          "type": "uint256"
        }
      ],
      "name": "recordDelegatedVote",
      "outputs": [],
      "stateMutability": "nonpayable",
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
          "name": "_delegation",
          "type": "address"
        }
      ],
      "name": "setDelegationContract",
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
      "inputs": [
        {
          "internalType": "address",
          "name": "_tokenContract",
          "type": "address"
        }
      ],
      "name": "setTokenContract",
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
          "internalType": "enum DAOCore.VotingMode",
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

const SimpleMultiSigABI = [
    {
      "inputs": [
        {
          "internalType": "address[]",
          "name": "owners_",
          "type": "address[]"
        },
        {
          "internalType": "uint8",
          "name": "required_",
          "type": "uint8"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "txnId",
          "type": "uint256"
        }
      ],
      "name": "AlreadyExecuted",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "txnId",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "ExecutionFailed",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidRequiredConfirmations",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "txnId",
          "type": "uint256"
        }
      ],
      "name": "InvalidTransaction",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotAnOwner",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotEnoughConfirmations",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "OwnersRequired",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "txId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "TransactionConfirmed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "txId",
          "type": "uint256"
        }
      ],
      "name": "TransactionExecuted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "txId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "data",
          "type": "bytes"
        }
      ],
      "name": "TransactionSubmitted",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "_requiredConfirmations",
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
      "inputs": [
        {
          "internalType": "uint256",
          "name": "txnId_",
          "type": "uint256"
        }
      ],
      "name": "confirmTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "txnId_",
          "type": "uint256"
        }
      ],
      "name": "confirmations",
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
      "inputs": [
        {
          "internalType": "uint256",
          "name": "txnId_",
          "type": "uint256"
        }
      ],
      "name": "executeTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owners",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to_",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value_",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "data_",
          "type": "bytes"
        }
      ],
      "name": "submitTransaction",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "transactionCount",
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
      "stateMutability": "payable",
      "type": "receive"
    }
  ];

let provider, signer, daoContract, currentAccount;
let contractTokenDecimals = 0;

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

async function initDAO() {
  if (!daoContract) return;

  try {
    let multisigAddr = null;
    try {
      multisigAddr = await daoContract.owner();
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

    if (q("panicMsg")) q("panicMsg").textContent = panicMsg;

    await loadProposals();
    await updateVotingModeUI();

  } catch (e) {
    console.error("initDAO error:", e);
  }
}

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



window.addEventListener("DOMContentLoaded", () => {

  console.log("DOM listo. Inicializando listeners…");

  q("connectWalletBtn")?.addEventListener("click", async () => {
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      currentAccount = await signer.getAddress();

      daoContract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

      q("connectWalletBtn").textContent = `Conectado: ${fmtAddr(currentAccount)}`;
      q("connectWalletBtn").classList.replace("btn-outline-primary","btn-success");

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

  q("btnMint")?.addEventListener("click", async () => {
    try {
      const amount = q("mintAmount").value;
      if (!amount) return alert("Ingrese amount");

      const tx = await daoContract.mintTokens(amount);
      await tx.wait();

      alert("Tokens minteados");
    } catch (e) { alertErr(e); }
  });

  q("btnCheckStakes")?.addEventListener("click", async () => {
    try {
      const addr = q("addrToCheck").value.trim();
      if (!addr) return alert("Ingrese una dirección");

      const balance = await daoContract.getUserTokenBalance(addr);
      const staking = await daoContract.getUserStaking(addr);

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

  q("btnCheckStakes")?.addEventListener("click", async () => {
    try {
      const addr = q("addrToCheck").value.trim();
      if (!addr) return alert("Ingrese una dirección");

      const balance = await daoContract.getUserTokenBalance(addr);
      const staking = await daoContract.getUserStaking(addr);

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

      const tx = await daoContract.updateParams(
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

      const tx = await daoContract.transferOwnership(newOwner);
      await tx.wait();
      alert("Ownership transferido");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnSetPanicWallet")?.addEventListener("click", async () => {
    try {
      const wallet = q("panicWalletAddr").value.trim();
      if (!wallet) return alert("Ingrese una dirección");

      const tx = await daoContract.setPanicWallet(wallet);
      await tx.wait();
      alert("Panic wallet configurada");
      await initDAO();
    } catch (e) { alertErr(e); }
  });

  q("btnUnstake")?.addEventListener("click", async () => {
    try {
      const proposalId = q("unstakeProposalId").value.trim();
      if (!proposalId) return alert("Ingrese un ID de propuesta");

      const tx = await daoContract.unstakeProposal(safeBigIntFromInput(proposalId));
      await tx.wait();
      alert("Tokens desbloqueados de la propuesta");
    } catch (e) { alertErr(e); }
  });

  q("filterStatus")?.addEventListener("change", async () => {
    try {
      const filter = q("filterStatus").value;
      const list = q("proposalsList");
      if (!list) return;

      let proposals;
      if (filter === "ALL") {
        proposals = await daoContract.getAllProposals();
      } else {
        const statusMap = { "ACTIVE": 0, "ACCEPTED": 1, "REJECTED": 2 };
        proposals = await daoContract.getProposalsByStatus(statusMap[filter]);
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
            <button class="btn btn-sm btn-success me-1" onclick="vote(${id}, true)">Votar a favor</button>
            <button class="btn btn-sm btn-danger me-1" onclick="vote(${id}, false)">Votar en contra</button>
            <button class="btn btn-sm btn-secondary" onclick="finalizeProposal(${id})">Finalizar</button>
          </div>
        `;
        list.appendChild(el);
      });

    } catch (e) {
      console.error("Error filtering proposals", e);
    }
  });
});