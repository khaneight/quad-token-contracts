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

    before("Setup contracts before each test", async () => {
        token = await QUAD.new([ACCOUNT_0], [web3.utils.toWei("400000000")]);
        multisig = await MultiSigWallet.new()
        await multisig.init([ACCOUNT_0, ACCOUNT_1, ACCOUNT_2]);
        vesting = await TokenVesting.new(token.address, multisig.address);

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

    describe("When adding new vesting schedules", async () => {
        it("should fail when start time is more than a year in past", async () => {
            const currentTime = await helpers.currentBlockTime();
            const txData = await vesting.contract.methods.addRecipient(ACCOUNT_1, currentTime - SECONDS_PER_YEAR - SECONDS_PER_MONTH, 1000, 24, 6).encodeABI();
            await multisig.sendMultiSig(vesting.address, 0, txData, currentTime + SECONDS_PER_MONTH, 1,);
    
            const vest = await vesting.getVestingSchedule(ACCOUNT_1);
            expect(vest.startTime.toNumber()).to.equal(0);
        });
    });
});
