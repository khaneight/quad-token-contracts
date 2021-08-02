const chai = require("chai");

const QUAD = artifacts.require("QUAD");
const TokenVesting = artifacts.require("TokenVesting");

contract("TokenVestingUnitTest", accounts => {
    const SECONDS_PER_MONTH = 2628000;
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
    const ACCOUNT_10 = accounts[10];

    let token;
    let vesting;

    before("Setup contracts before each test", async () => {
        token = await QUAD.new([ACCOUNT_0], [web3.utils.toWei("400000000")]);
        vesting = await TokenVesting.new(token.address, ACCOUNT_0);
    });

    describe("Initial deployment testing", () => {
        it("should set the Token correctly", async () => {
            const tokenAddress = await vesting.getToken();
            expect(token.address).to.equal(tokenAddress);
        });

        it("should set the MultiSig correctly", async () => {
            const multiSigAddress = await vesting.getMultiSigContract();
            expect(ACCOUNT_0).to.equal(multiSigAddress);
        });

        it("should fail with 0 address for Token", async () => {
            let vestingContract = "";
            try {
              vestingContract = await TokenVesting.new(ZERO_ADDRESS, ACCOUNT_0);
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
});
