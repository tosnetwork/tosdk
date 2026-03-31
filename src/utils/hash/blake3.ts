import { blake3 } from '@noble/hashes/blake3'

import type { ErrorType } from '../../errors/utils.js'
import type { ByteArray, Hex } from '../../types/misc.js'
import { type IsHexErrorType, isHex } from '../data/isHex.js'
import { type ToBytesErrorType, toBytes } from '../encoding/toBytes.js'
import { type ToHexErrorType, toHex } from '../encoding/toHex.js'

type To = 'hex' | 'bytes'

export type Blake3Hash<to extends To> =
  | (to extends 'bytes' ? ByteArray : never)
  | (to extends 'hex' ? Hex : never)

export type Blake3ErrorType =
  | IsHexErrorType
  | ToBytesErrorType
  | ToHexErrorType
  | ErrorType

export function blake3Hash<to extends To = 'hex'>(
  value: Hex | ByteArray,
  to_?: to | undefined,
): Blake3Hash<to> {
  const to = to_ || 'hex'
  const bytes = blake3(
    isHex(value, { strict: false }) ? toBytes(value) : value,
  )
  if (to === 'bytes') return bytes as Blake3Hash<to>
  return toHex(bytes) as Blake3Hash<to>
}
