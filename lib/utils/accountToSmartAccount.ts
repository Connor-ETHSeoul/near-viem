import { Hex, LocalAccount } from "viem";
import { SignTypedDataParameters } from "viem/accounts/utils/signTypedData";
import { PKPViemAccount } from "../pkp-viem";


// This is for ZeroDev AA SDK ECDSAProvider 
export function convertAccountToSmartAccountSigner(account: LocalAccount<'privateKey'>) {
  return {
    getAddress: async () => account.address,
    signMessage: async (message: Uint8Array | Hex | string) =>
      await account.signMessage({
        message:
          typeof message === "string"
            ? message
            : {
                raw: message,
              },
      }),
    signTypedData: async (
      params: Omit<SignTypedDataParameters, "privateKey">
    ) => await account.signTypedData({ ...params }),
  };
}
