/**
 * Signer Builder Pack
 *
 * Demonstrates key management and signing workflows:
 * - Generate and import private keys
 * - Sign transactions
 * - Verify hash signatures
 * - ed25519 signing (TOS native signer type)
 */
import {
  generatePrivateKey,
  privateKeyToAccount,
  signHash,
  verifyHashSignature,
  publicKeyToNativeAddress,
  normalizeSignerType,
  hashTransaction,
  serializeTransaction,
} from '../src/index.js'
import type { Hex } from '../src/index.js'

export function buildSignerPack() {
  /** Generate a fresh ed25519 account */
  function createAccount() {
    const privateKey = generatePrivateKey()
    return privateKeyToAccount(privateKey)
  }

  const demoPrivateKey =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as Hex
  const demoAccount = privateKeyToAccount(demoPrivateKey)

  return {
    demoAccount,
    createAccount,

    /** Sign a hash and verify the signature */
    async signAndVerify(hash: Hex) {
      const signature = await signHash({
        hash,
        privateKey: demoPrivateKey,
        signerType: demoAccount.signerType,
      })
      const isValid = await verifyHashSignature({
        hash,
        signature,
        publicKey: demoAccount.publicKey,
        signerType: demoAccount.signerType,
      })
      return { signature, isValid }
    },

    /** Get the native address for a public key */
    deriveAddress: publicKeyToNativeAddress,
    normalizeSignerType,

    /** Hash a transaction for signing */
    hashTransaction,
    serializeTransaction,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pack = buildSignerPack()
  console.log(
    JSON.stringify(
      {
        example: 'signer-pack',
        demoAddress: pack.demoAccount.address,
        demoSignerType: pack.demoAccount.signerType,
        supportedTypes: ['ed25519'],
      },
      null,
      2,
    ),
  )
}
