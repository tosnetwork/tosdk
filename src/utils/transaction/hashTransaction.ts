import type { ErrorType } from '../../errors/utils.js'
import type { Hash } from '../../types/misc.js'
import type { TransactionSerializable } from '../../types/transaction.js'
import {
  type Blake3ErrorType,
  blake3Hash,
} from '../hash/blake3.js'
import {
  type SerializeTransactionErrorType,
  serializeTransaction,
} from './serializeTransaction.js'

export type HashTransactionErrorType =
  | SerializeTransactionErrorType
  | Blake3ErrorType
  | ErrorType

export function hashTransaction(
  transaction: TransactionSerializable,
): Hash {
  return blake3Hash(serializeTransaction(transaction)) as Hash
}
