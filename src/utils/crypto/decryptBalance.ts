import { ristretto255 } from '@noble/curves/ed25519'

import type { Hex } from '../../types/misc.js'
import { hexToBytes } from '../encoding/toBytes.js'

/**
 * Decrypt an encrypted balance (commitment + handle) using the owner's private key.
 *
 * The encrypted balance is a 128-char hex string (64 bytes, excluding 0x prefix):
 * - First 32 bytes: Pedersen commitment  C = amount * G + opening * H
 * - Last 32 bytes:  ElGamal decrypt handle  D = opening * pk_owner
 *
 * Decryption:
 *   M = C - sk * D   (removes the blinding factor)
 *   amount = ECDLP(M, G)  — discrete log of M base G
 *
 * The discrete log is solved via baby-step giant-step for small amounts.
 *
 * @param encryptedBalance - 0x-prefixed 128-char hex (commitment ‖ handle)
 * @param privateKey - 0x-prefixed 64-char hex, owner's ristretto255 private scalar
 * @returns plaintext balance in tomi
 */
export function decryptBalance(
  encryptedBalance: Hex,
  privateKey: Hex,
): bigint {
  const balanceBytes = hexToBytes(encryptedBalance)
  if (balanceBytes.length !== 64) {
    throw new Error(
      `decryptBalance: expected 64-byte encrypted balance, got ${balanceBytes.length} bytes`,
    )
  }

  const commitmentBytes = balanceBytes.slice(0, 32)
  const handleBytes = balanceBytes.slice(32, 64)

  const C = ristretto255.Point.fromBytes(commitmentBytes)
  const D = ristretto255.Point.fromBytes(handleBytes)

  const skBytes = hexToBytes(privateKey)
  const sk = ristretto255.Point.Fn.fromBytes(skBytes)

  // M = C - sk * D
  const skD = D.multiply(sk)
  const M = C.add(skD.negate())

  // Solve ECDLP: find amount such that M == amount * G
  // Baby-step giant-step over [0, 2^32) — covers balances up to ~4.29 billion tomi
  const G = ristretto255.Point.BASE
  const BABY_STEPS = 1 << 16 // 65536

  // Build baby-step table: i -> (i * G).toHex()
  const table = new Map<string, number>()
  let baby = ristretto255.Point.ZERO
  for (let i = 0; i < BABY_STEPS; i++) {
    table.set(baby.toHex(), i)
    baby = baby.add(G)
  }

  // Giant step = BABY_STEPS * G
  const giantStep = G.multiply(BigInt(BABY_STEPS)).negate()

  // Search: M - j * giantStep == i * G  =>  amount = j * BABY_STEPS + i
  let gamma = M
  for (let j = 0; j < BABY_STEPS; j++) {
    const key = gamma.toHex()
    const i = table.get(key)
    if (typeof i !== 'undefined') {
      return BigInt(j) * BigInt(BABY_STEPS) + BigInt(i)
    }
    gamma = gamma.add(giantStep)
  }

  throw new Error(
    'decryptBalance: ECDLP solver could not find amount in [0, 2^32). ' +
      'Balance may exceed the baby-step giant-step search range.',
  )
}
