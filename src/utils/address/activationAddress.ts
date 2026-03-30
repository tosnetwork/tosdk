import { bech32 } from '@scure/base'
import type { Hex } from '../../types/misc.js'
import { hexToBytes } from '../encoding/toBytes.js'
import { bytesToHex } from '../encoding/toHex.js'
import { keccak256 } from '../hash/keccak256.js'
import { getAddress } from './getAddress.js'

const ACTIVATION_HRP = 'tos'
const ED25519_PUBKEY_LENGTH = 32
const RECEIVE_KEY_LENGTH = 32
const CHECKSUM_LENGTH = 4

/**
 * Encode an activation address from ed25519 public key and ReceiveKey.
 *
 * Format: tos1<bech32(ed25519_pub ++ receive_key ++ checksum)>
 * The checksum is the first 4 bytes of keccak256(ed25519_pub ++ receive_key).
 *
 * @param ed25519Pubkey - 32-byte ed25519 public key (hex-encoded)
 * @param receiveKey - 32-byte ReceiveKey (ristretto255 point, hex-encoded)
 * @returns Bech32-encoded activation address string (e.g. "tos1...")
 */
export function encodeActivationAddress(
  ed25519Pubkey: Uint8Array,
  receiveKey: Uint8Array,
): string {
  if (ed25519Pubkey.length !== ED25519_PUBKEY_LENGTH) {
    throw new Error(
      `ed25519 public key must be ${ED25519_PUBKEY_LENGTH} bytes, got ${ed25519Pubkey.length}`,
    )
  }
  if (receiveKey.length !== RECEIVE_KEY_LENGTH) {
    throw new Error(
      `ReceiveKey must be ${RECEIVE_KEY_LENGTH} bytes, got ${receiveKey.length}`,
    )
  }

  // Compute checksum: first 4 bytes of keccak256(pubkey ++ receiveKey)
  const payload = new Uint8Array(ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH)
  payload.set(ed25519Pubkey, 0)
  payload.set(receiveKey, ED25519_PUBKEY_LENGTH)

  const checksumHash = hexToBytes(
    keccak256(bytesToHex(payload)),
  )
  const checksum = checksumHash.slice(0, CHECKSUM_LENGTH)

  // Final data: pubkey ++ receiveKey ++ checksum
  const data = new Uint8Array(
    ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH + CHECKSUM_LENGTH,
  )
  data.set(ed25519Pubkey, 0)
  data.set(receiveKey, ED25519_PUBKEY_LENGTH)
  data.set(checksum, ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH)

  const words = bech32.toWords(data)
  return bech32.encode(ACTIVATION_HRP, words, 200)
}

/**
 * Decode an activation address back to its component parts.
 *
 * @param addr - Bech32-encoded activation address (e.g. "tos1...")
 * @returns Object containing the ed25519 public key and ReceiveKey
 * @throws If the address is malformed or the checksum is invalid
 */
export function decodeActivationAddress(addr: string): {
  ed25519Pubkey: Uint8Array
  receiveKey: Uint8Array
} {
  const { prefix, words } = bech32.decode(addr as `${string}1${string}`, 200)
  if (prefix !== ACTIVATION_HRP) {
    throw new Error(
      `Invalid activation address prefix: expected "${ACTIVATION_HRP}", got "${prefix}"`,
    )
  }

  const data = bech32.fromWords(words)
  const expectedLength =
    ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH + CHECKSUM_LENGTH
  if (data.length !== expectedLength) {
    throw new Error(
      `Invalid activation address data length: expected ${expectedLength}, got ${data.length}`,
    )
  }

  const ed25519Pubkey = data.slice(0, ED25519_PUBKEY_LENGTH)
  const receiveKey = data.slice(
    ED25519_PUBKEY_LENGTH,
    ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH,
  )
  const checksum = data.slice(
    ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH,
  )

  // Verify checksum
  const payload = new Uint8Array(ED25519_PUBKEY_LENGTH + RECEIVE_KEY_LENGTH)
  payload.set(ed25519Pubkey, 0)
  payload.set(receiveKey, ED25519_PUBKEY_LENGTH)
  const expectedChecksum = hexToBytes(
    keccak256(bytesToHex(payload)),
  ).slice(0, CHECKSUM_LENGTH)

  for (let i = 0; i < CHECKSUM_LENGTH; i++) {
    if (checksum[i] !== expectedChecksum[i]) {
      throw new Error('Invalid activation address checksum')
    }
  }

  return {
    ed25519Pubkey: Uint8Array.from(ed25519Pubkey),
    receiveKey: Uint8Array.from(receiveKey),
  }
}

/**
 * Derive on-chain address from an ed25519 public key.
 *
 * The on-chain address is keccak256(pubkey) truncated to 32 bytes,
 * formatted as a 0x-prefixed hex string.
 *
 * @param ed25519Pubkey - 32-byte ed25519 public key
 * @returns 32-byte on-chain address as Hex
 */
export function deriveOnChainAddress(ed25519Pubkey: Uint8Array): Hex {
  if (ed25519Pubkey.length !== ED25519_PUBKEY_LENGTH) {
    throw new Error(
      `ed25519 public key must be ${ED25519_PUBKEY_LENGTH} bytes, got ${ed25519Pubkey.length}`,
    )
  }
  return getAddress(keccak256(bytesToHex(ed25519Pubkey))) as Hex
}
