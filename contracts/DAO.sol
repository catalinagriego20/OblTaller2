// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/MathUtils.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);
}

interface IStakingView {
    function stakeVote(uint256 amount, uint256 proposalId) external view returns (uint256);
    function stakeProposal(uint256 amount, uint256 proposalId) external view returns (uint256);
    function voteStakeOf(address user, uint256 proposalId) external view returns (uint256);
    function proposalStakeOf(address user, uint256 proposalId) external view returns (uint256);
}

contract DAO is Ownable {
    using MathUtils for uint256;
    enum ProposalStatus { ACTIVE, ACCEPTED, REJECTED }
    
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        ProposalStatus status;
        mapping(address => bool) voted;
        address[] voters;
        mapping(address => bool) voteChoice;
    }

    IMintableERC20 public token;
    uint8 public tokenDecimals;      // cacheo de decimals para evitar llamadas externas en checks
    address public staking; // IStakingView compatible

    address public panicWallet;
    bool public isPanicked;

    uint256 public priceWeiPerToken;
    uint256 public minStakeForVote;
    uint256 public minStakeForProposal;
    uint256 public votingPeriod;
    uint256 public tokensPerVotingPower;
    uint256 public lockTimeSeconds;

    bool public quadraticVotingEnabled;

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
    event QuadraticVotingToggled(bool enabled);

    event StakingChanged(address indexed oldStaking, address indexed newStaking);
    event TokenChanged(address indexed oldToken, address indexed newToken);

    event TokensPurchased(address indexed buyer, uint256 weiPaid, uint256 tokensMinted);

    event ProposalCreated(uint256 indexed id, address indexed creator, string title);
    event Voted(uint256 indexed id, address indexed voter, bool inFavor, uint256 power);
    event ProposalFinalized(uint256 indexed id, ProposalStatus status);

    modifier notPanicked() {
        require(!isPanicked, "Panic mode active");
        _;
    }

    modifier panicConfigured() {
        require(panicWallet != address(0), "Invalid panic wallet");
        _;
    }

    modifier onlyStakingSet() {
        require(staking != address(0), "Invalid staking");
        _;
    }

    constructor(
        address _token,
        address _staking,
        address _multisigOwner,
        uint256 _priceWeiPerToken,
        uint256 _minStakeVote,
        uint256 _minStakeProposal,
        uint256 _votingPeriodSeconds,
        uint256 _tokensPerVotingPower,
        uint256 _lockTimeSeconds
    ) {
        require(_token != address(0), "Invalid token");
        require(_multisigOwner != address(0), "Invalid owner");
        require(_priceWeiPerToken > 0, "Invalid price");
        require(_tokensPerVotingPower > 0, "Invalid tokensPerVP");
        require(_lockTimeSeconds >= 0, "Invalid lock time");
        require(_minStakeVote >= 0, "Invalid min stake vote");
        require(_minStakeProposal >= 0, "Invalid min stake proposal");
        require(_votingPeriodSeconds > 0, "Invalid voting period");

        token = IMintableERC20(_token);
        tokenDecimals = token.decimals();

        staking = _staking;

        _transferOwnership(_multisigOwner);

        priceWeiPerToken = _priceWeiPerToken;
        minStakeForVote = _minStakeVote;
        minStakeForProposal = _minStakeProposal;
        votingPeriod = _votingPeriodSeconds;
        tokensPerVotingPower = _tokensPerVotingPower;
        lockTimeSeconds = _lockTimeSeconds;
    }

    function lockTime() external view returns (uint256) {
        return lockTimeSeconds;
    }

    function setPanicWallet(address _wallet) external onlyOwner {
        panicWallet = _wallet;
        emit PanicSet(_wallet);
    }

    function setParams(
        uint256 _priceWeiPerToken,
        uint256 _minStakeVote,
        uint256 _minStakeProposal,
        uint256 _votingPeriodSeconds,
        uint256 _tokensPerVotingPower,
        uint256 _lockTimeSeconds
    ) external onlyOwner {
        require(_priceWeiPerToken > 0, "Invalid price");
        require(_tokensPerVotingPower > 0, "Invalid tokensPerVP");
        require(_minStakeVote >= 0, "Invalid min stake vote");
        require(_minStakeProposal >= 0, "Invalid min stake proposal");
        require(_votingPeriodSeconds > 0, "Invalid voting period");
        require(_lockTimeSeconds >= 0, "Invalid lock time");

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

    function toggleQuadraticVoting(bool enable) external onlyOwner {
        quadraticVotingEnabled = enable;
        emit QuadraticVotingToggled(enable);
    }

    function setStaking(address newStaking) external onlyOwner {
        require(newStaking != address(0), "Invalid staking");
        address old = staking;
        staking = newStaking;
        emit StakingChanged(old, newStaking);
    }

    function setToken(address newToken) external onlyOwner {
        require(newToken != address(0), "Invalid token");
        address old = address(token);
        token = IMintableERC20(newToken);
        tokenDecimals = token.decimals();
        emit TokenChanged(old, newToken);
    }

    function panic() external panicConfigured {
        require(msg.sender == panicWallet, "Only panic wallet can trigger panic");
        isPanicked = true;
        emit PanicTriggered(msg.sender);
    }

    function tranquility() external panicConfigured {
        require(msg.sender == panicWallet, "Only panic wallet can restore tranquility");
        isPanicked = false;
        emit TranquilityRestored(msg.sender);
    }

    function buyTokens() external payable notPanicked panicConfigured {
        _buyTokens(msg.sender, msg.value);
    }

    function _buyTokens(address buyer, uint256 weiAmount) internal {
        // Checks
        require(weiAmount > 0, "No ETH sent");
        require(priceWeiPerToken > 0, "Price not set");
    
        uint8 dec = tokenDecimals;
        uint256 tokensOut = (weiAmount * (10 ** uint256(dec))) / priceWeiPerToken;
        require(tokensOut > 0, "Too little ETH");

        // Effects
        emit TokensPurchased(buyer, weiAmount, tokensOut);

        // Interaction
        token.mint(buyer, tokensOut);
    }

    function createProposal(string memory title, string memory description, uint256 stakingAmount)
        external
        notPanicked
        panicConfigured
        onlyStakingSet
    {
        // Checks
        require(stakingAmount >= minStakeForProposal, "Insufficient proposal stake");
        require(stakingAmount > 0, "Invalid staking amount");

        // Effects
        uint256 id = ++proposalCount;

        Proposal storage p = _proposals[id];
        p.id = id;
        p.creator = msg.sender;
        p.title = title;
        p.description = description;
        p.startTime = block.timestamp;
        p.status = ProposalStatus.ACTIVE;

        emit ProposalCreated(id, msg.sender, title);

        // Interactions
        IStaking(staking).stakeProposal(msg.sender, stakingAmount, id);
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
        require(stakingAmount >= minStakeForProposal, "Insufficient voting stake");
        require(stakingAmount > 0, "Invalid staking amount");

        Proposal storage p = _proposals[id];
        require(p.id > 0 && p.id <= proposalCount, "Invalid proposal");
        require(_isActive(id), "Not active");

        uint256 vp;
        if (quadraticVotingEnabled) {
            uint256 base = stakingAmount / tokensPerVotingPower;
            vp = base.isqrt();
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
        
        IStaking(staking).stakeVote(msg.sender, stakingAmount, id);
    }

    function finalize(uint256 id) external notPanicked panicConfigured {
        Proposal storage p = _proposals[id];
        require(p.id > 0 && p.id <= proposalCount, "Invalid proposal");
        require(p.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp > p.startTime + votingPeriod, "Voting period not ended");

        // Effects
        if (p.votesFor > p.votesAgainst) {
            p.status = ProposalStatus.ACCEPTED;
        } else {
            p.status = ProposalStatus.REJECTED;
        }

        emit ProposalFinalized(id, p.status);
    }

    function isValidProposal(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        return (p.exists && p.creator == msg.sender && !p.closed);
    }

    function isValidVote(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        return (p.exists && p.active && !p.closed);
    }

    // Gets para frontend
    function getProposal(uint256 id)
        external
        view
        returns (
            uint256 proposalId,
            address creator,
            string memory title,
            string memory description,
            uint256 votesFor,
            uint256 votesAgainst,
            uint256 startTime,
            ProposalStatus status
        )
    {
        Proposal storage p = _proposals[id];
        require(p.id > 0 && p.id <= proposalCount, "Invalid proposal");
        return (p.id, p.creator, p.title, p.description, p.votesFor, p.votesAgainst, p.startTime, p.status);
    }

    function getProposalVoters(uint256 id)
        external
        view
        returns (address[] memory voters, bool[] memory inFavor)
    {
        Proposal storage p = _proposals[id];
        require(p.id > 0 && p.id <= proposalCount, "Invalid proposal");
        uint256 n = p.voters.length;
        voters = new address[](n);
        inFavor = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            address v = p.voters[i];
            voters[i] = v;
            inFavor[i] = p.voteChoice[v];
        }
    }

    function proposalsByStatus(ProposalStatus status_, uint256 fromId, uint256 toId)
        external
        view
        returns (uint256[] memory)
    {
        if (toId == 0 || toId > proposalCount) toId = proposalCount;
        require(fromId >= 1 && fromId <= toId, "Invalid range");

        uint256 count;
        for (uint256 i = fromId; i <= toId; i++) {
            Proposal storage p = _proposals[i];
            if (p.id != 0 && p.status == status_) count++;
        }

        uint256[] memory ids = new uint256[](count);
        uint256 k;
        for (uint256 i = fromId; i <= toId; i++) {
            Proposal storage p = _proposals[i];
            if (p.id != 0 && p.status == status_) {
                ids[k++] = i;
            }
        }
        return ids;
    }
}
