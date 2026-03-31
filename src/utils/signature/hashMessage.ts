import type { ErrorType } from '../../errors/utils.js'
import type { ByteArray, Hex, SignableMessage } from '../../types/misc.js'
import { type Blake3ErrorType, blake3Hash } from '../hash/blake3.js'
import { toPrefixedMessage } from './toPrefixedMessage.js'

type To = 'hex' | 'bytes'

export type HashMessageReturnType<to extends To> =
  | (to extends 'bytes' ? ByteArray : never)
  | (to extends 'hex' ? Hex : never)

export type HashMessageErrorType = Blake3ErrorType | ErrorType

export function hashMessage<to extends To = 'hex'>(
  message: SignableMessage,
  to_?: to | undefined,
): HashMessageReturnType<to> {
  return blake3Hash(toPrefixedMessage(message), to_)
}
