import type { ErrorType } from '../../errors/utils.js'
import type { Hex } from '../../types/misc.js'
import type {
  TransactionSerialized,
} from '../../types/transaction.js'
import {
  type Blake3ErrorType,
  blake3Hash,
} from '../../utils/hash/blake3.js'
import {
  type SerializeTransactionFn,
  serializeTransaction,
} from '../../utils/transaction/serializeTransaction.js'

import { type SignErrorType, sign } from './sign.js'

export type SignTransactionParameters<
  serializer extends SerializeTransactionFn<any> = SerializeTransactionFn<any>,
  transaction extends Parameters<serializer>[0] = Parameters<serializer>[0],
> = {
  privateKey: Hex
  signerType?: string | undefined
  transaction: transaction
  serializer?: serializer | undefined
}

export type SignTransactionReturnType = TransactionSerialized

export type SignTransactionErrorType =
  | Blake3ErrorType
  | SignErrorType
  | ErrorType

export async function signTransaction<
  serializer extends SerializeTransactionFn<any> = SerializeTransactionFn<any>,
  transaction extends Parameters<serializer>[0] = Parameters<serializer>[0],
>(
  parameters: SignTransactionParameters<serializer, transaction>,
): Promise<SignTransactionReturnType> {
  const {
    privateKey,
    signerType,
    transaction,
    serializer = serializeTransaction as SerializeTransactionFn<any>,
  } = parameters

  const signature = await sign({
    hash: blake3Hash(await serializer(transaction as any)),
    privateKey,
    signerType,
  })
  return (await serializer(
    transaction as any,
    signature,
  )) as SignTransactionReturnType
}
