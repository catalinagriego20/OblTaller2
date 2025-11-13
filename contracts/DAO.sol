// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IStaking {
    function stakeVote(address user, uint256 amount, uint256 proposalId) external;
    function stakeProposal(address user, uint256 amount, uint256 proposalId) external;
    function unstakeVote(address user, uint256 proposalId) external;
    function unstakeProposal(address user, uint256 proposalId) external;

    function voteStakeOf(address user, uint256 proposalId) external view returns (uint256);
    function proposalStakeOf(address user, uint256 proposalId) external view returns (uint256);
}

contract DAO is Ownable {
    enum VotingMode { LINEAR, QUADRATIC }

    IMintableERC20 public token;
    uint8 public tokenDecimals;
    IStaking public staking;

    address public panicWallet;
    bool public isPanicked;

    uint256 public priceWeiPerToken;
    uint256 public minStakeForVote;
    uint256 public minStakeForProposal;
    uint256 public votingPeriod;
    uint256 public tokensPerVotingPower;
    uint256 public lockTimeSeconds;
    VotingMode public votingMode = VotingMode.LINEAR;

    enum ProposalStatus { ACTIVE, ACCEPTED, REJECTED }

    struct Proposal {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        ProposalStatus status;
        mapping(address => bool) voted;
        mapping(address => bool) voteChoice;
        address[] voters;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private _proposals;

    event PanicSet(address indexed wallet);
    event PanicTriggered();
    event TranquilityRestored();
    event ParamsUpdated(
        uint256 priceWeiPerToken,
        uint256 minStakeVote,
        uint256 minStakeProposal,
        uint256 votingPeriod,
        uint256 tokensPerVP,
        uint256 lockTimeSeconds
    );
    event VotingModeToggled(VotingMode mode);
    event StakingChanged(address indexed oldStaking, address indexed newStaking);
    event TokensPurchased(address indexed buyer, uint256 weiPaid, uint256 tokensMinted);
    event ProposalCreated(uint256 indexed id, address indexed creator, string title);
    event Voted(uint256 indexed id, address indexed voter, bool inFavor, uint256 power);
    event ProposalFinalized(uint256 indexed id, ProposalStatus status);

    modifier notPanicked() {
        require(panicWallet != address(0), "Panic wallet not set");
        require(!isPanicked, "Panic mode active");
        _; 
    }

    modifier panicConfigured() {
        require(panicWallet != address(0), "Invalid panic wallet");
        _;
    }

    modifier onlyStakingSet() {
        require(address(staking) != address(0), "Invalid staking");
        _;
    }

    constructor(
        address _token,
        address _multisigOwner,
        uint256 _priceWeiPerToken,
        uint256 _minStakeVote,
        uint256 _minStakeProposal,
        uint256 _votingPeriodSeconds,
        uint256 _tokensPerVotingPower,
        uint256 _lockTimeSeconds
    ) Ownable(_multisigOwner) {
        require(_token != address(0), "Invalid token");
        require(_multisigOwner != address(0), "Invalid owner");
        require(_priceWeiPerToken > 0, "Invalid price");
        require(_tokensPerVotingPower > 0, "Invalid tokensPerVP");
        require(_votingPeriodSeconds > 0, "Invalid voting period");
        require(_votingPeriodSeconds >= _lockTimeSeconds, "Voting period cannot be less than lock time");

        token = IMintableERC20(_token);
        tokenDecimals = token.decimals();

        priceWeiPerToken = _priceWeiPerToken;
        minStakeForVote = _minStakeVote;
        minStakeForProposal = _minStakeProposal;
        votingPeriod = _votingPeriodSeconds;
        tokensPerVotingPower = _tokensPerVotingPower;
        lockTimeSeconds = _lockTimeSeconds;
    }

    // --- OWNER ACTIONS ---
    function mintTokens(uint256 amount) external onlyOwner panicConfigured notPanicked {
        token.mint(address(this), amount);
    }

    function updateParams(
        uint256 _priceWeiPerToken,
        uint256 _minStakeVote,
        uint256 _minStakeProposal,
        uint256 _votingPeriodSeconds,
        uint256 _tokensPerVotingPower,
        uint256 _lockTimeSeconds
    ) external onlyOwner panicConfigured notPanicked {
        require(_priceWeiPerToken > 0, "Invalid price");
        require(_tokensPerVotingPower > 0, "Invalid tokensPerVP");
        require(_votingPeriodSeconds > 0, "Invalid voting period");

        priceWeiPerToken = _priceWeiPerToken;
        minStakeForVote = _minStakeVote;
        minStakeForProposal = _minStakeProposal;
        votingPeriod = _votingPeriodSeconds;
        tokensPerVotingPower = _tokensPerVotingPower;
        lockTimeSeconds = _lockTimeSeconds;

        emit ParamsUpdated(
            _priceWeiPerToken,
            _minStakeVote,
            _minStakeProposal,
            _votingPeriodSeconds,
            _tokensPerVotingPower,
            _lockTimeSeconds
        );
    }

    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        transferOwnership(newOwner);
    }

    // panic wallet is set by the owner (multisig) via frontend actions (multisig tx)
    function setPanicWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid wallet");
        panicWallet = _wallet;
        emit PanicSet(_wallet);
    }

    function panic() external panicConfigured {
        require(msg.sender == panicWallet, "Only panic wallet can trigger panic");
        isPanicked = true;
        emit PanicTriggered();
    }

    function tranquility() external panicConfigured {
        require(msg.sender == panicWallet, "Only panic wallet can restore tranquility");
        isPanicked = false;
        emit TranquilityRestored();
    }

    function buyTokens() external payable notPanicked panicConfigured {
        _buyTokens(msg.sender, msg.value);
    }

    function _buyTokens(address buyer, uint256 weiAmount) internal {
        require(weiAmount > 0, "No ETH sent");
        require(priceWeiPerToken > 0, "Price not set");

        uint8 dec = tokenDecimals;
        uint256 tokensOut = (weiAmount * (10 ** uint256(dec))) / priceWeiPerToken;
        require(tokensOut > 0, "Too little ETH");

        uint256 daoBalance = token.balanceOf(address(this));
        require(daoBalance >= tokensOut, "Not enough tokens in DAO");

        emit TokensPurchased(buyer, weiAmount, tokensOut);

        token.transfer(buyer, tokensOut);
    }

    // --- STAKING LINK ---
    function setStakingAddress(address _staking) external {
        require(_staking != address(0), "Invalid staking");
        address old = address(staking);
        staking = IStaking(_staking);
        emit StakingChanged(old, _staking);
    }

    // --- PROPOSALS & VOTING ---
    function createProposal(string memory title, string memory description, uint256 stakingAmount)
        external
        notPanicked
        panicConfigured
        onlyStakingSet
    {
        require(stakingAmount >= minStakeForProposal, "Insufficient proposal stake");

        uint256 id = ++proposalCount;
        Proposal storage p = _proposals[id];
        p.id = id;
        p.creator = msg.sender;
        p.title = title;
        p.description = description;
        p.startTime = block.timestamp;
        p.status = ProposalStatus.ACTIVE;

        emit ProposalCreated(id, msg.sender, title);

        // stake in external staking contract (only callable by DAO)
        staking.stakeProposal(msg.sender, stakingAmount, id);
    }

    function _isActive(uint256 id) internal view returns (bool) {
        Proposal storage p = _proposals[id];
        if (p.status != ProposalStatus.ACTIVE) return false;
        if (block.timestamp > p.startTime + votingPeriod) return false;
        return true;
    }

    function vote(uint256 id, bool inFavor, uint256 stakingAmount)
        external
        notPanicked
        panicConfigured
        onlyStakingSet
    {
        // FIX: usar minStakeForVote (antes usaba minStakeForProposal)
        require(stakingAmount >= minStakeForVote, "Insufficient voting stake");

        Proposal storage p = _proposals[id];
        require(p.id > 0 && p.id <= proposalCount, "Invalid proposal");
        require(_isActive(id), "Not active");

        uint256 vp;
        if (votingMode == VotingMode.QUADRATIC) {
            uint256 base = stakingAmount / tokensPerVotingPower;
            vp = Math.sqrt(base);
        } else {
            vp = stakingAmount / tokensPerVotingPower;
        }
        require(vp > 0, "Zero voting power");

        p.voted[msg.sender] = true;
        p.voteChoice[msg.sender] = inFavor;
        p.voters.push(msg.sender);

        if (inFavor) p.votesFor += vp;
        else p.votesAgainst += vp;

        emit Voted(id, msg.sender, inFavor, vp);

        staking.stakeVote(msg.sender, stakingAmount, id);
    }

    function unstakeVote(uint256 proposalId) external notPanicked onlyStakingSet panicConfigured {
        Proposal storage p = _proposals[proposalId];
        require(p.voted[msg.sender], "User did not vote");

        uint256 stakeAmount = staking.voteStakeOf(msg.sender, proposalId);
        require(stakeAmount > 0, "No stake to unstake");

        uint256 vp;
        if (votingMode == VotingMode.QUADRATIC) {
            uint256 base = stakeAmount / tokensPerVotingPower;
            vp = Math.sqrt(base);
        } else {
            vp = stakeAmount / tokensPerVotingPower;
        }

        if (p.voteChoice[msg.sender]) {
            if (p.votesFor >= vp) p.votesFor -= vp;
            else p.votesFor = 0;
        } else {
            if (p.votesAgainst >= vp) p.votesAgainst -= vp;
            else p.votesAgainst = 0;
        }

        p.voted[msg.sender] = false;
        delete p.voteChoice[msg.sender];

        // remove voter
        uint256 n = p.voters.length;
        for (uint256 i = 0; i < n; i++) {
            if (p.voters[i] == msg.sender) {
                p.voters[i] = p.voters[n - 1];
                p.voters.pop();
                break;
            }
        }

        staking.unstakeVote(msg.sender, proposalId);
    }

    function unstakeProposal(uint256 proposalId) external notPanicked onlyStakingSet panicConfigured {
        staking.unstakeProposal(msg.sender, proposalId);
    }

    function finalize(uint256 id) external notPanicked panicConfigured {
        Proposal storage p = _proposals[id];
        require(p.status == ProposalStatus.ACTIVE, "Already finalized");
        require(block.timestamp > p.startTime + votingPeriod, "Voting period not ended");

        if (p.votesFor > p.votesAgainst) {
            p.status = ProposalStatus.ACCEPTED;
        } else {
            p.status = ProposalStatus.REJECTED;
        }

        emit ProposalFinalized(id, p.status);
    }

    function toggleVotingMode() external onlyOwner panicConfigured {
        votingMode = (votingMode == VotingMode.LINEAR) ? VotingMode.QUADRATIC : VotingMode.LINEAR;
        emit VotingModeToggled(votingMode);
    }

    // ----- Vistas para frontend -----
    struct VoterInfo {
        address voter;
        bool choice;
    }

    struct ProposalView {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        ProposalStatus status;
        VoterInfo[] voters;
    }

    function getAllProposals() external view returns (ProposalView[] memory) {
        ProposalView[] memory result = new ProposalView[](proposalCount);
        for (uint256 i = 1; i <= proposalCount; i++) {
            Proposal storage p = _proposals[i];
            uint256 votersCount = p.voters.length;
            VoterInfo[] memory votersInfo = new VoterInfo[](votersCount);
            for (uint256 j = 0; j < votersCount; j++) {
                address v = p.voters[j];
                votersInfo[j] = VoterInfo({voter: v, choice: p.voteChoice[v]});
            }

            result[i - 1] = ProposalView({
                id: p.id,
                creator: p.creator,
                title: p.title,
                description: p.description,
                votesFor: p.votesFor,
                votesAgainst: p.votesAgainst,
                startTime: p.startTime,
                status: p.status,
                voters: votersInfo
            });
        }
        return result;
    }

    function getProposalsByStatus(ProposalStatus status_) external view returns (ProposalView[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (_proposals[i].status == status_) count++;
        }

        ProposalView[] memory result = new ProposalView[](count);
        uint256 idx = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            Proposal storage p = _proposals[i];
            if (p.status == status_) {
                uint256 votersCount = p.voters.length;
                VoterInfo[] memory votersInfo = new VoterInfo[](votersCount);
                for (uint256 j = 0; j < votersCount; j++) {
                    address v = p.voters[j];
                    votersInfo[j] = VoterInfo({voter: v, choice: p.voteChoice[v]});
                }

                result[idx] = ProposalView({
                    id: p.id,
                    creator: p.creator,
                    title: p.title,
                    description: p.description,
                    votesFor: p.votesFor,
                    votesAgainst: p.votesAgainst,
                    startTime: p.startTime,
                    status: p.status,
                    voters: votersInfo
                });
                idx++;
            }
        }
        return result;
    }

    // ----- FUNCIONES QUE USA STAKING (IDAO) -----
    // devuelve tiempo de lock en segundos
    function lockTime() external view returns (uint256) {
        return lockTimeSeconds;
    }

    // valida que la propuesta exista (puedes extender la lógica si hace falta)
    function isValidProposal(uint256 proposalId) external view returns (bool) {
        return (proposalId > 0 && proposalId <= proposalCount);
    }

    // retorna el creador de la propuesta
    function proposalCreator(uint256 proposalId) external view returns (address) {
        Proposal storage p = _proposals[proposalId];
        return p.creator;
    }
}