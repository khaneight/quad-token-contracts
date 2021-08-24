// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenVesting.sol";

contract VestingFactory {

    address public implementationAddress;

    event VestingContractCreated(address vestingAddress, address token, address walletAddress);

    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    function createVestingContract(IERC20 _token, address _walletAddress) external returns (address) {
        address newClone = Clones.clone(implementationAddress);
        TokenVesting(newClone).init(_token, _walletAddress);
        
        emit VestingContractCreated(newClone, address(_token), _walletAddress);
        return newClone;
    }

    function createVestingContractDeterministic(IERC20 _token, address _walletAddress, bytes32 _salt) external returns (address) {
        bytes32 finalSalt = keccak256(abi.encodePacked(address(_token), _walletAddress, _salt));
        address newClone = Clones.cloneDeterministic(implementationAddress, finalSalt);
        TokenVesting(newClone).init(_token, _walletAddress);

        emit VestingContractCreated(newClone, address(_token), _walletAddress);
        return newClone;
    }
}