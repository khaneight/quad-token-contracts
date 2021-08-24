// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./MultiSigWallet.sol";

contract WalletFactory {

    address public implementationAddress;

    event WalletCreated(address walletAddress, address[] allowedSigners);

    constructor(address _implementationAddress) {
        implementationAddress = _implementationAddress;
    }

    function createWallet(address[] calldata _allowedSigners) external returns (address) {
        address payable newClone = payable(Clones.clone(implementationAddress));
        MultiSigWallet(newClone).init(_allowedSigners);
        
        emit WalletCreated(newClone, _allowedSigners);
        return newClone;
    }

    function createWalletDeterministic(address[] calldata _allowedSigners, bytes32 _salt) external returns (address) {
        bytes32 finalSalt = keccak256(abi.encodePacked(_allowedSigners, _salt));
        address payable newClone = payable(Clones.cloneDeterministic(implementationAddress, finalSalt));
        MultiSigWallet(newClone).init(_allowedSigners);

        emit WalletCreated(newClone, _allowedSigners);
        return newClone;
    }
}