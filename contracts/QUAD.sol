// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract QUAD is ERC20, ERC20Burnable {
    constructor(address[] memory wallets, uint256[] memory amounts) ERC20("QUAD Token", "QUAD") {
        for (uint256 i = 0; i < wallets.length; i++){
            _mint(wallets[i], amounts[i]);
            if(i == 10){
                break;
            }
        }
    }
}