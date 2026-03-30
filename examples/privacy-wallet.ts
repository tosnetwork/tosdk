import {
  createPublicClient,
  createWalletClient,
  privateKeyToAccount,
  http,
  tosTestnet,
} from '../src/index.js'

/**
 * Phase 0.3 privacy wallet example.
 *
 * Privacy tx types (PrivTransfer, Shield, Unshield) have been removed from the
 * RPC layer.  Encrypted balances are now managed through standard SignerTx
 * transactions with commitment fields.
 *
 * What still works:
 *   - privGetBalance  — query encrypted commitment + handle from account state
 *   - privGetNonce    — returns the unified nonce (backed by tos_getTransactionCount)
 *   - Selective disclosure (prove / verify / decryption tokens)
 */

export function buildPrivacyWalletExample() {
  const privacyAccount = privateKeyToAccount(
    '0x0100000000000000000000000000000000000000000000000000000000000000',
  )

  const publicClient = createPublicClient({
    chain: tosTestnet,
    transport: http('http://127.0.0.1:8545'),
  })

  const walletClient = createWalletClient({
    account: privacyAccount,
    chain: tosTestnet,
    transport: http('http://127.0.0.1:8545'),
  })

  return {
    privacyAccount,
    publicClient,
    walletClient,

    /** Query the encrypted balance (commitment + handle) for this account. */
    readEncryptedBalance(blockTag: 'latest' | 'pending' | bigint = 'latest') {
      return publicClient.privGetBalance({
        pubkey: privacyAccount.publicKey,
        blockTag,
      })
    },

    /** Query the unified nonce (Phase 0.3 — backed by tos_getTransactionCount). */
    readNonce(blockTag: 'latest' | 'pending' | bigint = 'pending') {
      return publicClient.privGetNonce({
        pubkey: privacyAccount.publicKey,
        blockTag,
      })
    },

    /**
     * Send a standard transaction with commitment fields.
     *
     * In Phase 0.3, encrypted transfers are built as regular SignerTx
     * transactions whose `data` payload carries the commitment, handle,
     * and zero-knowledge proofs.  Use `walletClient.sendTransaction()`
     * with the appropriate data encoding.
     */
    async sendEncryptedTransfer(params: {
      to: `0x${string}`
      value?: bigint
      data: `0x${string}`
      gas?: bigint
    }) {
      return walletClient.sendTransaction({
        to: params.to,
        value: params.value ?? 0n,
        data: params.data,
        gas: params.gas ?? 120_000n,
      })
    },
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const example = buildPrivacyWalletExample()
  console.log(
    JSON.stringify(
      {
        example: 'privacy-wallet (Phase 0.3)',
        publicKey: example.privacyAccount.publicKey,
        methods: [
          'privGetBalance',
          'privGetNonce (unified)',
          'sendEncryptedTransfer (standard SignerTx)',
        ],
      },
      null,
      2,
    ),
  )
}
