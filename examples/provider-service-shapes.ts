import type {
  Address,
  ArtifactItemResponse,
  ArtifactProviderRecord,
  CaptureNewsRequest,
  PaymasterAuthorizeRequest,
  PaymasterAuthorizationResponse,
  PaymasterQuoteRequest,
  PaymasterQuoteResponse,
  SignerExecutionResponse,
  SignerQuoteRequest,
  SignerQuoteResponse,
  SignerSubmitRequest,
  Signature,
  StorageLeaseResponse,
  StoragePutRequest,
  StorageQuoteRequest,
  StorageQuoteResponse,
} from '../src/index.js'

export function buildProviderServiceShapeExamples() {
  const requesterAddress =
    '0x61cef93ad3eb77ef5c4cc65a17448286a9aa9931a10d712af4db9e8abb363e16' as Address
  const providerAddress =
    '0xa1f28ad7db747d8015af4bfcedfb93f57f3a8ab4cc9233d34a65df610f4f1122' as Address
  const sponsorAddress =
    '0xb4cc9233d34a65df610f4f1122a1f28ad7db747d8015af4bfcedfb93f57f3a8ab' as Address

  const signerQuoteRequest: SignerQuoteRequest = {
    requester: { identity: { kind: 'tos', value: requesterAddress } },
    target: providerAddress,
    gas: '240000',
    reason: 'request one bounded delegated execution',
  }

  const signerQuoteResponse: SignerQuoteResponse = {
    quoteId: 'signer-quote-demo-001',
    chainId: '1666',
    providerAddress,
    walletAddress: requesterAddress,
    requesterAddress,
    targetAddress: providerAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '240000',
    policyId: 'signer-policy-demo-001',
    policyHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    scopeHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    trustTier: 'public_low_trust',
    amountTomi: '1000000000000000',
    status: 'quoted',
    expiresAt: '2026-03-11T01:00:00.000Z',
    createdAt: '2026-03-11T00:00:00.000Z',
    updatedAt: '2026-03-11T00:00:00.000Z',
  }

  const signerSubmitRequest: SignerSubmitRequest = {
    requester: { identity: { kind: 'tos', value: requesterAddress } },
    quote_id: signerQuoteResponse.quoteId,
    request_nonce: 'request-demo-001',
    request_expires_at: 1773190800,
    target: providerAddress,
    value_tomi: '0',
    data: '0x',
    gas: '240000',
  }

  const signerExecutionResponse: SignerExecutionResponse = {
    executionId: 'execution-demo-001',
    quoteId: signerQuoteResponse.quoteId,
    requestKey: 'signer-demo-request-key',
    requestHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    providerAddress,
    walletAddress: requesterAddress,
    requesterAddress,
    targetAddress: providerAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '240000',
    policyId: signerQuoteResponse.policyId,
    policyHash: signerQuoteResponse.policyHash,
    scopeHash: signerQuoteResponse.scopeHash,
    trustTier: signerQuoteResponse.trustTier,
    requestNonce: signerSubmitRequest.request_nonce,
    requestExpiresAt: signerSubmitRequest.request_expires_at,
    status: 'submitted',
    createdAt: '2026-03-11T00:01:00.000Z',
    updatedAt: '2026-03-11T00:01:00.000Z',
  }

  const paymasterQuoteRequest: PaymasterQuoteRequest = {
    requester: { identity: { kind: 'tos', value: requesterAddress } },
    wallet_address: requesterAddress,
    target: providerAddress,
    gas: '240000',
  }

  const paymasterQuoteResponse: PaymasterQuoteResponse = {
    quoteId: 'paymaster-quote-demo-001',
    chainId: '1666',
    providerAddress,
    sponsorAddress,
    sponsorSignerType: 'ed25519',
    walletAddress: requesterAddress,
    requesterAddress,
    requesterSignerType: 'ed25519',
    targetAddress: providerAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '240000',
    policyId: 'paymaster-policy-demo-001',
    policyHash:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    scopeHash:
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    trustTier: 'public_low_trust',
    amountTomi: '1000000000000000',
    sponsorNonce: '5',
    sponsorExpiry: 1773191100,
    status: 'quoted',
    expiresAt: '2026-03-11T01:00:00.000Z',
    createdAt: '2026-03-11T00:00:00.000Z',
    updatedAt: '2026-03-11T00:00:00.000Z',
  }

  const paymasterAuthorizeRequest: PaymasterAuthorizeRequest = {
    requester: { identity: { kind: 'tos', value: requesterAddress } },
    quote_id: paymasterQuoteResponse.quoteId,
    wallet_address: requesterAddress,
    request_nonce: 'paymaster-demo-request-001',
    request_expires_at: 1773190800,
    execution_nonce: '9',
    target: providerAddress,
    value_tomi: '0',
    data: '0x',
    gas: '240000',
    execution_signature: {
      r: '0x1111111111111111111111111111111111111111111111111111111111111111',
      s: '0x2222222222222222222222222222222222222222222222222222222222222222',
      yParity: 0,
    } satisfies Signature,
  }

  const paymasterAuthorizationResponse: PaymasterAuthorizationResponse = {
    authorizationId: 'authorization-demo-001',
    quoteId: paymasterQuoteResponse.quoteId,
    chainId: '1666',
    requestKey: 'paymaster-demo-request-key',
    requestHash:
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    providerAddress,
    sponsorAddress,
    sponsorSignerType: paymasterQuoteResponse.sponsorSignerType,
    walletAddress: requesterAddress,
    requesterAddress,
    requesterSignerType: paymasterQuoteResponse.requesterSignerType,
    targetAddress: providerAddress,
    valueTomi: '0',
    dataHex: '0x',
    gas: '240000',
    policyId: paymasterQuoteResponse.policyId,
    policyHash: paymasterQuoteResponse.policyHash,
    scopeHash: paymasterQuoteResponse.scopeHash,
    trustTier: paymasterQuoteResponse.trustTier,
    requestNonce: paymasterAuthorizeRequest.request_nonce,
    requestExpiresAt: paymasterAuthorizeRequest.request_expires_at,
    executionNonce: paymasterAuthorizeRequest.execution_nonce,
    sponsorNonce: paymasterQuoteResponse.sponsorNonce,
    sponsorExpiry: paymasterQuoteResponse.sponsorExpiry,
    status: 'authorized',
    createdAt: '2026-03-11T00:02:00.000Z',
    updatedAt: '2026-03-11T00:02:00.000Z',
  }

  const storageQuoteRequest: StorageQuoteRequest = {
    cid: 'bafybeidemo001',
    bundle_kind: 'public_news.capture',
    size_bytes: 2048,
    ttl_seconds: 7200,
    requester_address: requesterAddress,
  }

  const storageQuoteResponse: StorageQuoteResponse = {
    quote_id: 'storage-quote-demo-001',
    provider_address: providerAddress,
    requester_address: requesterAddress,
    cid: storageQuoteRequest.cid,
    bundle_kind: storageQuoteRequest.bundle_kind,
    size_bytes: storageQuoteRequest.size_bytes,
    ttl_seconds: storageQuoteRequest.ttl_seconds,
    amount_tomi: '1000000000000000',
    expires_at: '2026-03-11T00:10:00.000Z',
  }

  const storagePutRequest: StoragePutRequest = {
    requester: { identity: { kind: 'tos', value: requesterAddress } },
    request_nonce: 'storage-demo-request-001',
    request_expires_at: 1773190800,
    quote_id: storageQuoteResponse.quote_id,
    bundle_kind: 'public_news.capture',
    ttl_seconds: 7200,
    cid: storageQuoteRequest.cid,
    bundle: {
      title: 'Example bundle',
      body: 'This is a minimal provider integration example.',
    },
  }

  const storageLeaseResponse: StorageLeaseResponse = {
    lease_id: 'lease-demo-001',
    cid: storageQuoteRequest.cid,
    bundle_hash:
      '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    bundle_kind: storageQuoteRequest.bundle_kind,
    provider_address: providerAddress,
    size_bytes: storageQuoteRequest.size_bytes,
    ttl_seconds: storageQuoteRequest.ttl_seconds,
    amount_tomi: storageQuoteResponse.amount_tomi,
    issued_at: '2026-03-11T00:01:00.000Z',
    expires_at: '2026-03-11T02:01:00.000Z',
    receipt_id: 'storage-receipt-demo-001',
    receipt_hash:
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    get_url: 'https://storage.example.com/storage/get/lease-demo-001',
    head_url: 'https://storage.example.com/storage/head/lease-demo-001',
  }

  const captureNewsRequest: CaptureNewsRequest = {
    requester: { identity: { kind: 'tos', value: requesterAddress } },
    request_nonce: 'artifact-demo-request-001',
    request_expires_at: 1773190800,
    capability: 'capture.news.public',
    ttl_seconds: 7200,
    auto_anchor: true,
    title: 'Example capture',
    source_url: 'https://news.example.com/posts/demo',
    body_text: 'Example body text used for provider shape documentation.',
  }

  const artifactRecord: ArtifactProviderRecord = {
    artifactId: 'artifact-demo-001',
    kind: 'public_news.capture',
    title: captureNewsRequest.title,
    leaseId: storageLeaseResponse.lease_id,
    cid: storageLeaseResponse.cid,
    bundleHash: storageLeaseResponse.bundle_hash,
    providerBaseUrl: 'https://artifacts.example.com',
    providerAddress,
    requesterAddress,
    sourceUrl: captureNewsRequest.source_url,
    status: 'stored',
    createdAt: '2026-03-11T00:02:00.000Z',
    updatedAt: '2026-03-11T00:02:00.000Z',
  }

  const artifactItemResponse: ArtifactItemResponse = {
    artifact: artifactRecord,
    verification: null,
    anchor: null,
    artifact_url: 'https://artifacts.example.com/artifacts/item/artifact-demo-001',
  }

  return {
    signer: {
      quoteRequest: signerQuoteRequest,
      quoteResponse: signerQuoteResponse,
      submitRequest: signerSubmitRequest,
      executionResponse: signerExecutionResponse,
    },
    paymaster: {
      quoteRequest: paymasterQuoteRequest,
      quoteResponse: paymasterQuoteResponse,
      authorizeRequest: paymasterAuthorizeRequest,
      authorizeResponse: paymasterAuthorizationResponse,
    },
    storage: {
      quoteRequest: storageQuoteRequest,
      quoteResponse: storageQuoteResponse,
      putRequest: storagePutRequest,
      leaseResponse: storageLeaseResponse,
    },
    artifact: {
      captureNewsRequest,
      itemResponse: artifactItemResponse,
    },
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    JSON.stringify(
      {
        example: 'provider-service-shapes',
        surfaces: ['signer', 'paymaster', 'storage', 'artifact'],
      },
      null,
      2,
    ),
  )
}
