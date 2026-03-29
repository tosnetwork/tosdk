import type { Address } from './address.js'
import type { Hex, Signature } from './misc.js'

export type TransactionType = 'native' | (string & {})

export type TransactionSerializableNative = {
  type?: 'native' | undefined
  chainId: number | bigint
  nonce: number | bigint
  gas: number | bigint
  to?: Address | null | undefined
  value: number | bigint
  data?: Hex | undefined
  from: Address
  signerType: string
  sponsor?: Address | undefined
  sponsorSignerType?: string | undefined
  sponsorNonce?: number | bigint | undefined
  sponsorExpiry?: number | bigint | undefined
  sponsorPolicyHash?: Hex | undefined
  terminalClass?: number | undefined
  trustTier?: number | undefined

  // Phase 0.3: encrypted transfer fields (optional, for commitment-based transfers)
  commitment?: Hex | undefined           // [32]byte transfer commitment
  senderHandle?: Hex | undefined         // [32]byte sender handle
  receiverHandle?: Hex | undefined       // [32]byte receiver handle
  sourceCommitment?: Hex | undefined     // [32]byte source commitment
  ctValidityProof?: Hex | undefined      // ~160 bytes ciphertext validity proof
  commitmentEqProof?: Hex | undefined    // ~192 bytes commitment equality proof
  rangeProof?: Hex | undefined           // ~736 bytes range proof
  auditorHandle?: Hex | undefined        // [32]byte optional auditor handle
  encryptedMemo?: Hex | undefined        // optional encrypted memo
}

export type TerminalClass = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type TrustTier = 0 | 1 | 2 | 3 | 4

export const TerminalClassLabel: Record<number, string> = {
  0: 'app',
  1: 'card',
  2: 'pos',
  3: 'voice',
  4: 'kiosk',
  5: 'robot',
  6: 'api',
}

export const TrustTierLabel: Record<number, string> = {
  0: 'untrusted',
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'full',
}

export type TransactionSerializable = TransactionSerializableNative
export type TransactionSerializableGeneric = TransactionSerializable

export type TransactionSerializedNative = Hex
export type TransactionSerialized = Hex
export type TransactionSerializedGeneric = Hex

export type Transaction<
  quantity = bigint,
  index = number,
  type extends TransactionType = 'native',
> = {
  blockHash: Hex
  blockNumber: quantity
  from: Address
  gas: quantity
  hash: Hex
  input: Hex
  nonce: index
  r: Hex
  s: Hex
  to: Address | null
  type: type
  typeHex: Hex | null
  v: quantity
  value: quantity
  yParity: number
}

export type TransactionReceipt<
  quantity = bigint,
  index = number,
  status = 'success' | 'reverted',
  type extends TransactionType = 'native',
> = {
  blockHash: Hex
  blockNumber: quantity
  contractAddress: Address | null | undefined
  cumulativeGasUsed: quantity
  effectiveGasPrice: quantity
  from: Address
  gasUsed: quantity
  logs: unknown[]
  logsBloom: Hex
  status: status
  to: Address | null
  transactionHash: Hex
  transactionIndex: index
  type: type
}

export type SignatureValues = Signature<0 | 1, bigint>

export type TransactionSignatureBundle = {
  execution: Signature
  sponsor?: Signature | undefined
}
