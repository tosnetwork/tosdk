import { ed25519, ristretto255 } from '@noble/curves/ed25519'
import { sha3_512 } from '@noble/hashes/sha3'

import { type ErrorType } from '../../errors/utils.js'
import type { Address } from '../../types/address.js'
import type { ByteArray, Hash, Hex, Signature } from '../../types/misc.js'
import { getAddress } from '../../utils/address/getAddress.js'
import { concat } from '../../utils/data/concat.js'
import { pad } from '../../utils/data/pad.js'
import { hexToBytes } from '../../utils/encoding/toBytes.js'
import { bytesToHex } from '../../utils/encoding/toHex.js'
import { keccak256 } from '../../utils/hash/keccak256.js'

type SignerType = 'ed25519' | 'elgamal'

type To = 'object' | 'bytes' | 'hex'

export type NormalizeSignerTypeErrorType = ErrorType

export function normalizeSignerType(value?: string): SignerType {
  const normalized = (value || 'ed25519').trim().toLowerCase()
  if (normalized === 'ed25519' || normalized === 'elgamal') {
    return normalized
  }
  throw new Error(`Unsupported signer type: ${value || 'undefined'}`)
}

export type SignHashParameters<to extends To = 'object'> = {
  hash: Hash
  privateKey: Hex
  signerType?: string | undefined
  to?: to | To | undefined
  extraEntropy?: Hex | boolean | undefined
}

export type SignHashReturnType<to extends To = 'object'> =
  | (to extends 'object' ? Signature : never)
  | (to extends 'bytes' ? ByteArray : never)
  | (to extends 'hex' ? Hex : never)

export type VerifyHashSignatureParameters = {
  hash: Hash
  publicKey: Hex
  signerType?: string | undefined
  signature: Hex | ByteArray | Signature
}

export type VerifyHashSignatureErrorType = ErrorType

export type PublicKeyToNativeAddressParameters = {
  publicKey: Hex
  signerType?: string | undefined
}

export type PublicKeyToNativeAddressErrorType = ErrorType

export function publicKeyToNativeAddress({
  publicKey,
  signerType,
}: PublicKeyToNativeAddressParameters): Address {
  normalizeSignerType(signerType) // validate
  const publicKeyBytes = hexToBytes(publicKey)
  const hashInput = bytesToHex(publicKeyBytes)
  return getAddress(keccak256(hashInput))
}

export async function signHash<to extends To = 'object'>({
  hash,
  privateKey,
  signerType,
  to = 'object',
}: SignHashParameters<to>): Promise<SignHashReturnType<to>> {
  const normalizedSignerType = normalizeSignerType(signerType)
  const hashBytes = hexToBytes(hash)
  const privateKeyBytes = hexToBytes(privateKey)

  const rawSignature =
    normalizedSignerType === 'ed25519'
      ? ed25519.sign(hashBytes, privateKeyBytes)
      : signElgamal(hashBytes, privateKeyBytes)

  const signatureObject = rawBytesToSignature(rawSignature)
  return (() => {
    if (to === 'bytes') return signatureToCanonicalBytes(signatureObject)
    if (to === 'hex') return signatureToCanonicalHex(signatureObject)
    return signatureObject
  })() as SignHashReturnType<to>
}

export async function verifyHashSignature({
  hash,
  publicKey,
  signerType,
  signature,
}: VerifyHashSignatureParameters): Promise<boolean> {
  const normalizedSignerType = normalizeSignerType(signerType)
  const hashBytes = hexToBytes(hash)
  const publicKeyBytes = hexToBytes(publicKey)
  const signatureBytes = signatureToRawBytes(signature)

  if (normalizedSignerType === 'ed25519') {
    return ed25519.verify(signatureBytes, hashBytes, publicKeyBytes)
  }
  return verifyElgamal(hashBytes, publicKeyBytes, signatureBytes)
}

export function elgamalPublicKeyFromPrivateKey(privateKey: Hex | ByteArray): ByteArray {
  const privateKeyBytes =
    typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey
  const secret = scalarFromCanonicalBytes(privateKeyBytes, 'invalid elgamal private key')
  if (secret === ristretto255.Point.Fn.ZERO) {
    throw new Error('invalid elgamal private key')
  }
  return elgamalGeneratorH()
    .multiply(ristretto255.Point.Fn.inv(secret))
    .toRawBytes()
}

export function signatureToRawBytes(
  signature: Hex | ByteArray | Signature,
): ByteArray {
  if (typeof signature === 'string') {
    return normalizeRawSignature(hexToBytes(signature))
  }
  if (signature instanceof Uint8Array) {
    return normalizeRawSignature(signature)
  }

  const r = pad(hexToBytes(signature.r as Hex), { size: 32 })
  const s = pad(hexToBytes(signature.s as Hex), { size: 32 })
  return concat([r, s])
}

function signatureToCanonicalBytes(signature: Signature): ByteArray {
  return concat([
    pad(hexToBytes(signature.r as Hex), { size: 32 }),
    pad(hexToBytes(signature.s as Hex), { size: 32 }),
  ])
}

function signatureToCanonicalHex(signature: Signature): Hex {
  return bytesToHex(signatureToCanonicalBytes(signature))
}

function normalizeRawSignature(signature: ByteArray): ByteArray {
  if (signature.length !== 64) {
    throw new Error(`Invalid signature length: ${signature.length}`)
  }
  return signature
}

function rawBytesToSignature(signature: ByteArray): Signature {
  return {
    r: bytesToHex(signature.slice(0, 32), { size: 32 }),
    s: bytesToHex(signature.slice(32), { size: 32 }),
    v: 0n,
  }
}

function signElgamal(hash: ByteArray, privateKey: ByteArray): ByteArray {
  const secret = scalarFromCanonicalBytes(privateKey, 'invalid elgamal private key')
  if (secret === ristretto255.Point.Fn.ZERO) {
    throw new Error('invalid elgamal private key')
  }
  const k = randomElgamalScalar()
  const h = elgamalGeneratorH()
  const inverse = ristretto255.Point.Fn.inv(secret)
  const publicKey = h.multiply(inverse).toRawBytes()
  const rPoint = h.multiply(k).toRawBytes()
  const e = elgamalHashToScalar(publicKey, hash, rPoint)
  const s = ristretto255.Point.Fn.add(
    ristretto255.Point.Fn.mul(inverse, e),
    k,
  )
  return concat([
    ristretto255.Point.Fn.toBytes(s),
    ristretto255.Point.Fn.toBytes(e),
  ])
}

function verifyElgamal(
  hash: ByteArray,
  publicKey: ByteArray,
  signature: ByteArray,
): boolean {
  if (publicKey.length !== 32 || signature.length !== 64) return false
  try {
    const publicPoint = ristretto255.Point.fromBytes(publicKey)
    const s = scalarFromCanonicalBytes(signature.slice(0, 32), 'invalid elgamal signature')
    const e = scalarFromCanonicalBytes(signature.slice(32, 64), 'invalid elgamal signature')
    const h = elgamalGeneratorH()
    const rPoint = h.multiply(s).add(publicPoint.multiply(ristretto255.Point.Fn.neg(e)))
    const calculated = elgamalHashToScalar(publicKey, hash, rPoint.toRawBytes())
    return ristretto255.Point.Fn.eql(e, calculated)
  } catch {
    return false
  }
}

function scalarFromCanonicalBytes(bytes: ByteArray, errorMessage: string): bigint {
  try {
    return ristretto255.Point.Fn.fromBytes(bytes)
  } catch {
    throw new Error(errorMessage)
  }
}

function randomElgamalScalar(): bigint {
  const bytes = randomBytes(64)
  const value = ristretto255.Point.Fn.create(bytesToBigIntLE(bytes))
  if (ristretto255.Point.Fn.is0(value)) return randomElgamalScalar()
  return value
}

let cachedElgamalGeneratorH: InstanceType<typeof ristretto255.Point> | undefined

function elgamalGeneratorH() {
  if (!cachedElgamalGeneratorH) {
    const base = ristretto255.Point.BASE.toRawBytes()
    cachedElgamalGeneratorH = ristretto255.Point.hashToCurve(sha3_512(base))
  }
  return cachedElgamalGeneratorH
}

function elgamalHashToScalar(
  publicKey: ByteArray,
  hash: ByteArray,
  point: ByteArray,
): bigint {
  return ristretto255.Point.Fn.create(
    bytesToBigIntLE(sha3_512(concat([publicKey, hash, point]))),
  )
}

function bytesToBigIntLE(bytes: ByteArray): bigint {
  let value = 0n
  for (let index = bytes.length - 1; index >= 0; index--) {
    value = (value << 8n) + BigInt(bytes[index]!)
  }
  return value
}

function randomBytes(length: number): Uint8Array {
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    throw new Error('crypto.getRandomValues is required')
  }
  return cryptoApi.getRandomValues(new Uint8Array(length))
}
