const chai = require("chai");
const bnChai = require("bn-chai");
const helpers = require("./helpers");

const QUAD = artifacts.require("QUAD");
const MultiSigWallet = artifacts.require("MultiSigWallet");
const TokenVesting = artifacts.require("TokenVesting");
const WalletFactory = artifacts.require("WalletFactory.sol");
const VestingFactory = artifacts.require("VestingFactory.sol");

const { expect } = chai;
const BN = web3.utils.BN;
chai.use(bnChai(BN));

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

    const setupContracts = async () => {
        // create wallet factory and initialize new multisig wallet
        const multiSigContract = await MultiSigWallet.new();
        await multiSigContract.init([ACCOUNT_7, ACCOUNT_8, ACCOUNT_9]);
        const walletFactory = await WalletFactory.new(multiSigContract.address);
        const createWalletTx = await walletFactory.createWallet([ACCOUNT_0, ACCOUNT_1, ACCOUNT_2]);
        multisig = await MultiSigWallet.at(createWalletTx.logs[0].args.walletAddress);

        // create token and mint total supply into multisig wallet
        const totalSupply = web3.utils.toWei("400000000");
        token = await QUAD.new([multisig.address], [totalSupply]);
        const totalBalance = await token.balanceOf(multisig.address);
        expect(totalBalance).to.eq.BN(totalSupply);

        // create vesting factory and initialize new vesting contract
        const vestingContract = await TokenVesting.new();
        // await vestingContract.init(token.address, multisig.address);
        const vestingFactory = await VestingFactory.new(vestingContract.address);
        const createVestingContractTx = await vestingFactory.createVestingContract(token.address, multisig.address);
        vesting = await TokenVesting.at(createVestingContractTx.logs[0].args.vestingAddress);
        
        // approve spending from multisig wallet by vesting contract
        const txData = token.contract.methods.increaseAllowance(vesting.address, totalSupply).encodeABI();
        const params = {
            msgSenderAddress: ACCOUNT_0,
            otherSignerAddress: ACCOUNT_1,
            toAddress: token.address,
            amount: 0,
            data: txData,
            expireTime: await helpers.currentBlockTime() + 600,
            sequenceId: await multisig.getNextSequenceId()
        };
        await sendMultiSigHelper(params, true);
        const totalAllowance = await token.allowance(multisig.address, vesting.address);
        expect(totalAllowance).to.eq.BN(totalSupply);
    }

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

    describe("Initial deployment testing", () => {
        before("Setup contracts before running all tests", async () => {
            await setupContracts();
        });

        it("should set the Token correctly", async () => {
            const tokenAddress = await vesting.getToken();
            expect(token.address).to.equal(tokenAddress);
        });

        it("should set the MultiSig correctly", async () => {
            const multiSigAddress = await vesting.getMultiSigContract();
            expect(multisig.address).to.equal(multiSigAddress);
        });

        it("should fail with 0 address for Token", async () => {
            const vestingContract = await TokenVesting.new();
            await helpers.expectRevertTx(vestingContract.init(ZERO_ADDRESS, multisig.address));
        });

        it("should fail with 0 address for MultiSig", async () => {
            const vestingContract = await TokenVesting.new();
            await helpers.expectRevertTx(vestingContract.init(multisig.address, ZERO_ADDRESS));
        });
    });

    describe("When setting vesting schedules", async () => {
        before("Setup contracts before running all tests", async () => {
            await setupContracts();
        });

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

    describe("When claiming vested tokens", () => {
        beforeEach("Setup contracts before running each test", async () => {
            await setupContracts();
        });

        const account1Amount = web3.utils.toWei("150000");
        const account1VestingSchedules = [
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 6 }, // 24 months duration, 6 months cliff cases
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 7 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 8 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 9 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 10 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 11 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 12 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 18 },
            { duration: 24, cliff: 6, startTimeMonthsBeforeNow: 0, monthsElapsed: 24 },
            { duration: 6, cliff: 1, startTimeMonthsBeforeNow: 0, monthsElapsed: 1 }, // 6 months duration, 1 month cliff cases
            { duration: 6, cliff: 1, startTimeMonthsBeforeNow: 0, monthsElapsed: 2 },
            { duration: 6, cliff: 1, startTimeMonthsBeforeNow: 0, monthsElapsed: 3 },
            { duration: 6, cliff: 1, startTimeMonthsBeforeNow: 0, monthsElapsed: 4 },
            { duration: 6, cliff: 1, startTimeMonthsBeforeNow: 0, monthsElapsed: 5 },
            { duration: 6, cliff: 1, startTimeMonthsBeforeNow: 0, monthsElapsed: 6 },
            { duration: 6, cliff: 0, startTimeMonthsBeforeNow: 0, monthsElapsed: 1 }, // 6 months duration, 1 month cliff cases
            { duration: 6, cliff: 0, startTimeMonthsBeforeNow: 0, monthsElapsed: 2 },
            { duration: 6, cliff: 0, startTimeMonthsBeforeNow: 0, monthsElapsed: 3 },
            { duration: 6, cliff: 0, startTimeMonthsBeforeNow: 0, monthsElapsed: 4 },
            { duration: 6, cliff: 0, startTimeMonthsBeforeNow: 0, monthsElapsed: 5 },
            { duration: 6, cliff: 0, startTimeMonthsBeforeNow: 0, monthsElapsed: 6 },
            { duration: 15, cliff: 2, startTimeMonthsBeforeNow: 1, monthsElapsed: 1 }, // Other mixed cases of valid grant options
            { duration: 18, cliff: 4, startTimeMonthsBeforeNow: 3, monthsElapsed: 10 },
            { duration: 25, cliff: 7, startTimeMonthsBeforeNow: 1, monthsElapsed: 21 },
            { duration: 33, cliff: 10, startTimeMonthsBeforeNow: 2, monthsElapsed: 26 },
            { duration: 34, cliff: 9, startTimeMonthsBeforeNow: 4, monthsElapsed: 29 },
            { duration: 40, cliff: 12, startTimeMonthsBeforeNow: 9, monthsElapsed: 25 }
        ];

        account1VestingSchedules.forEach(async vestProp => {
            it(`${vestProp.monthsElapsed} months after vesting start date, user should be able to claim
             ${vestProp.monthsElapsed}/${vestProp.duration + vestProp.startTimeMonthsBeforeNow} of their total tokens`, async () => {
                const currentTime = await helpers.currentBlockTime();
                const txData = await vesting.contract.methods.addRecipient(
                    ACCOUNT_1,
                    currentTime - vestProp.startTimeMonthsBeforeNow * SECONDS_PER_MONTH,
                    account1Amount,
                    vestProp.duration,
                    vestProp.cliff
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

                await helpers.forwardTime(SECONDS_PER_MONTH * vestProp.monthsElapsed, this);
                const balanceBefore = await token.balanceOf(ACCOUNT_1);
                expect(balanceBefore).to.be.zero;

                await vesting.releaseVestedTokens(ACCOUNT_1);
                const balanceAfter = await token.balanceOf(ACCOUNT_1);

                let expectedClaimedAmount;
                if (vestProp.monthsElapsed >= vestProp.duration) {
                    expectedClaimedAmount = account1Amount;
                } else {
                    expectedClaimedAmount = new BN(account1Amount).divn(vestProp.duration).muln(
                        vestProp.monthsElapsed + vestProp.startTimeMonthsBeforeNow
                    );
                }

                expect(balanceAfter).to.eq.BN(expectedClaimedAmount);

                const vest = await vesting.getVestingSchedule(ACCOUNT_1);
                expect(vest.monthsClaimed).to.eq.BN(vestProp.monthsElapsed + vestProp.startTimeMonthsBeforeNow);
                expect(vest.tokensClaimed).to.eq.BN(expectedClaimedAmount);
            });
        });
    });
});
