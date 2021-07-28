const QUAD = artifacts.require("QUAD.sol");

const wallets = [
    "0x97cb65FdA3f38434440af75C9aA462B2294e7307",
    "0x6611a75547BaADA9a00A34548639A20CB3088D62",
    "0xce0dB877ccBd5CfB5535007ad824D6A2562Fd017",
    "0xDF7f9e96eC91FE75d5442BA57dA866679D55f240",
];

const amounts = [
    web3.utils.toWei("100000000", "ether"),
    web3.utils.toWei("100000000", "ether"),
    web3.utils.toWei("100000000", "ether"),
    web3.utils.toWei("100000000", "ether"),
];

module.exports = function(deployer) {
    deployer.deploy(QUAD, wallets, amounts);
};