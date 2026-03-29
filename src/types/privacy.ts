import type { BlockTag } from './client.js'
import type { Hex } from './misc.js'

export type GetPrivBalanceParameters = {
  pubkey: Hex
  blockTag?: BlockTag | number | bigint | undefined
}

export type GetPrivNonceParameters = {
  pubkey: Hex
  blockTag?: BlockTag | number | bigint | undefined
}

/**
 * Phase 0.3: balance fields now come from account state, not separate storage
 * slots. `handle` and `version` are account-level encrypted balance metadata.
 */
export type PrivBalanceRecord = {
  pubkey: Hex
  commitment: Hex       // [32]byte Pedersen commitment
  handle: Hex           // [32]byte ElGamal handle
  version: bigint       // encrypted balance version counter
  nonce: bigint         // account nonce (replaces privNonce)
  blockNumber: bigint
}

/**
 * Phase 0.3: encrypted balance info returned by getEncryptedBalance.
 * Same underlying data as PrivBalanceRecord, keyed by address instead of pubkey.
 */
export type EncryptedBalanceInfo = {
  balance: Hex          // commitment [32]byte
  handle: Hex           // ElGamal handle [32]byte
  version: bigint
  nonce: bigint
}
