import type { ErrorType } from '../../errors/utils.js'
import type {
  Hex,
  Signature,
} from '../../types/misc.js'
import type {
  TransactionSignatureBundle,
  TransactionSerializable,
  TransactionSerializableNative,
  TransactionSerializableGeneric,
  TransactionSerialized,
  TransactionSerializedNative,
  TransactionType,
} from '../../types/transaction.js'
import type { MaybePromise } from '../../types/utils.js'
import { type ConcatHexErrorType, concatHex } from '../data/concat.js'
import {
  bytesToHex,
  type NumberToHexErrorType,
  numberToHex,
} from '../encoding/toHex.js'
import { type ToRlpErrorType, toRlp } from '../encoding/toRlp.js'
import {
  type AssertTransactionNativeErrorType,
  assertTransactionNative,
} from './assertTransaction.js'
import {
  type GetTransactionType,
  type GetTransactionTypeErrorType,
  getTransactionType,
} from './getTransactionType.js'

export type SerializedTransactionReturnType<
  _transactionType extends TransactionType = TransactionType,
> = TransactionSerialized

export type SerializeTransactionFn<
  transaction extends TransactionSerializableGeneric = TransactionSerializable,
  _transactionType extends TransactionType = TransactionType,
> = (
  transaction: transaction,
  signature?: Signature | undefined,
) => MaybePromise<TransactionSerialized>

export type SerializeTransactionErrorType =
  | GetTransactionTypeErrorType
  | SerializeTransactionNativeErrorType
  | ErrorType

export function serializeTransaction(
  transaction: TransactionSerializable,
  signature?: Signature | TransactionSignatureBundle | undefined,
): TransactionSerialized {
  const type = getTransactionType(transaction as any) as GetTransactionType
  if (type === 'native') {
    return serializeTransactionNative(
      transaction as TransactionSerializableNative,
      signature,
    ) as TransactionSerialized
  }
  throw new Error(`Unsupported transaction type: ${type}`)
}

export type SerializeTransactionNativeErrorType =
  | AssertTransactionNativeErrorType
  | ConcatHexErrorType
  | NumberToHexErrorType
  | ToRlpErrorType
  | ErrorType

function serializeTransactionNative(
  transaction: TransactionSerializableNative,
  signature?: Signature | TransactionSignatureBundle | undefined,
): TransactionSerializedNative {
  const {
    chainId,
    data,
    from,
    gas,
    nonce,
    signerType,
    sponsor,
    sponsorExpiry,
    sponsorNonce,
    sponsorPolicyHash,
    sponsorSignerType,
    terminalClass,
    to,
    trustTier,
    value,
    // Phase 0.3: encrypted transfer fields
    commitment,
    senderHandle,
    receiverHandle,
    sourceCommitment,
    ctValidityProof,
    commitmentEqProof,
    rangeProof,
    auditorHandle,
    encryptedMemo,
  } = transaction

  assertTransactionNative(transaction)

  const serializedTransaction = [
    toMinimalQuantityHex(chainId),
    toMinimalQuantityHex(nonce),
    toMinimalQuantityHex(gas),
    to ?? '0x',
    toMinimalQuantityHex(value),
    data ?? '0x',
    emptyAccessList,
    from,
    bytesToHex(new TextEncoder().encode(signerType)),
    sponsor ?? zeroAddress,
    bytesToHex(new TextEncoder().encode(sponsorSignerType ?? '')),
    toMinimalQuantityHex(sponsorNonce),
    toMinimalQuantityHex(sponsorExpiry),
    sponsorPolicyHash ?? zeroHash,
    toOptionalUint8Hex(terminalClass),
    toOptionalUint8Hex(trustTier),
    // Phase 0.3: encrypted transfer fields (match Go SignerTx struct order)
    commitment ?? '0x',
    senderHandle ?? '0x',
    receiverHandle ?? '0x',
    sourceCommitment ?? '0x',
    ctValidityProof ?? '0x',
    commitmentEqProof ?? '0x',
    rangeProof ?? '0x',
    auditorHandle ?? '0x',
    encryptedMemo ?? '0x',
    ...toNativeSignatureArray(executionSignature(signature)),
    ...toNativeSignatureArray(sponsorSignature(signature), true),
  ]

  return concatHex(['0x00', toRlp(serializedTransaction)]) as TransactionSerializedNative
}

const zeroAddress =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex
const zeroHash =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex
const emptyAccessList: readonly Hex[] = []

function toNativeSignatureArray(
  signature?: Signature | undefined,
  padAbsent = false,
): Hex[] {
  if (!signature) return padAbsent ? ['0x', '0x', '0x'] : []
  return [
    toMinimalQuantityHex(signature.v ?? BigInt(signature.yParity ?? 0)),
    rlpHex(signature.r),
    rlpHex(signature.s),
  ]
}

function toOptionalUint8Hex(value: number | undefined): Hex {
  if (!value) return '0x'
  return rlpHex(numberToHex(value))
}

function toMinimalQuantityHex(value: number | bigint | undefined): Hex {
  if (typeof value === 'undefined') return '0x'
  return rlpHex(numberToHex(value))
}

function rlpHex(hex: Hex): Hex {
  if (hex === '0x') return hex
  return hex.replace(/^0x0+/, '0x').replace(/^0x$/, '0x0') as Hex
}

function isTransactionSignatureBundle(
  signature: Signature | TransactionSignatureBundle | undefined,
): signature is TransactionSignatureBundle {
  return (
    typeof signature === 'object' &&
    signature !== null &&
    'execution' in signature
  )
}

function executionSignature(
  signature: Signature | TransactionSignatureBundle | undefined,
) {
  if (isTransactionSignatureBundle(signature)) return signature.execution
  return signature
}

function sponsorSignature(
  signature: Signature | TransactionSignatureBundle | undefined,
) {
  if (isTransactionSignatureBundle(signature)) return signature.sponsor
  return undefined
}
