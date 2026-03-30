import type { ErrorType } from '../../errors/utils.js'
import type { ByteArray, Hex, Signature } from '../../types/misc.js'
import { type HexToBigIntErrorType } from '../encoding/fromHex.js'
import { hexToBytes } from '../encoding/toBytes.js'
import { bytesToHex } from '../encoding/toHex.js'
import type { ToHexErrorType } from '../encoding/toHex.js'
import { pad } from '../data/pad.js'
import { concat } from '../data/concat.js'

type To = 'bytes' | 'hex'

export type SerializeSignatureParameters<to extends To = 'hex'> = Signature & {
  to?: to | To | undefined
}

export type SerializeSignatureReturnType<to extends To = 'hex'> =
  | (to extends 'hex' ? Hex : never)
  | (to extends 'bytes' ? ByteArray : never)

export type SerializeSignatureErrorType =
  | HexToBigIntErrorType
  | ToHexErrorType
  | ErrorType

/**
 * @description Converts a signature into hex format (r ++ s ++ v).
 *
 * @param signature The signature to convert.
 * @returns The signature in hex format.
 *
 * @example
 * serializeSignature({
 *   r: '0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf',
 *   s: '0x4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db8',
 *   yParity: 1
 * })
 * // "0x6e100a352ec6ad1b70802290e18aeed190704973570f3b8ed42cb9808e2ea6bf4a90a229a244495b41890987806fcbd2d5d23fc0dbe5f5256c2613c039d76db81c"
 */
export function serializeSignature<to extends To = 'hex'>({
  r,
  s,
  to = 'hex',
  v,
  yParity,
}: SerializeSignatureParameters<to>): SerializeSignatureReturnType<to> {
  const yParity_ = (() => {
    if (yParity === 0 || yParity === 1) return yParity
    if (v && (v === 27n || v === 28n || v >= 35n)) return v % 2n === 0n ? 1 : 0
    throw new Error('Invalid `v` or `yParity` value')
  })()
  const rBytes = pad(hexToBytes(r), { size: 32 })
  const sBytes = pad(hexToBytes(s), { size: 32 })
  const vByte = new Uint8Array([yParity_ === 0 ? 0x1b : 0x1c])
  const signatureBytes = concat([rBytes, sBytes, vByte])
  const signature = bytesToHex(signatureBytes) as Hex

  if (to === 'hex') return signature as SerializeSignatureReturnType<to>
  return hexToBytes(signature) as SerializeSignatureReturnType<to>
}
