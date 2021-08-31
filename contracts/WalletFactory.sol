// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./MultiSigWallet.sol";

contract WalletFactory {

    address public immutable implementationAddress;

    event WalletCreated(address walletAddress, address[] allowedSigners);

    constructor() {
        implementationAddress = address(new MultiSigWallet());
    }

    function createWallet(address[] calldata _allowedSigners) external returns (address) {
        address payable newClone = payable(Clones.clone(implementationAddress));
        MultiSigWallet(newClone).init(_allowedSigners);
        
        emit WalletCreated(newClone, _allowedSigners);
        return newClone;
    }
}