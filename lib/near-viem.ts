import { Account } from "near-api-js";
import {
  SignableMessage,
  isBytes,
  toBytes,
  LocalAccount,
  signatureToHex,
  Hash,
  hashMessage,
  TypedDataDefinition,
  TypedData,
  hashTypedData,
  keccak256,
  Signature,
  serializeTransaction,
  Hex,
  Address,
  TransactionSerializableGeneric,
  verifyMessage,
  verifyTypedData,
  recoverTransactionAddress,
  TransactionSerialized,
} from "viem";
import { SerializeTransactionFn, publicKeyToAddress, toHex } from "viem/utils";
import { MultichainContract } from "./mpcContract";
import { uncompressedHexPointToEvmAddress } from "./kdf";

const MPC_CONTRACT = "multichain-testnet-2.testnet";

export async function NearViemAccountFactory(
  account: Account,
  contractId: string = MPC_CONTRACT,
  derivationPath: string = "ethereum,1"
) {
  const multichainContract = new MultichainContract(account, contractId);
  // TODO fix public key
  const publicKey = await multichainContract.deriveEthPublicKey(derivationPath);
  const address = uncompressedHexPointToEvmAddress(publicKey);
  // const address = publicKeyToAddress(publicKey);

  return new NearViemAccount(
    toHex(publicKey),
    address,
    multichainContract,
    derivationPath
  );
}

export class NearViemAccount implements LocalAccount {
  readonly publicKey!: Hex;
  readonly source = "custom";
  readonly type = "local";
  readonly address!: Address;
  private multichainContract: MultichainContract;
  readonly derivationPath: string;

  constructor(
    publicKey: Hex,
    address: Address,
    multichainContract: MultichainContract,
    derivationPath: string
  ) {
    this.publicKey = publicKey;
    this.address = address;
    this.multichainContract = multichainContract;
    this.derivationPath = derivationPath;
  }

  async signMessage({ message }: { message: SignableMessage }): Promise<Hash> {
    const [signature0, signature1] = await this.sign(hashMessage(message));
    const [valid0, valid1] = await Promise.all([
      verifyMessage({
        address: this.address,
        message: message,
        signature: signatureToHex(signature0),
      }),
      verifyMessage({
        address: this.address,
        message: message,
        signature: signatureToHex(signature1),
      }),
    ]);

    if (!valid0 && !valid1) {
      throw new Error("Invalid signature");
    } else if (valid0) {
      return signatureToHex(signature0);
    } else {
      return signatureToHex(signature1);
    }
  }

  async signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData
  >(typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hash> {
    const [signature0, signature1] = await this.sign(hashTypedData(typedData));

    const [valid0, valid1] = await Promise.all([
      verifyTypedData({
        address: this.address,
        signature: signatureToHex(signature0),
        types: typedData.types,
        primaryType: typedData.primaryType as any,
        message: typedData.message as any,
        domain: typedData.domain,
      }),
      verifyTypedData({
        address: this.address,
        signature: signatureToHex(signature1),
        types: typedData.types,
        primaryType: typedData.primaryType as any,
        message: typedData.message as any,
        domain: typedData.domain,
      }),
    ]);
    if (!valid0 && !valid1) {
      throw new Error("Invalid signature");
    } else if (valid0) {
      return signatureToHex(signature0);
    } else {
      return signatureToHex(signature1);
    }
  }

  async signTransaction<
    serializer extends SerializeTransactionFn<TransactionSerializableGeneric> = SerializeTransactionFn<TransactionSerializableGeneric>,
    transaction extends Parameters<serializer>[0] = Parameters<serializer>[0]
  >(
    transaction: transaction,
    args?:
      | {
          serializer?: serializer | undefined;
        }
      | undefined
  ) {
    if (args === undefined || args.serializer === undefined) {
      const [signature0, signature1] = await this.sign(
        keccak256(serializeTransaction(transaction))
      );
      const tx0 = serializeTransaction(transaction, signature0);
      const tx1 = serializeTransaction(transaction, signature1);
      const [address0, address1] = await Promise.all([
        recoverTransactionAddress({
          serializedTransaction: tx0 as TransactionSerialized,
        }),
        recoverTransactionAddress({
          serializedTransaction: tx1 as TransactionSerialized,
        }),
      ]);
      if (address0.toLowerCase() === this.address.toLowerCase()) {
        return tx0;
      } else if (address1.toLowerCase() === this.address.toLowerCase()) {
        return tx1;
      } else {
        throw new Error("Invalid signature");
      }
    } else {
      const [signature0, signature1] = await this.sign(
        keccak256(args.serializer(transaction))
      );
      const tx0 = args.serializer(transaction, signature0);
      const tx1 = args.serializer(transaction, signature1);
      const [address0, address1] = await Promise.all([
        recoverTransactionAddress({
          serializedTransaction: tx0 as TransactionSerialized,
        }),
        recoverTransactionAddress({
          serializedTransaction: tx1 as TransactionSerialized,
        }),
      ]);
      if (address0.toLowerCase() === this.address.toLowerCase()) {
        return tx0;
      } else if (address1.toLowerCase() === this.address.toLowerCase()) {
        return tx1;
      } else {
        throw new Error("Invalid signature");
      }
    }
  }

  async sign(msgHash: `0x${string}`): Promise<[Signature, Signature]> {
    const hashToSign = isBytes(msgHash) ? msgHash : toBytes(msgHash);

    const nearSignature = await this.multichainContract.requestSignature({
      path: this.derivationPath,
      payload: Array.from(hashToSign.reverse()),
      key_version: 0,
    });

    const signature0: Signature = {
      r: `0x${nearSignature.big_r.substring(2)}` as Hex,
      s: `0x${nearSignature.big_s}` as Hex,
      yParity: 0,
    };

    const signature1: Signature = {
      r: `0x${nearSignature.big_r.substring(2)}` as Hex,
      s: `0x${nearSignature.big_s}` as Hex,
      yParity: 1,
    };

    return [signature0, signature1];
  }
}
