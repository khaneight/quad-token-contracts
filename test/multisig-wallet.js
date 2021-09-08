const chai = require("chai");
const bnChai = require("bn-chai");
const helpers = require("./helpers");

const QUAD = artifacts.require("QUAD");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const WalletFactory = artifacts.require("WalletFactory.sol");

const { expect } = chai;
const BN = web3.utils.BN;
chai.use(bnChai(BN));

contract("MultiSigWalletUnitTest", accounts => {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    const ACCOUNT_0 = accounts[0];
    const ACCOUNT_1 = accounts[1];
    const ACCOUNT_2 = accounts[2];
    const ACCOUNT_3 = accounts[3];
    const ACCOUNT_4 = accounts[4];
    const ACCOUNT_5 = accounts[5];
    const ACCOUNT_6 = accounts[6];
    const ACCOUNT_7 = accounts[7];
    const ACCOUNT_8 = accounts[8];
    const ACCOUNT_9 = accounts[9];

    let token;
    let multisig;

    describe("When sending token transactions", () => {
        beforeEach("Setup contracts before each test", async () => {
            // create wallet factory and initialize new multisig wallet
            const walletFactory = await WalletFactory.new();
            const createWalletTx = await walletFactory.createWallet([ACCOUNT_0, ACCOUNT_1, ACCOUNT_2]);
            multisig = await MultiSigWallet.at(createWalletTx.logs[0].args.walletAddress);

            // create token and mint total supply into multisig wallet
            const totalSupply = web3.utils.toWei("400000000");
            token = await QUAD.new([multisig.address], [totalSupply]);
            const totalBalance = await token.balanceOf(multisig.address);
            expect(totalBalance).to.eq.BN(totalSupply);
        });

        it("should send single token transactions correctly", async () => {
            const transferAmount = web3.utils.toWei("1250");
            let params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: ACCOUNT_2,
                amount: transferAmount,
                tokenContractAddress: token.address,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await helpers.sendMultiSigTokenHelper(multisig, params, true);
            const balanceAfter = await token.balanceOf(ACCOUNT_2);
            expect(balanceAfter).to.eq.BN(transferAmount);
        });

        it("should send batch token transactions correctly", async () => {
            const batchRecipients = [...accounts];
            const batchAmounts = [
                web3.utils.toWei("25000000"),
                web3.utils.toWei("1750000"),
                web3.utils.toWei("3500000"),
                web3.utils.toWei("100000"),
                web3.utils.toWei("200000"),
                web3.utils.toWei("300000"),
                web3.utils.toWei("9999"),
                web3.utils.toWei("8888"),
                web3.utils.toWei("7777"),
                web3.utils.toWei("6666"),
            ];
            let params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                recipients: batchRecipients,
                amounts: batchAmounts,
                tokenContractAddress: token.address,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await helpers.sendMultiSigTokenBatchHelper(multisig, params, true);

            for (let i = 0; i < batchRecipients.length; i++) {
                const balanceAfter = await token.balanceOf(batchRecipients[i]);
                expect(balanceAfter).to.eq.BN(batchAmounts[i]);
            }
        });

        it("should fail when other signer same as sender", async () => {
            const transferAmount = web3.utils.toWei("1250");
            let params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_0,
                toAddress: ACCOUNT_2,
                amount: transferAmount,
                tokenContractAddress: token.address,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await helpers.sendMultiSigTokenHelper(multisig, params, false);
        });

        it("should fail when unauthorized sender but valid other signature", async () => {
            const transferAmount = web3.utils.toWei("1250");
            let params = {
                msgSenderAddress: ACCOUNT_9,
                otherSignerAddress: ACCOUNT_0,
                toAddress: ACCOUNT_2,
                amount: transferAmount,
                tokenContractAddress: token.address,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await helpers.sendMultiSigTokenHelper(multisig, params, false);
        });

        it("should fail when invalid signature but authorized sender", async () => {
            const transferAmount = web3.utils.toWei("1250");
            let params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_9,
                toAddress: ACCOUNT_2,
                amount: transferAmount,
                tokenContractAddress: token.address,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await helpers.sendMultiSigTokenHelper(multisig, params, false);
        });
    });
});