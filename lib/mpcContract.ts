import { Contract, Account } from "near-api-js";
import {
  deriveChildPublicKey,
  najPublicKeyStrToUncompressedHexPoint,
} from "./kdf";
import BN from "bn.js";
import { ChangeMethodArgs, MPCSignature, SignArgs } from "./types";

interface MultichainContractInterface extends Contract {
  // Define the signature for the `public_key` view method
  public_key: () => Promise<string>;

  // Define the signature for the `sign` change method
  sign: (args: ChangeMethodArgs<SignArgs>) => Promise<[string, string]>;
}

export const TGAS = new BN(1000000000000);
export const NO_DEPOSIT = "0";

/**
 * High-level interface for the Near MPC-Recovery Contract
 * located in: https://github.com/near/mpc-recovery
 */
export class MultichainContract {
  contract: MultichainContractInterface;

  constructor(account: Account, contractId: string) {
    this.contract = new Contract(account, contractId, {
      changeMethods: ["sign"],
      viewMethods: ["public_key"],
      useLocalViewExecution: false,
    }) as MultichainContractInterface;
  }

  deriveEthPublicKey = async (
    derivationPath: string
  ): Promise<string> => {
    const rootPublicKey = await this.contract.public_key();

    const publicKey = await deriveChildPublicKey(
      najPublicKeyStrToUncompressedHexPoint(rootPublicKey),
      this.contract.account.accountId,
      derivationPath
    );

    return publicKey;
  };

  requestSignature = async (
    signArgs: SignArgs,
    gas?: BN
  ): Promise<MPCSignature> => {
    const [big_r, big_s] = await this.contract.sign({
      args: signArgs,
      // Default of 300 TGAS
      gas: gas || TGAS.muln(300),
      attachedDeposit: new BN(NO_DEPOSIT),
    });
    return { big_r, big_s };
  };
}
