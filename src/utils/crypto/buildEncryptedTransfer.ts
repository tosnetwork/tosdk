import type { Hex } from '../../types/misc.js'

export interface EncryptedTransferFields {
  /** [32]byte Pedersen commitment: amount * G + opening * H */
  commitment: Hex
  /** [32]byte sender's ElGamal decrypt handle */
  senderHandle: Hex
  /** [32]byte receiver's ElGamal decrypt handle */
  receiverHandle: Hex
  /** [32]byte source commitment (sender's current balance commitment) */
  sourceCommitment: Hex
  /** ~160 bytes ciphertext validity proof */
  ctValidityProof: Hex
  /** ~192 bytes commitment equality proof */
  commitmentEqProof: Hex
  /** ~736 bytes range proof (Bulletproof: balance - amount >= 0) */
  rangeProof: Hex
}

/**
 * Build encrypted transfer fields for a confidential transaction.
 *
 * Steps (when fully implemented):
 * 1. Generate random Pedersen opening (blinding factor)
 * 2. Compute commitment = amount * G + opening * H
 * 3. Compute senderHandle = opening * senderPubkey
 * 4. Compute receiverHandle = opening * receiverReceiveKey
 * 5. Extract sourceCommitment from senderBalance
 * 6. Generate CTValidityProof (sigma protocol)
 * 7. Generate CommitmentEqProof
 * 8. Generate RangeProof (Bulletproof: balance - amount >= 0)
 *
 * This requires implementing the full ZK proof system in TypeScript.
 * For initial deployment, delegate to a WASM module or native addon.
 *
 * @param amount - Plaintext amount to transfer (in tomi)
 * @param senderPrivateKey - Sender's ristretto255 private key
 * @param receiverReceiveKey - Receiver's ReceiveKey (ristretto255 public key)
 * @param senderBalance - Sender's current encrypted balance (0x-prefixed 128-char hex)
 * @returns Encrypted transfer fields to include in SignerTx
 */
export function buildEncryptedTransfer(
  _amount: bigint,
  _senderPrivateKey: Hex,
  _receiverReceiveKey: Hex,
  _senderBalance: Hex,
): EncryptedTransferFields {
  throw new Error(
    'buildEncryptedTransfer: ZK proof generation not yet implemented in SDK. ' +
      'Use toskey CLI or native wallet.',
  )
}
