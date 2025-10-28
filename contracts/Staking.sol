// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDAO {
    function lockTime() external view returns (uint256);
    function isValidProposal(uint256 proposalId) external view returns (bool);
}

contract Staking {
    IERC20 public immutable token;
    address public dao;

    struct StakeInfo {
        uint256 amount;
        uint256 unlockAt;
        bool exists;
    }

    // Mapeos separados para votos y propuestas
    mapping(address => mapping(uint256 => StakeInfo)) private _voteStakes;
    mapping(address => mapping(uint256 => StakeInfo)) private _proposalStakes;

    event VoteStaked(address indexed user, uint256 indexed proposalId, uint256 amount, uint256 unlockAt);
    event VoteUnstaked(address indexed user, uint256 indexed proposalId, uint256 amount);
    event ProposalStaked(address indexed user, uint256 indexed proposalId, uint256 amount, uint256 unlockAt);
    event ProposalUnstaked(address indexed user, uint256 indexed proposalId, uint256 amount);

    modifier onlyDAO() {
        require(msg.sender == dao, "Staking: not DAO");
        _;
    }

    constructor(address _token, address _dao) {
        require(_token != address(0) && _dao != address(0), "Invalid address");
        token = IERC20(_token);
        dao = _dao;
    }

    function stakeVote(uint256 amount, uint256 proposalId) external {
        require(IDAO(dao).isValidProposal(proposalId), "Invalid proposal");
        require(amount > 0, "Invalid amount");

        StakeInfo storage s = _voteStakes[msg.sender][proposalId];
        s.amount += amount;
        s.exists = true;

        uint256 lt = IDAO(dao).lockTime();
        uint256 newUnlock = block.timestamp + lt;
        if (newUnlock > s.unlockAt) {
            s.unlockAt = newUnlock;
        }

        emit VoteStaked(msg.sender, proposalId, amount, s.unlockAt);

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    function unstakeVote(uint256 amount, uint256 proposalId) external {
        StakeInfo storage s = _voteStakes[msg.sender][proposalId];
        require(s.exists, "No vote stake");
        require(amount > 0, "Invalid amount");
        require(s.amount >= amount, "Insufficient funds");
        require(block.timestamp >= s.unlockAt, "Locked stake");

        s.amount -= amount;
        if (s.amount == 0) s.exists = false;

        emit VoteUnstaked(msg.sender, proposalId, amount);

        require(token.transfer(msg.sender, amount), "Transfer failed");
    }

    function voteStakeOf(address user, uint256 proposalId) external view returns (uint256) {
        require(_voteStakes[user][proposalId].exists, "No vote stake");
        return _voteStakes[user][proposalId].amount;
    }

    function voteUnlockTimeOf(address user, uint256 proposalId) external view returns (uint256) {
        require(_voteStakes[user][proposalId].exists, "No vote stake");
        return _voteStakes[user][proposalId].unlockAt;
    }

    function stakeProposal(uint256 amount, uint256 proposalId) external {
        require(IDAO(dao).isValidProposal(proposalId), "Invalid proposal");
        require(amount > 0, "Invalid amount");

        StakeInfo storage s = _proposalStakes[msg.sender][proposalId];
        s.amount += amount;
        s.exists = true;

        uint256 lt = IDAO(dao).lockTime();
        uint256 newUnlock = block.timestamp + lt;
        if (newUnlock > s.unlockAt) {
            s.unlockAt = newUnlock;
        }

        emit ProposalStaked(msg.sender, proposalId, amount, s.unlockAt);

        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    function unstakeProposal(uint256 amount, uint256 proposalId) external {
        StakeInfo storage s = _proposalStakes[msg.sender][proposalId];
        require(s.exists, "No proposal stake");
        require(amount > 0, "Invalid amount");
        require(s.amount >= amount, "Insufficient funds");
        require(block.timestamp >= s.unlockAt, "Locked stake");

        s.amount -= amount;
        if (s.amount == 0) s.exists = false;

        emit ProposalUnstaked(msg.sender, proposalId, amount);

        require(token.transfer(msg.sender, amount), "Transfer failed");
    }

    function proposalStakeOf(address user, uint256 proposalId) external view returns (uint256) {
        require(_proposalStakes[user][proposalId].exists, "No proposal stake");
        return _proposalStakes[user][proposalId].amount;
    }

    function proposalUnlockTimeOf(address user, uint256 proposalId) external view returns (uint256) {
        require(_proposalStakes[user][proposalId].exists, "No proposal stake");
        return _proposalStakes[user][proposalId].unlockAt;
    }
}
