const chai = require("chai");
const bnChai = require("bn-chai");
const helpers = require("./helpers");

const QUAD = artifacts.require("QUAD");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const TokenVesting = artifacts.require("TokenVesting");

const { expect } = chai;
chai.use(bnChai(web3.utils.BN));

contract("TokenVestingUnitTest", accounts => {
    const SECONDS_PER_MONTH = 2628000;
    const SECONDS_PER_YEAR = SECONDS_PER_MONTH * 12;
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
    let vesting;

    const sendMultiSigHelper = async (params, expectSuccess) => {
        const signature = helpers.signMultiSigTx(params);
        if (expectSuccess) {
            await helpers.expectSuccessTx(multisig.sendMultiSig(
                params.toAddress,
                params.amount, 
                params.data, 
                params.expireTime, 
                params.sequenceId,
                signature,
                { from: params.msgSenderAddress }
            ));
        } else {
            await helpers.expectRevertTx(multisig.sendMultiSig(
                params.toAddress,
                params.amount, 
                params.data, 
                params.expireTime, 
                params.sequenceId,
                signature,
                { from: params.msgSenderAddress }
            ));
        }
    }

    before("Setup contracts before each test", async () => {
        // create and initialize new multisig wallet
        multisig = await MultiSigWallet.new()
        await multisig.init([ACCOUNT_0, ACCOUNT_1, ACCOUNT_2]);

        // create token and mint total supply into multisig wallet
        const totalSupply = web3.utils.toWei("400000000")
        token = await QUAD.new([multisig.address], [totalSupply]);
        const totalBalance = await token.balanceOf(multisig.address);
        expect(totalBalance).to.eq.BN(totalSupply);

        // create vesting contract and approve spending from multisig wallet
        vesting = await TokenVesting.new(token.address, multisig.address);
        const approveTx = token.contract.methods.increaseAllowance(vesting.address, totalSupply).encodeABI();
        const params = {
            msgSenderAddress: ACCOUNT_0,
            otherSignerAddress: ACCOUNT_1,
            toAddress: token.address,
            amount: 0,
            data: approveTx,
            expireTime: await helpers.currentBlockTime() + 600,
            sequenceId: await multisig.getNextSequenceId()
        };
        await sendMultiSigHelper(params, true);
        const totalAllowance = await token.allowance(multisig.address, vesting.address);
        expect(totalAllowance).to.eq.BN(totalSupply);
    });

    describe("Initial deployment testing", () => {
        it("should set the Token correctly", async () => {
            const tokenAddress = await vesting.getToken();
            expect(token.address).to.equal(tokenAddress);
        });

        it("should set the MultiSig correctly", async () => {
            const multiSigAddress = await vesting.getMultiSigContract();
            expect(multisig.address).to.equal(multiSigAddress);
        });

        it("should fail with 0 address for Token", async () => {
            let vestingContract = "";
            try {
              vestingContract = await TokenVesting.new(ZERO_ADDRESS, multisig.address);
            } catch (err) {}
            expect(vestingContract).to.equal("");
        });

        it("should fail with 0 address for MultiSig", async () => {
            let vestingContract = "";
            try {
              vestingContract = await TokenVesting.new(token.address, ZERO_ADDRESS);
            } catch (err) {}
            expect(vestingContract).to.equal("");
        });
    });

    describe("When setting vesting schedules", async () => {
        it("should add new recipient correctly", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_3, 
                currentTime, 
                web3.utils.toWei("1000"), 
                24, 
                6
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, true);
    
            const vest = await vesting.getVestingSchedule(ACCOUNT_3);
            expect(parseInt(vest.startTime, 10)).to.equal(currentTime);
            expect(vest.amount).to.eq.BN(web3.utils.toWei("1000"));
            expect(vest.vestingDuration).to.eq.BN(24);
            expect(vest.vestingCliff).to.eq.BN(6);
            expect(vest.monthsClaimed).to.be.zero;
            expect(vest.totalClaimed).to.be.zero;
        });

        it("should add new recipient batch correctly", async () => {
            const currentTime = await helpers.currentBlockTime();
            const recipients = [ACCOUNT_7, ACCOUNT_8, ACCOUNT_9];
            const amounts = [web3.utils.toWei("1000"), web3.utils.toWei("2000"), web3.utils.toWei("3000")];
            const txData = vesting.contract.methods.addRecipientBatch(
                recipients, 
                currentTime, 
                amounts, 
                24, 
                6
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, true);
    
            for (let i = 0; i < recipients.length; i++) {
                const vest = await vesting.getVestingSchedule(recipients[i]);
                expect(parseInt(vest.startTime, 10)).to.equal(currentTime);
                expect(vest.amount).to.eq.BN(amounts[i]);
                expect(vest.vestingDuration).to.eq.BN(24);
                expect(vest.vestingCliff).to.eq.BN(6);
                expect(vest.monthsClaimed).to.be.zero;
                expect(vest.totalClaimed).to.be.zero;
            }
        });

        it("should fail when recipient batch mismatched", async () => {
            const currentTime = await helpers.currentBlockTime();
            const recipients = [ACCOUNT_4, ACCOUNT_5, ACCOUNT_6];
            const amounts = [web3.utils.toWei("1000"), web3.utils.toWei("2000")];
            const txData = vesting.contract.methods.addRecipientBatch(
                recipients, 
                currentTime, 
                amounts, 
                24, 
                6
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false);
        });

        it("should fail when recipient already has vesting schedule", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_3, 
                currentTime, 
                web3.utils.toWei("2000"), 
                48, 
                12
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false);
        });

        it("should fail when vesting duration zero", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_4, 
                currentTime + SECONDS_PER_YEAR + SECONDS_PER_MONTH, 
                web3.utils.toWei("1000"), 
                0, 
                0
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false); 
        });

        it("should fail when vesting cliff longer than vesting duration", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_4, 
                currentTime + SECONDS_PER_YEAR + SECONDS_PER_MONTH, 
                web3.utils.toWei("1000"), 
                12, 
                13
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false); 
        });

        it("should fail when vesting duration longer than 100 months", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_4, 
                currentTime + SECONDS_PER_YEAR + SECONDS_PER_MONTH, 
                web3.utils.toWei("1000"), 
                101, 
                12
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false); 
        });

        it("should fail when vested amount per month zero", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_4, 
                currentTime + SECONDS_PER_YEAR + SECONDS_PER_MONTH, 
                web3.utils.toWei("0"), 
                24, 
                6
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false); 
        });
        
        it("should fail when start time is more than a year in past", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_4, 
                currentTime - SECONDS_PER_YEAR - SECONDS_PER_MONTH, 
                web3.utils.toWei("1000"), 
                24, 
                6
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false); 
        });

        it("should fail when start time is more than a year in future", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = vesting.contract.methods.addRecipient(
                ACCOUNT_4, 
                currentTime + SECONDS_PER_YEAR + SECONDS_PER_MONTH, 
                web3.utils.toWei("1000"), 
                24, 
                6
            ).encodeABI();
            const params = {
                msgSenderAddress: ACCOUNT_0,
                otherSignerAddress: ACCOUNT_1,
                toAddress: vesting.address,
                amount: 0,
                data: txData,
                expireTime: await helpers.currentBlockTime() + 600,
                sequenceId: await multisig.getNextSequenceId()
            };
            await sendMultiSigHelper(params, false); 
        });
    });
});
