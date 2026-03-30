import { ed25519 } from '@noble/curves/ed25519'

import type { ErrorType } from '../errors/utils.js'
import type { Hex } from '../types/misc.js'
import { type ToHexErrorType, toHex } from '../utils/encoding/toHex.js'

export type GeneratePrivateKeyErrorType = ToHexErrorType | ErrorType

/**
 * @description Generates a random ed25519 private key.
 *
 * @returns A randomly generated private key.
 */
export function generatePrivateKey(): Hex {
  return toHex(ed25519.utils.randomPrivateKey())
}
