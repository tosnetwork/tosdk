import {
  buildPaymasterAuthorizationRequest,
  createPaymasterProviderClient,
  createSignerProviderClient,
  createWalletClient,
  http,
  privateKeyToAccount,
  tosTestnet,
} from '../src/index.js'
import type {
  Address,
  PaymasterQuoteResponse,
  SignerQuoteResponse,
  SignerSubmitRequest,
} from '../src/index.js'

export function buildDelegatedExecutionExample() {
  const account = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  )

  const signerProvider = createSignerProviderClient({
    baseUrl: 'https://signer.example.com',
  })

  const paymasterProvider = createPaymasterProviderClient({
    baseUrl: 'https://paymaster.example.com',
  })

  const walletClient = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http('http://127.0.0.1:8545'),
  })

  const requesterAddress = account.address as Address
  const providerAddress =
    '0xa1f28ad7db747d8015af4bfcedfb93f57f3a8ab4cc9233d34a65df610f4f1122' as Address
  const sponsorAddress =
    '0xb4cc9233d34a65df610f4f1122a1f28ad7db747d8015af4bfcedfb93f57f3a8ab' as Address
  const targetAddress =
    '0xc1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb92266' as Address

  const signerQuote: SignerQuoteResponse = {
    quoteId: 'signer-quote-demo-001',
    chainId: '1666',
    providerAddress,
    walletAddress: requesterAddress,
    requesterAddress,
    targetAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '240000',
    policyId: 'signer-policy-demo-001',
    policyHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    scopeHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    trustTier: 'org_trusted',
    amountTomi: '5000000000000000',
    status: 'quoted',
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const signerSubmit: SignerSubmitRequest = {
    requester: {
      identity: {
        kind: 'tos',
        value: requesterAddress,
      },
    },
    quote_id: signerQuote.quoteId,
    request_nonce: 'signer-request-demo-001',
    request_expires_at: Math.floor(Date.now() / 1000) + 300,
    target: targetAddress,
    value_tomi: '0',
    data: '0x',
    gas: '240000',
    reason: 'delegate one bounded marketplace execution',
  }

  const paymasterQuote: PaymasterQuoteResponse = {
    quoteId: 'paymaster-quote-demo-001',
    chainId: '1666',
    providerAddress,
    sponsorAddress,
    sponsorSignerType: 'ed25519',
    walletAddress: requesterAddress,
    requesterAddress,
    requesterSignerType: account.signerType,
    targetAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '240000',
    policyId: 'paymaster-policy-demo-001',
    policyHash:
      '0x2222222222222222222222222222222222222222222222222222222222222222',
    scopeHash:
      '0x2222222222222222222222222222222222222222222222222222222222222222',
    trustTier: 'org_trusted',
    amountTomi: '1000000000000000',
    sponsorNonce: '7',
    sponsorExpiry: Math.floor(Date.now() / 1000) + 600,
    status: 'quoted',
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    account,
    walletClient,
    signerProvider,
    paymasterProvider,
    signerQuote,
    signerSubmit,
    paymasterQuote,
    requesterAddress,
    targetAddress,
    async buildAuthorization() {
      return buildPaymasterAuthorizationRequest({
        rpcUrl: 'http://127.0.0.1:8545',
        account,
        walletClient,
        requesterAddress,
        requestNonce: 'paymaster-request-demo-001',
        requestExpiresAt: Math.floor(Date.now() / 1000) + 300,
        quote: paymasterQuote,
      })
    },
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const example = buildDelegatedExecutionExample()
  console.log(
    JSON.stringify(
      {
        example: 'delegated-execution',
        requesterAddress: example.requesterAddress,
        targetAddress: example.targetAddress,
        signerProviderBaseUrl: 'https://signer.example.com',
        paymasterProviderBaseUrl: 'https://paymaster.example.com',
      },
      null,
      2,
    ),
  )
}
