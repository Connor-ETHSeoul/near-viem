# near-viem

This module is a modified version of Custom Account interface `toAccount()` from `viem`. `NearViemAccount` uses Chain Signatures to sign messages and transactions.


What is viem?
https://viem.sh/docs/introduction.html

API: https://viem.sh/docs/accounts/custom.html

# Getting Started

```
yarn add near-viem viem
```

## Running unit tests

Run `yarn test <test-case>` to execute the test.

```
/**
 * Test cases:
 * 1 = create a Near Viem Account
 * 2 = create a Near Viem Account and sign message
 * 3 = create a Near Viem Account and sign Typed Data
 * 4 = create a Near Viem Wallet Client and send a transaction
 * 5 = create a Near Viem Account and send raw transaction
 */
```

# Examples

You can use Accoun action and Wallet action.
`NearViemAccount` is a `LocalAccount`, User can use Account Action with it. <br>
`NearViemAccountFactory` is an initialization function for creating `NearViemAccount`<br>
using `createWalletClient` User can use Wallet Action.

Wallet Action: https://viem.sh/docs/actions/wallet/introduction.html <br>
Account Action: https://viem.sh/docs/accounts/custom.html

## Account Action

### Create a account and get the address

```typescript
import { NearViemAccountFactory } from "near-viem";

const account = await NearViemAccountFactory(account);

return account.address;
```

### Sign Message

```typescript
import { verifyMessage } from "viem";

// returns signature
const signature = await account.signMessage({ message: "Hello World" });
// check signing message is successful
const valid = await verifyMessage({
  address: account.address,
  message: "Hello World",
  signature: signature,
});
```

### Sign TypedData

```typescript
// message
const message = {
  from: {
    name: "Cow",
    wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
  },
  to: {
    name: "Bob",
    wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
  },
  contents: "Hello, Bob!",
} as const;

// domain
const domain = {
  name: "Ether Mail",
  version: "1",
  chainId: 1,
  verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
} as const;

// The named list of all type definitions
const types = {
  Person: [
    { name: "name", type: "string" },
    { name: "wallet", type: "address" },
  ],
  Mail: [
    { name: "from", type: "Person" },
    { name: "to", type: "Person" },
    { name: "contents", type: "string" },
  ],
} as const;

// returns signature
const signature = await account.signTypedData({
  domain: {
    name: "Ether Mail",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
  },
  types: {
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" },
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person" },
      { name: "contents", type: "string" },
    ],
  },
  primaryType: "Mail",
  message: {
    from: {
      name: "Cow",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
    },
    to: {
      name: "Bob",
      wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
    },
    contents: "Hello, Bob!",
  },
});

// check if signing TypedData is successful
const valid = await verifyTypedData({
  address: account.address,
  domain,
  types,
  primaryType: "Mail",
  message,
  signature: signature,
});
```

### Sign Transaction

```typescript
const signature = await account.signTransaction({
  to: recipient,
});
```

## Wallet Client Action

### Create Wallet Client

```typescript
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

const account = new PKPViemAccount({
  controllerAuthSig: AuthSig,
  pkpPubKey: PKPPubKey,
});

const walletClient = createWalletClient({
  account: account,
  transport: http(),
  chain: sepolia,
});
```

### Send Transaction

```typescript
const hash = await walletClient.sendTransaction({
  account,
  to: recipient,
  value: amount,
  chain: walletClient.chain,
  kzg: undefined,
});
```

### Send Raw transaction

```typescript
// get transaction request object from prepareTransactionRequest
const request = await walletClient.prepareTransactionRequest({
  account,
  to: recipient,
  value: amount,
  chain: walletClient.chain,
  kzg: undefined,
});

const signature = await walletClient.signTransaction(request);

const hash = await walletClient.sendRawTransaction({
  serializedTransaction: signature,
});
```
