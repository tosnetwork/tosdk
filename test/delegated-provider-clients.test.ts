import { expect, test, vi } from 'vitest'

import {
  buildPaymasterAuthorizationRequest,
  createPaymasterProviderClient,
  createSignerProviderClient,
  privateKeyToAccount,
  type PaymasterAuthorizationResponse,
  type PaymasterQuoteResponse,
  type SignerExecutionResponse,
  type SignerQuoteResponse,
} from '../src/index.js'

function createFetchStub(
  handler: (input: string, init?: RequestInit) => Promise<unknown> | unknown,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const result = await handler(String(input), init)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
}

test('signer provider client issues quote/submit/status/receipt requests', async () => {
  const executionResponse: SignerExecutionResponse = {
    executionId: 'exec-1',
    quoteId: 'quote-1',
    requestKey: 'request-1',
    requestHash: '0x11',
    providerAddress:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    walletAddress:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    requesterAddress:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    targetAddress:
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    valueTomi: '0',
    dataHex: '0x',
    gas: '21000',
    policyId: 'policy-1',
    policyHash: '0x22',
    scopeHash: '0x33',
    trustTier: 'self_hosted',
    requestNonce: 'nonce-1',
    requestExpiresAt: 1_900_000_000,
    status: 'submitted',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  }
  const quoteResponse: SignerQuoteResponse = {
    quoteId: 'quote-1',
    chainId: '1666',
    providerAddress: executionResponse.providerAddress,
    walletAddress: executionResponse.walletAddress,
    requesterAddress: executionResponse.requesterAddress,
    targetAddress: executionResponse.targetAddress,
    valueTomi: executionResponse.valueTomi,
    dataHex: executionResponse.dataHex,
    gas: executionResponse.gas,
    policyId: executionResponse.policyId,
    policyHash: executionResponse.policyHash,
    scopeHash: executionResponse.scopeHash,
    trustTier: executionResponse.trustTier,
    amountTomi: '1000',
    status: 'quoted',
    expiresAt: '2026-03-10T01:00:00.000Z',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  }

  const fetchFn = createFetchStub((input) => {
    if (input.endsWith('/quote')) return quoteResponse
    if (input.endsWith('/submit')) return executionResponse
    if (input.includes('/status/')) return executionResponse
    if (input.includes('/receipt/')) return executionResponse
    if (input.endsWith('/healthz')) return { ok: true }
    throw new Error(`unexpected request: ${input}`)
  })

  const client = createSignerProviderClient({
    baseUrl: 'https://provider.example/signer/',
    fetchFn,
  })

  await expect(
    client.quote({
      requester: { identity: { kind: 'tos', value: executionResponse.requesterAddress } },
      target: executionResponse.targetAddress,
    }),
  ).resolves.toMatchObject({ quoteId: 'quote-1' })
  await expect(
    client.submit({
      quote_id: 'quote-1',
      requester: { identity: { kind: 'tos', value: executionResponse.requesterAddress } },
      request_nonce: 'nonce-1',
      request_expires_at: executionResponse.requestExpiresAt,
      target: executionResponse.targetAddress,
    }),
  ).resolves.toMatchObject({ executionId: 'exec-1' })
  await expect(client.status({ executionId: 'exec-1' })).resolves.toMatchObject({
    executionId: 'exec-1',
  })
  await expect(client.receipt({ executionId: 'exec-1' })).resolves.toMatchObject({
    executionId: 'exec-1',
  })
  await expect(client.health()).resolves.toEqual({ ok: true })
})

test('paymaster provider client builds authorize requests and calls provider endpoints', async () => {
  const quote: PaymasterQuoteResponse = {
    quoteId: 'quote-1',
    chainId: '1666',
    providerAddress:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    sponsorAddress:
      '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    sponsorSignerType: 'ed25519',
    walletAddress:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    requesterAddress:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    requesterSignerType: 'ed25519',
    targetAddress:
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    valueTomi: '0',
    dataHex: '0x',
    gas: '21000',
    policyId: 'policy-1',
    policyHash: '0x22',
    scopeHash: '0x33',
    trustTier: 'self_hosted',
    amountTomi: '1000',
    sponsorNonce: '5',
    sponsorExpiry: 1_900_000_000,
    status: 'quoted',
    expiresAt: '2026-03-10T01:00:00.000Z',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  }

  const authorizationResponse: PaymasterAuthorizationResponse = {
    authorizationId: 'auth-1',
    quoteId: quote.quoteId,
    chainId: quote.chainId,
    requestKey: 'request-1',
    requestHash: '0x44',
    providerAddress: quote.providerAddress,
    sponsorAddress: quote.sponsorAddress,
    sponsorSignerType: quote.sponsorSignerType,
    walletAddress: quote.walletAddress,
    requesterAddress: quote.requesterAddress,
    requesterSignerType: quote.requesterSignerType,
    targetAddress: quote.targetAddress,
    valueTomi: quote.valueTomi,
    dataHex: quote.dataHex,
    gas: quote.gas,
    policyId: quote.policyId,
    policyHash: quote.policyHash,
    scopeHash: quote.scopeHash,
    trustTier: quote.trustTier,
    requestNonce: 'nonce-1',
    requestExpiresAt: 1_900_000_000,
    executionNonce: '0',
    sponsorNonce: quote.sponsorNonce,
    sponsorExpiry: quote.sponsorExpiry,
    status: 'authorized',
    createdAt: '2026-03-10T00:00:00.000Z',
    updatedAt: '2026-03-10T00:00:00.000Z',
  }

  const fetchFn = createFetchStub((input) => {
    if (input.endsWith('/quote')) return quote
    if (input.endsWith('/authorize')) return authorizationResponse
    if (input.includes('/status/')) return authorizationResponse
    if (input.includes('/receipt/')) return authorizationResponse
    if (input.endsWith('/healthz')) return { ok: true }
    throw new Error(`unexpected request: ${input}`)
  })

  const client = createPaymasterProviderClient({
    baseUrl: 'https://provider.example/paymaster/',
    fetchFn,
  })

  await expect(
    client.quote({
      requester: { identity: { kind: 'tos', value: quote.requesterAddress } },
      wallet_address: quote.walletAddress,
      target: quote.targetAddress,
    }),
  ).resolves.toMatchObject({ quoteId: 'quote-1' })

  const account = privateKeyToAccount(
    '0x59c6995e998f97a5a0044976f7d65d6505ad2d1f4640b3e01796f3c5dcf7e637',
  )
  const authorizeRequest = await buildPaymasterAuthorizationRequest({
    rpcUrl: 'http://127.0.0.1:8545',
    account,
    requesterAddress: quote.requesterAddress,
    quote,
    requestNonce: 'nonce-1',
    requestExpiresAt: 1_900_000_000,
    publicClient: {
      async getTransactionCount() {
        return 0n
      },
      async getChainId() {
        return 1666n
      },
    },
    walletClient: {
      async signAuthorization() {
        return {
          r: ('0x' + '11'.repeat(32)) as `0x${string}`,
          s: ('0x' + '22'.repeat(32)) as `0x${string}`,
          yParity: 1,
        }
      },
    },
  })
  expect(authorizeRequest.quote_id).toBe('quote-1')
  expect(authorizeRequest.execution_signature.r).toBeDefined()

  await expect(client.authorize(authorizeRequest)).resolves.toMatchObject({
    authorizationId: 'auth-1',
  })
  await expect(client.status({ authorizationId: 'auth-1' })).resolves.toMatchObject({
    authorizationId: 'auth-1',
  })
  await expect(client.receipt({ authorizationId: 'auth-1' })).resolves.toMatchObject({
    authorizationId: 'auth-1',
  })
  await expect(client.health()).resolves.toEqual({ ok: true })
})
