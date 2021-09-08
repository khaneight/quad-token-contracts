const ethUtil = require("ethereumjs-util");
const ethAbi = require("ethereumjs-abi");
const { privateKeyForAccount } = require('../testrpc/accounts.js');
const { assert } = require("chai");

exports.web3GetClient = () => {
    return new Promise((resolve, reject) => {
        web3.eth.getNodeInfo((err, res) => {
            if (err !== null) return reject(err);
            return resolve(res);
        });
    });
};

exports.currentBlockTime = () => {
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
};

exports.expectSuccessTx = async (promise) => {
    let receipt;
    try {
        ({ receipt } = await promise);
    } catch (err) { }
    assert(receipt);
    expect(receipt.status, `Transaction error, but expected success`).to.be.true;
    return receipt;
};

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

exports.signMultiSigTokenTx = (params) => {
    assert(params.otherSignerAddress);
    assert(params.toAddress);
    assert(params.amount === 0 || params.amount);
    assert(params.tokenContractAddress);
    assert(params.expireTime);
    assert(params.sequenceId);

    const operationHash = ethAbi.soliditySHA3(
        ['string', 'address', 'uint', 'address', 'uint', 'uint'],
        [
            'ERC20',
            params.toAddress,
            params.amount,
            params.tokenContractAddress,
            params.expireTime,
            params.sequenceId
        ]
    );

    const sig = ethUtil.ecsign(operationHash, privateKeyForAccount(params.otherSignerAddress));
    const serializeSignature = '0x' + Buffer.concat([sig.r, sig.s, Buffer.from([sig.v])]).toString('hex');

    return serializeSignature;
};

exports.signMultiSigTokenBatchTx = (params) => {
    assert(params.otherSignerAddress);
    assert(params.recipients);
    assert(params.amounts);
    assert(params.tokenContractAddress);
    assert(params.expireTime);
    assert(params.sequenceId);

    const operationHash = ethAbi.soliditySHA3(
        ['string', 'address[]', 'uint[]', 'address', 'uint', 'uint'],
        [
            'ERC20',
            params.recipients,
            params.amounts,
            params.tokenContractAddress,
            params.expireTime,
            params.sequenceId
        ]
    );

    const sig = ethUtil.ecsign(operationHash, privateKeyForAccount(params.otherSignerAddress));
    const serializeSignature = '0x' + Buffer.concat([sig.r, sig.s, Buffer.from([sig.v])]).toString('hex');

    return serializeSignature;
};

exports.sendMultiSigHelper = async (multisig, params, expectSuccess) => {
    const signature = exports.signMultiSigTx(params);
    if (expectSuccess) {
        await exports.expectSuccessTx(multisig.sendMultiSig(
            params.toAddress,
            params.amount,
            params.data,
            params.expireTime,
            params.sequenceId,
            signature,
            { from: params.msgSenderAddress }
        ));
    } else {
        await exports.expectRevertTx(multisig.sendMultiSig(
            params.toAddress,
            params.amount,
            params.data,
            params.expireTime,
            params.sequenceId,
            signature,
            { from: params.msgSenderAddress }
        ));
    }
};

exports.sendMultiSigTokenHelper = async (multisig, params, expectSuccess) => {
    const signature = exports.signMultiSigTokenTx(params);
    if (expectSuccess) {
        await exports.expectSuccessTx(multisig.sendMultiSigToken(
            params.toAddress,
            params.amount,
            params.tokenContractAddress,
            params.expireTime,
            params.sequenceId,
            signature,
            { from: params.msgSenderAddress }
        ));
    } else {
        await exports.expectRevertTx(multisig.sendMultiSigToken(
            params.toAddress,
            params.amount,
            params.tokenContractAddress,
            params.expireTime,
            params.sequenceId,
            signature,
            { from: params.msgSenderAddress }
        ));
    }
};

exports.sendMultiSigTokenBatchHelper = async (multisig, params, expectSuccess) => {
    const signature = exports.signMultiSigTokenBatchTx(params);
    if (expectSuccess) {
        await exports.expectSuccessTx(multisig.sendMultiSigTokenBatch(
            params.recipients,
            params.amounts,
            params.tokenContractAddress,
            params.expireTime,
            params.sequenceId,
            signature,
            { from: params.msgSenderAddress }
        ));
    } else {
        await exports.expectRevertTx(multisig.sendMultiSigTokenBatch(
            params.recipients,
            params.amounts,
            params.tokenContractAddress,
            params.expireTime,
            params.sequenceId,
            signature,
            { from: params.msgSenderAddress }
        ));
    }
};

exports.forwardTime = async (seconds, test) => {
    const client = await exports.web3GetClient();
    const p = new Promise((resolve, reject) => {
        if (client.indexOf("TestRPC") === -1) {
            resolve(test.skip());
        } else {
            web3.currentProvider.send(
                {
                    jsonrpc: "2.0",
                    method: "evm_increaseTime",
                    params: [seconds],
                    id: 0
                },
                err => {
                    if (err) {
                        return reject(err);
                    }
                    return web3.currentProvider.send(
                        {
                            jsonrpc: "2.0",
                            method: "evm_mine",
                            params: [],
                            id: 0
                        },
                        (err2, res) => {
                            if (err2) {
                                return reject(err2);
                            }
                            return resolve(res);
                        }
                    );
                }
            );
        }
    });
    return p;
};