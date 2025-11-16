// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockDAO {
    bool public valid = true;
    address public creator = address(0);

    function setValid(bool v) external {
        valid = v;
    }

    function setCreator(address c) external {
        creator = c;
    }

    function isValidProposal(uint256) external view returns (bool) {
        return valid;
    }

    function proposalCreator(uint256) external view returns (address) {
        return creator;
    }

    function lockTime() external pure returns (uint256) {
        return 3600;
    }
}