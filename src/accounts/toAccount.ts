import {
  InvalidAddressError,
  type InvalidAddressErrorType,
} from '../errors/address.js'
import type { ErrorType } from '../errors/utils.js'
import {
  type IsAddressErrorType,
  isAddress,
} from '../utils/address/isAddress.js'
import type {
  AccountSource,
  CustomSource,
  RemoteAccount,
  LocalAccount,
} from './types.js'

type GetAccountReturnType<accountSource extends AccountSource> =
  | (accountSource extends string ? RemoteAccount : never)
  | (accountSource extends CustomSource ? LocalAccount : never)

export type ToAccountErrorType =
  | InvalidAddressErrorType
  | IsAddressErrorType
  | ErrorType

export function toAccount<accountSource extends AccountSource>(
  source: accountSource,
): GetAccountReturnType<accountSource> {
  if (typeof source === 'string') {
    if (!isAddress(source, { strict: false }))
      throw new InvalidAddressError({ address: source })
    return {
      address: source,
      type: 'remote',
    } as GetAccountReturnType<accountSource>
  }

  if (!isAddress(source.address, { strict: false }))
    throw new InvalidAddressError({ address: source.address })
  return {
    address: source.address,
    signerType: source.signerType ?? 'ed25519',
    sign: source.sign,
    signAuthorization: source.signAuthorization,
    signMessage: source.signMessage,
    signTransaction: source.signTransaction,
    signTypedData: source.signTypedData,
    source: 'custom',
    type: 'local',
  } as GetAccountReturnType<accountSource>
}
