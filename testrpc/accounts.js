const util = require('ethereumjs-util');

exports.accounts = [
    '0x4e4da9efa9ce038672ef553d3f260c3c1a59fbf5dfc119d0b6e357a98422ae37',
    '0x3457fda1c9a5212fc92b941454638efd62e5a65ce7ca298952edaf0081c21361',
    '0xdadefbc46d98913ff0f4e043d5844fe14668fe885b0e3de0705e867109f1a97f',
    '0x9ac7fd242d31a4eecfdcb0578edab4f5b08d49be61c4108f46b21119273de355',
    '0xbc10dbe7d813b5662b1d1d0f13edc1c45d98957a8ee55f38ee53935eb5c89a3c',
    '0xea77cc10b188e5134d6fb91ce2374f9c82c595c2faccfb27561d39717fb13630',
    '0x772d982142279f4dc17fe377a9a69b3288ccf4243200bfb88388d2da0bd433a3',
    '0x9f4756ca7984d57c859dea03e907a6d870b803fdf1cafc1ccb7ad2422234087a',
    '0xd1d3b3211c4825754f459b092cd6e58f9e3a5bf95d9335fa4bb3a7862fd89c94',
    '0xb30a2aea796cf222291774d3d5d2a572862311a8c2a9e98b36caa233d6374127'
].map((privkeyHex) => {
    const privkey = Buffer.from(privkeyHex.replace(/^0x/i, ''), 'hex');
    const pubkey = util.privateToPublic(privkey);
    const address = util.pubToAddress(pubkey);
    return { privkey, pubkey, address };
});

const mapAddrToAcct = exports.accounts.reduce(
    (obj, { address, privkey }) =>
        Object.assign(obj, { [address.toString('hex')]: privkey }),
    {}
);

exports.privateKeyForAccount = (acct) => {
    const result = mapAddrToAcct[util.stripHexPrefix(acct).toLowerCase()];
    if (!result) {
        throw new Error('no privkey for ' + acct);
    }
    return result;
};
