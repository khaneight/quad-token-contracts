const ethUtil = require("ethereumjs-util");
const ethAbi = require("ethereumjs-abi");
const { privateKeyForAccount } = require('../testrpc/accounts.js');
const { assert } = require("chai");

exports.currentBlockTime = async () => {
    const p = new Promise((resolve, reject) => {
        web3.eth.getBlock("latest", (err, res) => {
            if (err) {
                return reject(err);
            }
            return resolve(res.timestamp);
        });
    });
    return p;
};

exports.expectRevertTx = async (promise, errorMessage) => {
    let receipt;
    let reason;
    try {
        ({ receipt } = await promise);
    } catch (err) {
        assert(err);
        ({ receipt, reason, tx } = err);
        if (errorMessage) expect(reason).to.equal(errorMessage);
    }
    expect(receipt.status, `Transaction succeeded, but expected error`).to.be.false;
    return receipt;
}

exports.expectSuccessTx = async (promise) => {
    let receipt;
    try {
        ({ receipt } = await promise);
    } catch (err) {}
    expect(receipt.status, `Transaction error, but expected success`).to.be.true;
    return receipt;
}

exports.signMultiSigTx = (params) => {
    assert(params.otherSignerAddress);
    assert(params.toAddress);
    assert(params.amount === 0 || params.amount);
    assert(params.data === '' || params.data);
    assert(params.expireTime);
    assert(params.sequenceId);

    const operationHash = ethAbi.soliditySHA3(
        ['string', 'address', 'uint', 'bytes', 'uint', 'uint'],
        [
            'ETHER',
            params.toAddress,
            params.amount,
            Buffer.from(params.data.replace('0x', ''), 'hex'),
            params.expireTime,
            params.sequenceId
        ]
    );

    const sig = ethUtil.ecsign(operationHash, privateKeyForAccount(params.otherSignerAddress));
    const serializeSignature = '0x' + Buffer.concat([sig.r, sig.s, Buffer.from([sig.v])]).toString('hex');
    
    return serializeSignature;
};