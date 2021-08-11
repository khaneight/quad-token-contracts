const ethUtil = require("ethereumjs-util");
const ethAbi = require("ethereumjs-abi");
const accounts = require("./accounts.json");

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

exports.getSha3ForConfirmationTx = function (
  prefix,
  toAddress,
  amount,
  data,
  expireTime,
  sequenceId
) {
  const operationHash = ethAbi.soliditySHA3(
    ['string', 'address', 'uint', 'bytes', 'uint', 'uint'],
    [
      prefix,
      toAddress,
      amount,
      Buffer.from(data.replace('0x', ''), 'hex'),
      expireTime,
      sequenceId
    ]
  );
};