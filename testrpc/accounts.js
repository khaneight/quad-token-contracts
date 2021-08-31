const util = require('ethereumjs-util');

exports.accounts = [
    '0xd90de8326a77139bd7a680d793915194e4230bb7c60f74b0c6509c3d05ff7786',
    '0x1656736ce6c7e661f1db8ead2a21d14cb7d541fb114dac48cba7752f8b4dd249',
    '0x415c65f7cb52917d482ff76459c0413a3c2e44dd798ace301542ac4a52837e0d',
    '0x1cd648c3cf4ca7e598d46b68e7fb93ab58263b525f78524de914ea1b3411a496',
    '0x941c7eb1e51faaeb545d8452b55468d50a2e48f5595b3c1d91cc1a96f5367c0b',
    '0x66a5cb2b5a4b72d507b54216f0b1d99e7be8ebbec22bbe3075666341e6cb06f6',
    '0x2ea8c6d308c98c81af4a22b85b19c79f21c8959eb417580ea4e36b84b430422d',
    '0x774ed62561dce47f85ad4ccccae6cd1705132bf4fac3cdb48488e1dc735bedbd',
    '0x2e1275bd56dc5a0c3457be9c308b56fabec506b38a556e31883445ee1a8f2e6c',
    '0xce9e6f673c08dacd284045e64d82407be1d58e5426d750f9f9f5afd4cca2004b'
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
