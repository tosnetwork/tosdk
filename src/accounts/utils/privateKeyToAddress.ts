import { ed25519 } from '@noble/curves/ed25519'

import type { ErrorType } from '../../errors/utils.js'
import type { Address } from '../../types/address.js'
import type { Hex } from '../../types/misc.js'
import {
  type BytesToHexErrorType,
  bytesToHex,
} from '../../utils/encoding/toHex.js'
import {
  type PublicKeyToAddressErrorType,
  signerPublicKeyToAddress,
} from './publicKeyToAddress.js'

export type PrivateKeyToAddressErrorType =
  | BytesToHexErrorType
  | PublicKeyToAddressErrorType
  | ErrorType

/**
 * @description Converts an ed25519 private key to a 32-byte native address.
 *
 * @param privateKey The private key to convert.
 *
 * @returns The address.
 */
export function privateKeyToAddress(privateKey: Hex): Address {
  const publicKey = bytesToHex(ed25519.getPublicKey(privateKey.slice(2)))
  return signerPublicKeyToAddress(publicKey, 'ed25519')
}
