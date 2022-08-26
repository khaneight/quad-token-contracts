const QUAD_EK = artifacts.require("QUAD_EK");
const BatchTransfers = artifacts.require("BatchTransfers");

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('BatchTransfers', ([account_0, account_1, account_2, account_3, account_4, account_5, account_6, account_7, account_8, account_9]) =>{

    let quadEK, batchTransfers

    const amounts = [
        web3.utils.toWei("308000000"), // deployment wallet
        web3.utils.toWei("20000000"), // liquidity pool
        web3.utils.toWei("20000000"), // insurance fund
        web3.utils.toWei("20000000"), // reserve
        web3.utils.toWei("32000000"), // network incentives
    ];

    beforeEach( async () =>{
        quadEK = await QUAD_EK.new([account_0, account_1, account_2, account_3, account_4], amounts);
        batchTransfers = await BatchTransfers.new();
    })

    describe('test quad deployed', async() =>{
        it('does the initial minting right', async() =>{
            let account_3_balance = await quadEK.balanceOf(account_3);
            assert.equal(account_3_balance.toString(), '20000000000000000000000000')
        })

    })



    describe('quad can transfer', async() =>{
        it('does transfer tokens', async() => {
            await quadEK.transfer(account_7, web3.utils.toWei("15000000"));
            //separate it statement doesnt store the state of account 7
            await quadEK.transfer(account_9, web3.utils.toWei("6000000"), {from: account_7})
            let account_0_balance = await quadEK.balanceOf(account_0);
            let account_7_balance = await quadEK.balanceOf(account_7);
            assert.equal(account_0_balance.toString(), '293000000000000000000000000');
            assert.equal(account_7_balance.toString(), '9000000000000000000000000');
        })
       
    })

    describe('batch transfer testing', async() =>{
        it('enables batch transfer allowance from account 4', async() => {
            await quadEK.approve(batchTransfers.address, web3.utils.toWei("25000000"), {from: account_4});
            let batchTransfer_allowance = await quadEK.allowance(account_4, batchTransfers.address);
            assert.equal(batchTransfer_allowance.toString(),'25000000000000000000000000')
        })

        it('actually does the SIMPLE batch transfer', async() => {
            token_distribution_amounts = [
                web3.utils.toWei("7500000"),
                web3.utils.toWei("2300000"),
                web3.utils.toWei("1800000"),
            ];
            await quadEK.approve(batchTransfers.address, web3.utils.toWei("25000000"), {from: account_4});
            await batchTransfers.batchTransferSimple(quadEK.address, [account_5, account_6, account_8], token_distribution_amounts, {from: account_4});
            let account_6_balance = await quadEK.balanceOf(account_6);
            assert.equal(account_6_balance.toString(), '2300000000000000000000000')

        })

      it('does ADVANCED bath transfer', async() => {
          token_amounts = [
              web3.utils.toWei("12000000"),
              web3.utils.toWei("14500000"),
          ]
          await quadEK.approve(batchTransfers.address, web3.utils.toWei("30000000"));
          await batchTransfers.batchTransferAdvanced(quadEK.address, [account_2, account_3], token_amounts);
          let account_2_balance = await quadEK.balanceOf(account_2);
          let account_3_balance = await quadEK.balanceOf(account_3);
          assert.equal(account_2_balance.toString(), '32000000000000000000000000');
          assert.equal(account_3_balance.toString(), '34500000000000000000000000')
      })

    })

})