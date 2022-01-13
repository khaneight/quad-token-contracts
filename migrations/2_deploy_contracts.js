const QUAD = artifacts.require("QUAD.sol");
const MultiSigWallet = artifacts.require("MultiSigWallet.sol");
const TokenVesting = artifacts.require("TokenVesting.sol");
const WalletFactory = artifacts.require("WalletFactory.sol");
const VestingFactory = artifacts.require("VestingFactory.sol");

const wallets = [
    "0x4461C40ff2FE73E8d7365b7Ce6E13C619E773d77", // deployment wallet
    "0x41F77bc6852109fd22D42e4977aAEC41524B6308", // liquidity pool
    "0xcD37C44c7f240f1EF20DD80F2a328608C2d54210", // insurance fund
    "0x5A78D4B25e7a8A76a10FFb451f1319fa545f0E5B", // reserve
    "0x16Aa94Ed5290ac3d476C1bC3271FB2E03E73d526" // network incentives
];

const amounts = [
    web3.utils.toWei("308000000"), // deployment wallet
    web3.utils.toWei("20000000"), // liquidity pool
    web3.utils.toWei("20000000"), // insurance fund
    web3.utils.toWei("20000000"), // reserve
    web3.utils.toWei("32000000"), // network incentives
];

const recipients = [
    "0x34900B10c08851916a7529de70E8c5cbC742C638", // token sale private
    "0xb38A1911b71F56eD81E2B9F7215D2413e7b05b43", // token sale public
    "0x0B572480F12a34e188716Ae80b5C51F6261e9baB", // team
    "0x1a6A699a275B0605bEc4f02B404E6e477AC5A97f", // investors
    "0x5A78D4B25e7a8A76a10FFb451f1319fa545f0E5B", // reserve
    "0x16Aa94Ed5290ac3d476C1bC3271FB2E03E73d526" // network incentives
];

const vestAmounts = [
    web3.utils.toWei("74000000"), // token sale private
    web3.utils.toWei("26000000"), // token sale public
    web3.utils.toWei("60000000"), // team
    web3.utils.toWei("40000000"), // investors
    web3.utils.toWei("60000000"), // reserve
    web3.utils.toWei("48000000") // network incentives
];

const vestDurations = [
    6, // token sale private
    3, // token sale public
    36, // team
    9, // investors
    36, // reserve
    24 // network incentives
];

const vestStart = [
    1640995200, // token sale private
    1640995200, // token sale public
    1646092800, // team
    1646092800, // investors
    1640995200, // reserve
    1669852800 // network incentives
];


const sender = "0x4461C40ff2FE73E8d7365b7Ce6E13C619E773d77";
const startTimestamp = 1640995200;

module.exports = async function (deployer) {
    await deployer.deploy(QUAD, wallets, amounts);
    const token = await QUAD.deployed();

    await deployer.deploy(TokenVesting);
    const vesting = await TokenVesting.deployed();
    await vesting.init(token.address, sender);

    const approveTx = await token.approve(vesting.address, amounts[0], { from: sender });
    console.log(approveTx);
    
    for (let i = 0; i < recipients.length; i++) {
        vesting.addRecipient(
            recipients[i], 
            vestStart[i],
            vestAmounts[i],
            vestDurations[i],
            0, 
            { from: sender }
        );
    }
    
    console.log('Done! QUAD to the MOON!!!');

    // await deployer.deploy(WalletFactory);
    // const walletFactory = await WalletFactory.deployed();
    
    // const createWalletTx0 = await walletFactory.createWallet(signers);
    // const wallet0 = await MultiSigWallet.at(createWalletTx0.logs[0].args.walletAddress);
    // const createWalletTx1 = await walletFactory.createWallet(signers);
    // const wallet1 = await MultiSigWallet.at(createWalletTx1.logs[0].args.walletAddress);
    // const createWalletTx2 = await walletFactory.createWallet(signers);
    // const wallet2 = await MultiSigWallet.at(createWalletTx2.logs[0].args.walletAddress);
    // const createWalletTx3 = await walletFactory.createWallet(signers);
    // const wallet3 = await MultiSigWallet.at(createWalletTx3.logs[0].args.walletAddress);

    // await deployer.deploy(QUAD, [wallet0.address, wallet1.address, wallet2.address, wallet3.address], amounts);
};