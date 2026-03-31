import type { TypedData } from 'abitype'
import type { ErrorType } from '../../errors/utils.js'
import type { Hex } from '../../types/misc.js'
import type { TypedDataDefinition } from '../../types/typedData.js'
import {
  type HashTypedDataErrorType,
  hashTypedData,
} from '../../utils/signature/hashTypedData.js'
import { type SignErrorType, sign } from './sign.js'

export type SignTypedDataParameters<
  typedData extends TypedData | Record<string, unknown> = TypedData,
  primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
> = TypedDataDefinition<typedData, primaryType> & {
  /** The private key to sign with. */
  privateKey: Hex
  /** The signer type to use. */
  signerType?: string | undefined
}

export type SignTypedDataReturnType = Hex

export type SignTypedDataErrorType =
  | HashTypedDataErrorType
  | SignErrorType
  | ErrorType

/**
 * @description Signs typed data using the canonical typed-data digest:
 * `sign(blake3("\x19\x01" ‖ domainSeparator ‖ hashStruct(message)))`.
 *
 * @returns The signature.
 */
export async function signTypedData<
  const typedData extends TypedData | Record<string, unknown>,
  primaryType extends keyof typedData | 'EIP712Domain',
>(
  parameters: SignTypedDataParameters<typedData, primaryType>,
): Promise<SignTypedDataReturnType> {
  const { privateKey, signerType, ...typedData } =
    parameters as unknown as SignTypedDataParameters
  return await sign({
    hash: hashTypedData(typedData),
    privateKey,
    signerType,
    to: 'hex',
  })
}
