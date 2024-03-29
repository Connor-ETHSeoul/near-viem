import { PKPViemAccount } from "./lib/pkp-viem";
import { LitLogger } from "./utils";
import { CONTROLLER_AUTHSIG, PKP_PUBKEY } from "./config.json";
import {
  createWalletClient,
  http,
  verifyMessage,
  verifyTypedData,
  defineChain,
  parseEther,
} from "viem";

// Define Custom Chain for Lit Chronicle
const chronicle = defineChain({
  id: 175177,
  name: "Chronicle",
  network: "chronicle",
  nativeCurrency: {
    decimals: 18,
    name: "LIT",
    symbol: "LIT",
  },
  rpcUrls: {
    default: {
      http: ["https://chain-rpc.litprotocol.com/http"],
    },
    public: {
      http: ["https://chain-rpc.litprotocol.com/http"],
    },
  },
});

const logger = new LitLogger("[ViemTest/main.ts]", true);

// get arguments from command line
const args = process.argv.slice(2);

/**
 * Test cases:
 * 1 = create a PKP Viem Account
 * 2 = create a Viem Wallet Client and send a transaction
 * 3 = create a PKP Viem Account and sign Typed Data
 * 4 = create a PKP Viem Account and sign message
 * 5 = create a PKP Viem Account and
 */
if (args.length === 0) {
  console.log("\nUsage: node main.js <test case number>\n");
  console.log(" Test cases:");
  console.log(" 1 = create a pkp wallet");
  console.log(" 2 = create a pkp wallet and sign message");
  console.log(" 3 = create a PKP wallet and sign typed data");
  console.log(" 4 = create a PKP wallet and send a transaction");
  console.log(" 5 = create a PKP wallet and send Raw Transaction ");
  process.exit(0);
}

// const TEST_CASE = 1;
const TEST_CASE = parseInt(args[0]);

const testCaseMap = {
  1: testPKPWallet,
  2: testPKPWalletAndSignMessage,
  3: testPKPWalletAndSignTypedData,
  4: testPKPWalletAndSendTransaction,
  5: testPKPWalletSendRawTransaction,
};

async function testPKPWallet() {
  const account = createPKPViemAccount();
  logger.log("account", account);
  return account;
}

async function testPKPWalletAndSignMessage() {
  const account = createPKPViemAccount();

  const sig = await account.signMessage({ message: "Hello World" });

  const valid = await verifyMessage({
    address: account.address,
    message: "Hello World",
    signature: sig,
  });
  logger.log("valid", valid);
  logger.log("signature", sig);
}

async function testPKPWalletAndSignTypedData() {
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

  const account = createPKPViemAccount();
  const signature = await account.signTypedData({
    domain: domain,
    types: types,
    primaryType: "Mail",
    message: message,
  });
  logger.log("signature", signature);

  const valid = await verifyTypedData({
    address: account.address,
    domain,
    types,
    primaryType: "Mail",
    message,
    signature: signature,
  });
  logger.log("valid", valid);
}

async function testPKPWalletAndSendTransaction() {
  const account = createPKPViemAccount();
  const walletClient = createWalletClient({
    account: account,
    transport: http(),
    chain: chronicle,
  });
  const hash = await walletClient.sendTransaction({
    account,
    to: account.address,
    value: parseEther("0"),
    chain: walletClient.chain,
  });
  logger.log("Transaction Hash", hash);
}

async function testPKPWalletSendRawTransaction() {
  const account = createPKPViemAccount();
  const walletClient = createWalletClient({
    account: account,
    transport: http(),
    chain: chronicle,
  });
  const request = await walletClient.prepareTransactionRequest({
    account,
    to: account.address,
    value: parseEther("0"),
    chain: walletClient.chain,
  });
  const signature = await walletClient.signTransaction(request);
  logger.log("signature", signature);
  const hash = await walletClient.sendRawTransaction({
    serializedTransaction: signature,
  });
  logger.log("hash", hash);
}

/**
 * ========== STARTS HERE ==========
 * Main function to create a wallet
 */
(async () => {
  try {
    await testCaseMap[TEST_CASE]();
  } catch (e) {
    logger.throwError(e.message);
  }
})();

/**
 * Creates a PKP wallet
 * @returns { PKPViemAccount } wallet
 */
function createPKPViemAccount(): PKPViemAccount {
  logger.log("...creating a PKP Viem Account");
  const account = new PKPViemAccount({
    controllerAuthSig: CONTROLLER_AUTHSIG,
    pkpPubKey: PKP_PUBKEY,
  });
  return account;
}
