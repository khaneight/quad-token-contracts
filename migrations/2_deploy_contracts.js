const QUAD = artifacts.require("QUAD.sol");
const MultiSigWallet = artifacts.require("MultiSigWallet.sol");
const TokenVesting = artifacts.require("TokenVesting.sol");
const WalletFactory = artifacts.require("WalletFactory.sol");
const VestingFactory = artifacts.require("VestingFactory.sol");

const wallets = [
    "0x97cb65FdA3f38434440af75C9aA462B2294e7307",
    "0x6611a75547BaADA9a00A34548639A20CB3088D62",
    "0xce0dB877ccBd5CfB5535007ad824D6A2562Fd017",
];

const amounts = [
    web3.utils.toWei("100000000", "ether"),
    web3.utils.toWei("100000000", "ether"),
    web3.utils.toWei("100000000", "ether"),
];

module.exports = async function (deployer) {
    deployer.deploy(QUAD, wallets, amounts);
};