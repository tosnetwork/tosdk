import type { ErrorType } from '../../errors/utils.js'
import type { Address } from '../../types/address.js'
import type { Hex } from '../../types/misc.js'
import {
  type GetAddressErrorType,
} from '../../utils/address/getAddress.js'
import { type Blake3ErrorType } from '../../utils/hash/blake3.js'
import {
  publicKeyToNativeAddress,
  type PublicKeyToNativeAddressErrorType,
} from './nativeSigner.js'
export type PublicKeyToAddressErrorType =
  | GetAddressErrorType
  | Blake3ErrorType
  | PublicKeyToNativeAddressErrorType
  | ErrorType

/**
 * @description Converts an ed25519 public key to a 32-byte native address.
 *
 * @param publicKey The public key to convert.
 *
 * @returns The address.
 */
export function publicKeyToAddress(publicKey: Hex): Address {
  return publicKeyToNativeAddress({ publicKey, signerType: 'ed25519' })
}

export function signerPublicKeyToAddress(
  publicKey: Hex,
  signerType?: string,
): Address {
  return publicKeyToNativeAddress({ publicKey, signerType })
}
