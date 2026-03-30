import {
  buildPaymasterAuthorizationRequest,
  createArtifactProviderClient,
  createPaymasterProviderClient,
  createSignerProviderClient,
  createStorageProviderClient,
  createWalletClient,
  http,
  privateKeyToAccount,
  tosTestnet,
} from '../src/index.js'
import type { Address, PaymasterQuoteResponse } from '../src/index.js'

export function buildProviderClientExamples() {
  const signerProvider = createSignerProviderClient({
    baseUrl: 'https://signer.example.com',
  })

  const paymasterProvider = createPaymasterProviderClient({
    baseUrl: 'https://paymaster.example.com',
  })

  const storageProvider = createStorageProviderClient({
    baseUrl: 'https://storage.example.com',
  })

  const artifactProvider = createArtifactProviderClient({
    baseUrl: 'https://artifacts.example.com',
  })

  return {
    signerProvider,
    paymasterProvider,
    storageProvider,
    artifactProvider,
  }
}

export async function buildAuthorizationExample() {
  const account = privateKeyToAccount(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  )

  const walletClient = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http('http://127.0.0.1:8545'),
  })

  const requesterAddress = account.address as Address
  const sponsorAddress =
    '0xc1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb92266' as Address
  const policyHash =
    '0x1111111111111111111111111111111111111111111111111111111111111111' as const

  const quote: PaymasterQuoteResponse = {
    quoteId: 'quote-demo-001',
    chainId: '1666',
    providerAddress: sponsorAddress,
    sponsorAddress,
    sponsorSignerType: 'ed25519',
    walletAddress: requesterAddress,
    requesterAddress,
    requesterSignerType: account.signerType,
    targetAddress: sponsorAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '21000',
    policyId: 'policy-demo-001',
    policyHash,
    scopeHash: policyHash,
    trustTier: 'self_hosted',
    amountTomi: '0',
    sponsorNonce: '0',
    sponsorExpiry: Math.floor(Date.now() / 1000) + 600,
    status: 'quoted',
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return buildPaymasterAuthorizationRequest({
    rpcUrl: 'http://127.0.0.1:8545',
    account,
    walletClient,
    requesterAddress,
    requestNonce: 'demo-request-001',
    requestExpiresAt: Math.floor(Date.now() / 1000) + 300,
    quote,
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const clients = buildProviderClientExamples()
  console.log(
    JSON.stringify(
      {
        example: 'provider-clients',
        clients: Object.keys(clients),
      },
      null,
      2,
    ),
  )
}
