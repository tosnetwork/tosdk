import { ed25519 } from '@noble/curves/ed25519'
import type { ErrorType } from '../errors/utils.js'
import type { Hex } from '../types/misc.js'
import { type ToHexErrorType, toHex } from '../utils/encoding/toHex.js'
import { type ToAccountErrorType, toAccount } from './toAccount.js'
import type { PrivateKeyAccount } from './types.js'
import {
  type PublicKeyToAddressErrorType,
  signerPublicKeyToAddress,
} from './utils/publicKeyToAddress.js'
import { type SignErrorType, sign } from './utils/sign.js'
import { type SignMessageErrorType, signMessage } from './utils/signMessage.js'
import {
  type SignAuthorizationErrorType,
  signAuthorization,
} from './utils/signAuthorization.js'
import {
  type SignTransactionErrorType,
  signTransaction,
} from './utils/signTransaction.js'
import {
  type SignTypedDataErrorType,
  signTypedData,
} from './utils/signTypedData.js'

export type PrivateKeyToAccountErrorType =
  | ToAccountErrorType
  | ToHexErrorType
  | PublicKeyToAddressErrorType
  | SignErrorType
  | SignMessageErrorType
  | SignAuthorizationErrorType
  | SignTransactionErrorType
  | SignTypedDataErrorType
  | ErrorType

export function privateKeyToAccount(privateKey: Hex): PrivateKeyAccount {
  const publicKey = toHex(ed25519.getPublicKey(privateKey.slice(2)))
  const address = signerPublicKeyToAddress(publicKey, 'ed25519')

  const account = toAccount({
    address,
    signerType: 'ed25519',
    async sign({ hash }) {
      return sign({ hash, privateKey, signerType: 'ed25519', to: 'hex' })
    },
    async signMessage({ message }) {
      return signMessage({ message, privateKey, signerType: 'ed25519' })
    },
    async signAuthorization(transaction) {
      return signAuthorization({ privateKey, signerType: 'ed25519', transaction })
    },
    async signTransaction(transaction) {
      return signTransaction({ privateKey, signerType: 'ed25519', transaction })
    },
    async signTypedData(typedData) {
      return signTypedData({ ...typedData, privateKey, signerType: 'ed25519' } as any)
    },
  })

  return {
    ...account,
    publicKey,
    signerType: 'ed25519',
    source: 'privateKey',
  } as PrivateKeyAccount
}
