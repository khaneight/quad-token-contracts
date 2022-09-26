const Web3 = require('web3');
const axios = require('axios');
const fs = require('fs');
const BigNumber = require('bignumber.js');
const compileOutputQuadEK = JSON.parse(fs.readFileSync('/Users/emilykuo/batch_transfers/build/contracts/QUAD_EK.json', 'utf8'))
const compileOutputBT = JSON.parse(fs.readFileSync('/Users/emilykuo/batch_transfers/build/contracts/BatchTransfers.json', 'utf8'))

const token_abi = compileOutputQuadEK.abi
const token_address = '0x70cf6330b93e465204d0aAc8976Fa2Fef47F6082'
const bt_abi = compileOutputBT.abi
const batch_transfer_address = '0x8eD9b2906b321A01af12B6073F1A83cf51646515'


const ether = (n) => {
    return new web3.utils.BN(
        web3.utils.toWei(n.toString(), 'ether')
    )
}

r = ['0x017006342770cDDc9EbCe1568d3ba6B73971BCC4', '0xb589178adfb6c6915c55b08B284bdBbbcf4f452e', '0x7f723a640aF3748901002c3690fe49329E8746b6'];
a = [ 12345, 56789, 78903]
key = 'd8a59a98bb890a09f56498e79b80501bdbb42e53cc98f19648dfea0b9fe80988'

 async function execute_batch_transfer(private_key, erc20_abi, erc20_address, recepients, amounts){
    try{
        //note that that account with the associated private key must have funds on Goerli and the ERC token
        const web3 = new Web3("https://goerli.infura.io/v3/540ccd9656d6453f9da8af0c46a4d8f2");
        const myEOA = web3.eth.accounts.privateKeyToAccount(private_key);
        console.log("myEOA", myEOA);
        const erc20_contract = new web3.eth.Contract(erc20_abi, erc20_address);
        const batch_transfer_contract = new web3.eth.Contract(bt_abi, batch_transfer_address);
        const token_name = await erc20_contract.methods.name().call();
        console.log("token_name", token_name);
        const totalSupply = await erc20_contract.methods.totalSupply().call();
        console.log("total token supply", totalSupply.toString());
        
        const eoa_balance = await web3.eth.getBalance(myEOA.address);
        console.log("eoa_balance", eoa_balance);
        const token_balance = await erc20_contract.methods.balanceOf(myEOA.address).call();
        console.log("token_balance", token_balance );
       
        const token_balance_3 = await erc20_contract.methods.balanceOf('0x77528057C58348Ae9AcCBf43fBa636d74c2B1f79').call();
        console.log("token_balance_3_of_main_metamask_address", token_balance_3)
  
        
        const token_transfer = await erc20_contract.methods.transfer('0x77528057C58348Ae9AcCBf43fBa636d74c2B1f79', web3.utils.toWei("2000"));
        const gas_for_token_transfer = await token_transfer.estimateGas({
            from: myEOA.address
        })

        console.log("gas_for_token_transfer", gas_for_token_transfer);

        const nonce = await web3.eth.getTransactionCount(myEOA.address)
        console.log("nonce", nonce);

        const nonce_string = '0x' + nonce.toString(16)
        console.log("nonce_string", nonce_string)

        
        const txParams = {
            from: myEOA.address,
            nonce: '0x' + nonce.toString(16),
            gas: '805362',
            to: token_address,
            data: token_transfer.encodeABI(),
            // value: value,
            chainId: 0x05
        }

        /*
        const tx = await myEOA.signTransaction(txParams);
        console.log('TX', tx);
        /*
        console.log('********')
        const txHash = await web3.eth.sendSignedTransaction(tx.rawTransaction)

        console.log('txhash', txHash)

        const token_balance_5 = await erc20_contract.methods.balanceOf('0x77528057C58348Ae9AcCBf43fBa636d74c2B1f79').call();
        console.log("token_balance_main_metamask_address_AFTER_TRANSFER", token_balance_5)
        */
        

       //sum total transfer amount for allowance approval
       let totalTransferAmount = 0;
       console.log("initital totalTransferAmount", totalTransferAmount)
       for (let i = 0; i < amounts.length; i++){
           totalTransferAmount += amounts[i]
       }
       console.log("updated transfer amount", totalTransferAmount);
       let transferAmountString = totalTransferAmount.toString();
       console.log("transferAmountString to Wei", web3.utils.toWei(transferAmountString));

       
       const approve_batch_transfer_address = await erc20_contract.methods.approve(batch_transfer_address, web3.utils.toWei(transferAmountString));
       const gas_for_approve_batch_transfer_address = await approve_batch_transfer_address.estimateGas({
            from: myEOA.address
        })

        console.log("gas_for_approve_batch_transfer_address", gas_for_approve_batch_transfer_address);

        const txParams_2 = {
            from: myEOA.address,
            nonce: '0x' + nonce.toString(16),
            gas: gas_for_approve_batch_transfer_address,
            to: token_address,
            data: approve_batch_transfer_address.encodeABI(),
            // value: value,
            chainId: 0x05
        }
          
        /*
        const tx_bt_approval = await myEOA.signTransaction(txParams_2);
        console.log('tx_bt_approval', tx_bt_approval);
        const txHash_bt_approval = await web3.eth.sendSignedTransaction(tx_bt_approval.rawTransaction);
        console.log("txhash_bt_approval", txHash_bt_approval);
        */
  
        const check_allowance_of_bt = await erc20_contract.methods.allowance(myEOA.address, batch_transfer_address).call();
        console.log("check allowance of bt", check_allowance_of_bt.toString());

        amounts_in_wei = [];
        for(i = 0; i < amounts.length; i++){
            current_amount_string = amounts[i].toString();
            amounts_in_wei.push(web3.utils.toWei(current_amount_string));
        }

        console.log("amounts_in_wei", amounts_in_wei);
   
        const batch_transfer = await batch_transfer_contract.methods.batchTransferSimple(erc20_address, recepients, amounts_in_wei);

        const gas_for_batch_transfer = await batch_transfer.estimateGas({
            from: myEOA.address
        })
        console.log("gas_for_batch_transfer", gas_for_batch_transfer);

        const txParams_3 = {
            from: myEOA.address,
            nonce: '0x' + nonce.toString(16),
            gas: gas_for_batch_transfer,
            to: batch_transfer_address,
            data: batch_transfer.encodeABI(),
            chainId: 0x05
        }
        
        const tx_batch_transfer = await myEOA.signTransaction(txParams_3);
        console.log('tx_batch_transfer', tx_batch_transfer);
        const txHash_batch_transfer = await web3.eth.sendSignedTransaction(tx_batch_transfer.rawTransaction);
        console.log("txHash batch transfer", txHash_batch_transfer);
        
        const token_balance_recepient_one = await erc20_contract.methods.balanceOf(recepients[0]).call();
        console.log("token balance of recepient_one", token_balance_recepient_one);

        const token_balance_recepient_two = await erc20_contract.methods.balanceOf(recepients[1]).call();
        console.log("token balance of recepient two", token_balance_recepient_two);

        const token_balance_recepient_three = await erc20_contract.methods.balanceOf(recepients[2]).call();
        console.log("token balance of recepient three", token_balance_recepient_three);
        
    }
    catch(error){
        console.log(error);
    }
   
}

execute_batch_transfer(key, token_abi, token_address, r, a);

