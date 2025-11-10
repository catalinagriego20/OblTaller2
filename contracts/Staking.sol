// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IDAO {
    function lockTime() external view returns (uint256);
    function isValidProposal(uint256 proposalId) external view returns (bool);
    function proposalCreator(uint256 proposalId) external view returns (address);
}


contract Staking {
    IERC20 public immutable token;
    address public immutable dao;


    struct StakeInfo {
        uint256 amount;
        uint256 unlockAt;
        bool exists;
    }


    mapping(address => mapping(uint256 => StakeInfo)) private _voteStakes;
    mapping(address => mapping(uint256 => StakeInfo)) private _proposalStakes;


    event VoteStaked(address indexed user, uint256 indexed proposalId, uint256 amount, uint256 unlockAt);
    event VoteUnstaked(address indexed user, uint256 indexed proposalId);
    event ProposalStaked(address indexed user, uint256 indexed proposalId, uint256 amount, uint256 unlockAt);
    event ProposalUnstaked(address indexed user, uint256 indexed proposalId);


    modifier onlyDAO() {
        require(msg.sender == dao, "Staking: not DAO");
        _;
    }


    constructor(address _token, address _dao) {
        require(_token != address(0) && _dao != address(0), "Invalid address");
        token = IERC20(_token);
        dao = _dao;
    }

    function stakeVote(address user, uint256 amount, uint256 proposalId) external onlyDAO {
        require(IDAO(dao).isValidProposal(proposalId), "Invalid proposal");
        require(amount > 0, "Invalid amount");


        StakeInfo storage s = _voteStakes[user][proposalId];
        s.amount += amount;
        s.exists = true;


        uint256 lt = IDAO(dao).lockTime();
        uint256 newUnlock = block.timestamp + lt;
        if (newUnlock > s.unlockAt) s.unlockAt = newUnlock;


        emit VoteStaked(user, proposalId, amount, s.unlockAt);
        require(token.transferFrom(user, address(this), amount), "Transfer failed");
    }


    function unstakeVote(address user, uint256 proposalId) external onlyDAO {
        StakeInfo storage s = _voteStakes[user][proposalId];
        require(s.exists, "No vote stake");
        require(block.timestamp >= s.unlockAt, "Locked stake");

        uint256 amount = s.amount;
        s.amount = 0;
        s.exists = false;


        emit VoteUnstaked(user, proposalId);
        require(token.transfer(user, amount), "Transfer failed");
    }

    function stakeProposal(address user, uint256 amount, uint256 proposalId) external onlyDAO {
        require(IDAO(dao).isValidProposal(proposalId), "Invalid proposal");
        require(amount > 0, "Invalid amount");


        address creator = IDAO(dao).proposalCreator(proposalId);
        require(creator == user, "Only proposal creator can stake");


        StakeInfo storage s = _proposalStakes[user][proposalId];
        s.amount += amount;
        s.exists = true;


        uint256 lt = IDAO(dao).lockTime();
        uint256 newUnlock = block.timestamp + lt;
        if (newUnlock > s.unlockAt) s.unlockAt = newUnlock;


        emit ProposalStaked(user, proposalId, amount, s.unlockAt);
        require(token.transferFrom(user, address(this), amount), "Transfer failed");
    }

    function unstakeProposal(address user, uint256 proposalId) external onlyDAO {
        StakeInfo storage s = _proposalStakes[user][proposalId];
        require(s.exists, "No proposal stake");
        require(block.timestamp >= s.unlockAt, "Locked stake");

        address creator = IDAO(dao).proposalCreator(proposalId);
        require(creator == user, "Only proposal creator can unstake");

        uint256 amount = s.amount;
        s.amount = 0;
        s.exists = false;

        emit ProposalUnstaked(user, proposalId);
        require(token.transfer(user, amount), "Transfer failed");
    }

    function voteStakeOf(address user, uint256 proposalId) external view returns (uint256) {
        return _voteStakes[user][proposalId].amount;
    }
    function voteUnlockTimeOf(address user, uint256 proposalId) external view returns (uint256) {
        return _voteStakes[user][proposalId].unlockAt;
    }
    function proposalStakeOf(address user, uint256 proposalId) external view returns (uint256) {
        return _proposalStakes[user][proposalId].amount;
    }
    function proposalUnlockTimeOf(address user, uint256 proposalId) external view returns (uint256) {
        return _proposalStakes[user][proposalId].unlockAt;
    }
}



