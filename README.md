# QUAD Token

## Install

```
git clone https://github.com/quadency/quad-token-contracts.git
cd quad-token-contracts
yarn
```

## Contracts
[QUAD.sol](https://github.com/quadency/quad-token-contracts/blob/master/contracts/QUAD.sol) QUAD token contract based on OpenZeppelin implementation of ERC20 token standard including `burn` functionality

[TokenVesting.sol](https://github.com/quadency/quad-token-contracts/blob/master/contracts/TokenVesting.sol) Creates and enforces vesting schedules for token recipients. Function `addRecipient` is used to create new vesting schedules and is permissioned to the Quadency-controlled multisig wallet only. Tokens are vested on a monthly basis with an optional cliff, and only one vesting schedule is allowed per recipient. Tokens are sent from the multisig wallet to the vesting contract when new recipients are added, so the multisig wallet must `approve` the specified token amount prior to calling `addRecipient`

[MultiSigWallet.sol](https://github.com/quadency/quad-token-contracts/blob/master/contracts/MultiSigWallet.sol) Multisig wallet based on [BitGo implementation](https://github.com/BitGo/eth-multisig-v4) with modifications that uses OpenZeppelin SafeERC20 library for token transfers and adds token batch transactions

[VestingFactory.sol](https://github.com/quadency/quad-token-contracts/blob/master/contracts/VestingFactory.sol) Uses OpenZeppelin Clones library to efficiently deploy copies of TokenVesting bytecode with independent state

[WalletFactory.sol](https://github.com/quadency/quad-token-contracts/blob/master/contracts/WalletFactory.sol) Uses OpenZeppelin Clones library to efficiently deploy copies of MultiSigWallet bytecode with independent state


## Testing

Run ganache-cli with preconfigured settings and accounts. Unit tests cover TokenVesting functionality and token transfers in MultiSigWallet

```
node ./testrpc/run.js
truffle test --network development
```
