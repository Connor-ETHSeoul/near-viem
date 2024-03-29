import {
  createWalletClient,
  http,
  verifyMessage,
  verifyTypedData,
  parseEther,
} from "viem";
import { NearViemAccountFactory } from "./lib/near-viem";
import { Account, KeyPair, connect, keyStores } from "near-api-js";
import { sepolia } from "viem/chains";

// get arguments from command line
const args = process.argv.slice(2);

/**
 * Test cases:
 * 1 = create a near Viem Account
 * 2 = create a Viem Wallet Client and send a transaction
 * 3 = create a near Viem Account and sign Typed Data
 * 4 = create a near Viem Account and sign message
 * 5 = create a near Viem Account and
 */
if (args.length === 0) {
  console.log("\nUsage: node main.js <test case number>\n");
  console.log(" Test cases:");
  console.log(" 1 = create a Near wallet");
  console.log(" 2 = create a Near wallet and sign message");
  console.log(" 3 = create a Near wallet and sign typed data");
  console.log(" 4 = create a Near wallet and send a transaction");
  console.log(" 5 = create a Near wallet and send Raw Transaction ");
  process.exit(0);
}

// const TEST_CASE = 1;
const TEST_CASE = parseInt(args[0]);

const testCaseMap = {
  1: testNearWallet,
  2: testNearWalletAndSignMessage,
  3: testNearWalletAndSignTypedData,
  4: testNearWalletAndSendTransaction,
  5: testNearWalletSendRawTransaction,
};

const TESTNET_CONFIG = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
};

interface NearConfig {
  networkId: string;
  nodeUrl: string;
}

/**
 * Loads Near Account from process.env.
 * Defaults to TESTNET_CONFIG if no network configuration is provided
 * @param network {NearConfig} network settings
 * @returns {Account}
 */
const nearAccountFromEnv = async (
  network: NearConfig = TESTNET_CONFIG
): Promise<Account> => {
  const keyPair = KeyPair.fromString(
    "ed25519:21G5n2oCE2oS88m9XEPVtDWqC5y4trc5r66Djq4ZJTDxt8nf1f53SnUUokXFVWAHsYdc9cvK89eqSZmoWJtDT5vH"
  );
  return nearAccountFromKeyPair({
    keyPair,
    accountId: "nearviem.testnet",
    network,
  });
};

/**
 * Loads Near Account from provided keyPair and accountId
 * Defaults to TESTNET_CONFIG
 * @param keyPair {KeyPair}
 * @param accountId {string}
 * @param network {NearConfig} network settings
 * @returns {Account}
 */
const nearAccountFromKeyPair = async (config: {
  keyPair: KeyPair;
  accountId: string;
  network?: NearConfig;
}): Promise<Account> => {
  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey("testnet", config.accountId, config.keyPair);
  const near = await connect({
    ...(config.network || TESTNET_CONFIG),
    keyStore,
  });
  const account = await near.account(config.accountId);
  return account;
};

async function testNearWallet() {
  const account = await createNearViemAccount();
  console.log("account", account.address);
}

async function testNearWalletAndSignMessage() {
  const account = await createNearViemAccount();

  const sig = await account.signMessage({ message: "Hello World" });

  const valid = await verifyMessage({
    address: account.address,
    message: "Hello World",
    signature: sig,
  });
  console.log("valid", valid);
}

async function testNearWalletAndSignTypedData() {
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

  const account = await createNearViemAccount();
  const signature = await account.signTypedData({
    domain: domain,
    types: types,
    primaryType: "Mail",
    message: message,
  });

  const valid = await verifyTypedData({
    address: account.address,
    domain,
    types,
    primaryType: "Mail",
    message,
    signature: signature,
  });
  console.log("valid", valid);
}

async function testNearWalletAndSendTransaction() {
  const account = await createNearViemAccount();
  const walletClient = createWalletClient({
    account: account,
    transport: http(),
    chain: sepolia,
  });

  const hash = await walletClient.sendTransaction({
    account,
    to: account.address,
    value: parseEther("0.0001"),
    chain: walletClient.chain,
    kzg: undefined,
  });
  // check hash at sepolia scan
  console.log("hash", hash);
}

async function testNearWalletSendRawTransaction() {
  const account = await createNearViemAccount();
  const walletClient = createWalletClient({
    account: account,
    transport: http(),
    chain: sepolia,
  });
  // const kzg = setupKzg(cKzg, mainnetTrustedSetupPath);
  const request = await walletClient.prepareTransactionRequest({
    account,
    to: account.address,
    value: parseEther("0.0001"),
    chain: walletClient.chain,
    kzg: undefined,
  });
  const signature = await walletClient.signTransaction(request);
  const hash = await walletClient.sendRawTransaction({
    serializedTransaction: signature,
  });
  // check hash at sepolia scan
  console.log("hash", hash);
}

/**
 * ========== STARTS HERE ==========
 * Main function to create a wallet
 */
(async () => {
  try {
    await testCaseMap[TEST_CASE]();
  } catch (e) {}
})();

async function createNearViemAccount() {
  const account = await nearAccountFromEnv();
  const viemAccount = await NearViemAccountFactory(account);
  return viemAccount;
}
