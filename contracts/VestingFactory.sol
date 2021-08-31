// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TokenVesting.sol";

contract VestingFactory {

    address public immutable implementationAddress;

    event VestingContractCreated(address vestingAddress, address token, address walletAddress);

    constructor() {
        implementationAddress = address(new TokenVesting());
    }

    function createVestingContract(IERC20 _token, address _walletAddress) external returns (address) {
        address newClone = Clones.clone(implementationAddress);
        TokenVesting(newClone).init(_token, _walletAddress);
        
        emit VestingContractCreated(newClone, address(_token), _walletAddress);
        return newClone;
    }
}