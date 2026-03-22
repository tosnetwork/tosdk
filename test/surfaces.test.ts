import { describe, expect, test } from 'vitest'

import {
  connectionModesFromMask,
  buildRequesterEnvelope,
  toDelegatedResult,
  toSponsoredResult,
  isSignerQuoteValid,
  isPaymasterQuoteValid,
  validateDelegatedRequest,
  buildEvidenceCaptureRequest,
  verifyEvidenceReceipt,
  verifyEvidenceAnchor,
  isOracleEvidenceKind,
  validateEvidenceParams,
  registerProvider,
  aggregateFleetStatus,
  filterByRole,
  validateRegistration,
  buildProofArtifactSearchParams,
  isCryptographicProofArtifactKind,
  isPublicProofArtifactKind,
  verifyProofArtifactAnchor,
  verifyProofArtifactReceipt,
  discoverAgentProviders,
  directoryDiscoverAgentProviders,
  searchPreferredAgentProvider,
  directorySearchPreferredAgentProvider,
  searchPreferredAgentProviderWithDiagnostics,
  directorySearchPreferredAgentProviderWithDiagnostics,
  searchPreferredAgentProviderOrThrow,
  directorySearchPreferredAgentProviderOrThrow,
  rankTrustedAgentProviders,
  filterPreferredAgentProviders,
  summarizeAgentProviderDiagnostics,
  requirePreferredAgentProvider,
  resolvePreferredAgentProvider,
  diagnoseAgentProviders,
  balanceAt,
  codeAt,
  inspectRuntimeReceipt,
  inspectSettlementEffect,
  pendingBalanceAt,
  pendingCallContract,
  subscribeNewHead,
  suggestGasTipCap,
  syncProgress,
  transactionSender,
  getAgentRuntimeSurface,
  getDiscoveredAgentSurface,
  getRuntimeReceiptSurface,
  getSettlementEffectSurface,
  searchDiscoveredAgentSurfaces,
  searchTrustedAgentSurfaces,
  searchPreferredAgentSurfaces,
  resolvePreferredAgentSurface,
  diagnosePreferredAgentSurfaces,
  searchPreferredAgentSurfaceDiagnostics,
} from '../src/index.js'
import type {
  Address,
  AgentDirectorySearchParams,
  AgentSearchParams,
  SignerQuoteResponse,
  SignerExecutionResponse,
  PaymasterQuoteResponse,
  PaymasterAuthorizationResponse,
  ArtifactVerificationReceipt,
  ArtifactAnchorSummary,
  PublicClient,
} from '../src/index.js'

const addr1 =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
const addr2 =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address
const addr3 =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as Address

describe('delegated execution surface', () => {
  test('buildRequesterEnvelope creates correct structure', () => {
    const envelope = buildRequesterEnvelope(addr1)
    expect(envelope.requester.identity.kind).toBe('tos')
    expect(envelope.requester.identity.value).toBe(addr1)
  })

  test('toDelegatedResult extracts fields from execution response', () => {
    const response: SignerExecutionResponse = {
      executionId: 'exec-1',
      quoteId: 'quote-1',
      requestKey: 'key-1',
      requestHash: '0x11',
      providerAddress: addr1,
      walletAddress: addr2,
      requesterAddress: addr2,
      targetAddress: addr1,
      valueTomi: '0',
      dataHex: '0x',
      gas: '21000',
      policyId: 'p-1',
      policyHash: '0x22',
      scopeHash: '0x33',
      trustTier: 'self_hosted',
      requestNonce: 'nonce-1',
      requestExpiresAt: 1_900_000_000,
      status: 'confirmed',
      submittedTxHash: '0xaabb',
      createdAt: '2026-03-10T00:00:00Z',
      updatedAt: '2026-03-10T00:00:00Z',
    }
    const result = toDelegatedResult(response)
    expect(result.executionId).toBe('exec-1')
    expect(result.status).toBe('confirmed')
    expect(result.txHash).toBe('0xaabb')
  })

  test('toSponsoredResult extracts fields from authorization response', () => {
    const response: PaymasterAuthorizationResponse = {
      authorizationId: 'auth-1',
      quoteId: 'quote-1',
      chainId: '1666',
      requestKey: 'key-1',
      requestHash: '0x44',
      providerAddress: addr1,
      sponsorAddress: addr2,
      sponsorSignerType: 'secp256k1',
      walletAddress: addr2,
      requesterAddress: addr2,
      requesterSignerType: 'secp256k1',
      targetAddress: addr1,
      valueTomi: '0',
      dataHex: '0x',
      gas: '21000',
      policyId: 'p-1',
      policyHash: '0x22',
      scopeHash: '0x33',
      trustTier: 'self_hosted',
      requestNonce: 'nonce-1',
      requestExpiresAt: 1_900_000_000,
      executionNonce: '0',
      sponsorNonce: '5',
      sponsorExpiry: 1_900_000_000,
      status: 'authorized',
      createdAt: '2026-03-10T00:00:00Z',
      updatedAt: '2026-03-10T00:00:00Z',
    }
    const result = toSponsoredResult(response)
    expect(result.authorizationId).toBe('auth-1')
    expect(result.status).toBe('authorized')
    expect(result.txHash).toBeNull()
  })

  test('isSignerQuoteValid checks expiry', () => {
    const validQuote = {
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    } as SignerQuoteResponse
    const expiredQuote = {
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    } as SignerQuoteResponse
    expect(isSignerQuoteValid(validQuote)).toBe(true)
    expect(isSignerQuoteValid(expiredQuote)).toBe(false)
  })

  test('isPaymasterQuoteValid checks expiry', () => {
    const validQuote = {
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    } as PaymasterQuoteResponse
    expect(isPaymasterQuoteValid(validQuote)).toBe(true)
  })

  test('validateDelegatedRequest catches errors', () => {
    const errors = validateDelegatedRequest({
      target: '' as Address,
      gas: '-1',
      valueTomi: '-100',
    })
    expect(errors).toContain('target address is required')
    expect(errors).toContain('gas must be a positive number')
    expect(errors).toContain('valueTomi must be a non-negative number')
  })

  test('validateDelegatedRequest passes for valid request', () => {
    const errors = validateDelegatedRequest({
      target: addr1,
      gas: '21000',
      valueTomi: '0',
    })
    expect(errors).toHaveLength(0)
  })
})

describe('evidence surface', () => {
  test('buildEvidenceCaptureRequest creates correct structure', () => {
    const request = buildEvidenceCaptureRequest({
      requesterAddress: addr1,
      title: 'Test Evidence',
      question: 'Is this valid?',
      evidenceText: 'Evidence data here.',
    })
    expect(request.requester.identity.value).toBe(addr1)
    expect(request.capability).toBe('capture.oracle.evidence')
    expect(request.auto_anchor).toBe(true)
    expect(request.title).toBe('Test Evidence')
    expect(request.question).toBe('Is this valid?')
    expect(request.request_nonce).toMatch(/^evidence-/)
  })

  test('verifyEvidenceReceipt returns hash and status', () => {
    const receipt: ArtifactVerificationReceipt = {
      version: 1,
      verificationId: 'v-1',
      artifactId: 'a-1',
      kind: 'oracle.evidence',
      cid: 'bafytest',
      bundleHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      verifierAddress: addr1,
      status: 'verified',
      responseHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      checkedAt: '2026-03-10T00:00:00Z',
    }
    const result = verifyEvidenceReceipt(receipt)
    expect(result.isVerified).toBe(true)
    expect(result.receiptHash).toMatch(/^0x/)
    expect(result.canonical).toBeTruthy()
  })

  test('verifyEvidenceAnchor returns hash', () => {
    const summary: ArtifactAnchorSummary = {
      version: 1,
      anchorId: 'anchor-1',
      artifactId: 'a-1',
      kind: 'oracle.evidence',
      cid: 'bafytest',
      bundleHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      createdAt: '2026-03-10T00:00:00Z',
    }
    const result = verifyEvidenceAnchor(summary)
    expect(result.summaryHash).toMatch(/^0x/)
    expect(result.anchorId).toBe('anchor-1')
  })

  test('isOracleEvidenceKind identifies oracle types', () => {
    expect(isOracleEvidenceKind('oracle.evidence')).toBe(true)
    expect(isOracleEvidenceKind('oracle.aggregate')).toBe(true)
    expect(isOracleEvidenceKind('public_news.capture')).toBe(false)
    expect(isOracleEvidenceKind('committee.vote')).toBe(false)
  })

  test('validateEvidenceParams catches missing fields', () => {
    const errors = validateEvidenceParams({
      requesterAddress: '' as Address,
      title: '',
      question: '',
      evidenceText: '',
    })
    expect(errors).toContain('requesterAddress is required')
    expect(errors).toContain('title is required')
    expect(errors).toContain('question is required')
    expect(errors).toContain('evidenceText is required')
  })

  test('validateEvidenceParams passes for valid params', () => {
    const errors = validateEvidenceParams({
      requesterAddress: addr1,
      title: 'Test',
      question: 'Q?',
      evidenceText: 'E',
    })
    expect(errors).toHaveLength(0)
  })
})

describe('operator control surface', () => {
  test('registerProvider creates registration', () => {
    const reg = registerProvider({
      address: addr1,
      role: 'signer',
      baseUrl: 'https://signer.example.com/',
    })
    expect(reg.address).toBe(addr1)
    expect(reg.role).toBe('signer')
    expect(reg.baseUrl).toBe('https://signer.example.com')
  })

  test('aggregateFleetStatus computes totals', () => {
    const statuses = [
      { address: addr1, role: 'signer' as const, baseUrl: 'url1', healthy: true, checkedAt: '' },
      { address: addr2, role: 'paymaster' as const, baseUrl: 'url2', healthy: false, checkedAt: '', error: 'timeout' },
    ]
    const fleet = aggregateFleetStatus(statuses)
    expect(fleet.total).toBe(2)
    expect(fleet.healthy).toBe(1)
    expect(fleet.unhealthy).toBe(1)
  })

  test('filterByRole filters correctly', () => {
    const regs = [
      registerProvider({ address: addr1, role: 'signer', baseUrl: 'https://a.com' }),
      registerProvider({ address: addr2, role: 'paymaster', baseUrl: 'https://b.com' }),
      registerProvider({ address: addr1, role: 'signer', baseUrl: 'https://c.com' }),
    ]
    const signers = filterByRole(regs, 'signer')
    expect(signers).toHaveLength(2)
    const paymasters = filterByRole(regs, 'paymaster')
    expect(paymasters).toHaveLength(1)
  })

  test('validateRegistration catches invalid data', () => {
    const errors = validateRegistration({
      address: '' as Address,
      role: 'invalid' as any,
      baseUrl: 'not-a-url',
    })
    expect(errors).toContain('address is required')
    expect(errors.some((e) => e.includes('role must be'))).toBe(true)
    expect(errors).toContain('baseUrl must be a valid URL')
  })

  test('validateRegistration passes for valid data', () => {
    const errors = validateRegistration({
      address: addr1,
      role: 'signer',
      baseUrl: 'https://signer.example.com',
    })
    expect(errors).toHaveLength(0)
  })
})

describe('runtime settlement surface', () => {
  test('inspectRuntimeReceipt joins the linked settlement effect', async () => {
    const client = {
      async getRuntimeReceipt() {
        return {
          receiptRef: '0xaaa1',
          receiptKind: 7,
          status: 'success',
          mode: 1,
          modeName: 'PUBLIC_TRANSFER',
          sender: addr1,
          recipient: addr2,
          settlementRef: '0xbbb1',
          openedAt: 10,
          finalizedAt: 11,
        }
      },
      async getSettlementEffect() {
        return {
          settlementRef: '0xbbb1',
          receiptRef: '0xaaa1',
          mode: 1,
          modeName: 'PUBLIC_TRANSFER',
          sender: addr1,
          recipient: addr2,
          createdAt: 10,
        }
      },
    } as unknown as PublicClient

    const surface = await inspectRuntimeReceipt(client, {
      receiptRef: '0xaaa1',
    })
    expect(surface.receipt?.receiptRef).toBe('0xaaa1')
    expect(surface.effect?.settlementRef).toBe('0xbbb1')
  })

  test('inspectSettlementEffect joins the linked runtime receipt', async () => {
    const client = {
      async getRuntimeReceipt() {
        return {
          receiptRef: '0xaaa1',
          receiptKind: 7,
          status: 'success',
          mode: 1,
          modeName: 'PUBLIC_TRANSFER',
          sender: addr1,
          recipient: addr2,
          settlementRef: '0xbbb1',
          openedAt: 10,
          finalizedAt: 11,
        }
      },
      async getSettlementEffect() {
        return {
          settlementRef: '0xbbb1',
          receiptRef: '0xaaa1',
          mode: 1,
          modeName: 'PUBLIC_TRANSFER',
          sender: addr1,
          recipient: addr2,
          createdAt: 10,
        }
      },
    } as unknown as PublicClient

    const surface = await inspectSettlementEffect(client, {
      settlementRef: '0xbbb1',
    })
    expect(surface.effect?.settlementRef).toBe('0xbbb1')
    expect(surface.receipt?.receiptRef).toBe('0xaaa1')
  })
})

describe('go client parity surface', () => {
  test('syncProgress returns null for false and passes syncing objects through', async () => {
    const idleClient = {
      async syncing() {
        return false as const
      },
    } as unknown as PublicClient
    const busyClient = {
      async syncing() {
        return {
          startingBlock: 1n,
          currentBlock: 2n,
          highestBlock: 3n,
        }
      },
    } as unknown as PublicClient

    await expect(syncProgress(idleClient)).resolves.toBeNull()
    await expect(syncProgress(busyClient)).resolves.toEqual({
      startingBlock: 1n,
      currentBlock: 2n,
      highestBlock: 3n,
    })
  })

  test('transactionSender returns the sender and rejects wrong inclusion expectations', async () => {
    const client = {
      async getTransactionByBlockHashAndIndex() {
        return {
          hash: '0xaaaa',
          from: addr1,
          to: addr2,
          value: '0x0',
        }
      },
    } as unknown as PublicClient

    await expect(
      transactionSender(client, {
        blockHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        index: 0,
      }),
    ).resolves.toBe(addr1)

    await expect(
      transactionSender(client, {
        blockHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        index: 0,
        expectedHash:
          '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      }),
    ).rejects.toThrow(/wrong inclusion block\/index/)
  })

  test('balance/code/pending-call helpers delegate to the matching public-client methods', async () => {
    const calls: Array<{ method: string; args: unknown[] }> = []
    const client = {
      async getBalance(args: unknown) {
        calls.push({ method: 'getBalance', args: [args] })
        return 42n
      },
      async getCode(args: unknown) {
        calls.push({ method: 'getCode', args: [args] })
        return '0x6001'
      },
      async pendingCall(args: unknown) {
        calls.push({ method: 'pendingCall', args: [args] })
        return '0xdeadbeef'
      },
    } as unknown as PublicClient

    await expect(balanceAt(client, { account: addr1, blockTag: 'latest' })).resolves.toBe(42n)
    await expect(pendingBalanceAt(client, { account: addr1 })).resolves.toBe(42n)
    await expect(codeAt(client, { account: addr1 })).resolves.toBe('0x6001')
    await expect(
      pendingCallContract(client, {
        request: {
          to: addr2,
          data: '0xabcdef',
        },
      }),
    ).resolves.toBe('0xdeadbeef')

    expect(calls).toEqual([
      { method: 'getBalance', args: [{ address: addr1, blockTag: 'latest' }] },
      { method: 'getBalance', args: [{ address: addr1, blockTag: 'pending' }] },
      { method: 'getCode', args: [{ address: addr1 }] },
      {
        method: 'pendingCall',
        args: [{ request: { to: addr2, data: '0xabcdef' } }],
      },
    ])
  })

  test('subscribeNewHead and suggestGasTipCap adapt common go-client helpers', async () => {
    const delivered: unknown[] = []
    const client = {
      async maxPriorityFeePerGas() {
        return 123n
      },
      async watchBlocks({
        onBlock,
      }: {
        onBlock(block: unknown): void
      }) {
        onBlock({ number: '0x10', hash: '0x1234' })
        return {
          unsubscribe() {},
        }
      },
    } as unknown as PublicClient

    await expect(suggestGasTipCap(client)).resolves.toBe(123n)
    const subscription = await subscribeNewHead(client, {
      onHeader(header) {
        delivered.push(header)
      },
    })

    expect(subscription).toBeDefined()
    expect(delivered).toEqual([{ number: '0x10', hash: '0x1234' }])
  })
})

describe('proof market surface', () => {
  test('classifies public proof artifact kinds', () => {
    expect(isPublicProofArtifactKind('zktls.bundle')).toBe(true)
    expect(isPublicProofArtifactKind('committee.aggregate')).toBe(true)
    expect(isPublicProofArtifactKind('proof.verifier_receipt')).toBe(true)
    expect(isPublicProofArtifactKind('public_news.capture')).toBe(false)
  })

  test('classifies cryptographic proof artifact kinds', () => {
    expect(isCryptographicProofArtifactKind('zktls.bundle')).toBe(true)
    expect(isCryptographicProofArtifactKind('proof.material')).toBe(true)
    expect(isCryptographicProofArtifactKind('committee.vote')).toBe(false)
  })

  test('builds bounded proof artifact search params', () => {
    const params = buildProofArtifactSearchParams({
      kinds: ['zktls.bundle', 'committee.aggregate'],
      sourceUrlPrefix: ' https://news.example.com ',
      subjectId: ' headline-1 ',
      verifiedOnly: true,
      anchoredOnly: true,
    })
    expect(params.kinds).toEqual(['zktls.bundle', 'committee.aggregate'])
    expect(params.sourceUrlPrefix).toBe('https://news.example.com')
    expect(params.subjectId).toBe('headline-1')
    expect(params.verifiedOnly).toBe(true)
    expect(params.anchoredOnly).toBe(true)
  })

  test('verifies proof receipts and anchors', () => {
    const receipt = verifyProofArtifactReceipt({
      version: 1,
      verificationId: 'proof-1',
      artifactId: 'artifact-1',
      kind: 'proof.verifier_receipt',
      cid: 'bafyproof',
      bundleHash:
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      verifierAddress: addr1,
      status: 'verified',
      responseHash:
        '0x2222222222222222222222222222222222222222222222222222222222222222',
      checkedAt: '2026-03-10T00:00:00Z',
    })
    expect(receipt.status).toBe('verified')
    expect(receipt.receiptHash).toMatch(/^0x/)

    const anchor = verifyProofArtifactAnchor({
      version: 1,
      anchorId: 'anchor-1',
      artifactId: 'artifact-1',
      kind: 'committee.aggregate',
      cid: 'bafyproof',
      bundleHash:
        '0x3333333333333333333333333333333333333333333333333333333333333333',
      createdAt: '2026-03-10T00:00:00Z',
    })
    expect(anchor.kind).toBe('committee.aggregate')
    expect(anchor.summaryHash).toMatch(/^0x/)
  })
})

describe('agent discovery surface', () => {
  function createAgentDiscoveryClient(): PublicClient {
    const cards = new Map([
      ['enr:-artifact', {
        nodeId: 'node-artifact',
        nodeRecord: 'enr:-artifact',
        cardJson: '{}',
        parsedCard: {
          agent_id: 'settlement-agent',
          agent_address: addr1,
          package_name: 'tolang.openlib.settlement',
          capabilities: [{
            name: 'settlement.execute',
            mode: 'sponsored',
            policy: { per_request_fee_tos: '7' },
          }],
          routing_profile: {
            service_kind: 'settlement',
            service_kinds: ['settlement', 'marketplace'],
            capability_kind: 'managed_execution',
            privacy_mode: 'public',
            receipt_mode: 'required',
            disclosure_ready: false,
          },
        },
      }],
      ['enr:-package', {
        nodeId: 'node-package',
        nodeRecord: 'enr:-package',
        cardJson: '{}',
        parsedCard: {
          agent_id: 'privacy-agent',
          agent_address: addr2,
          package_name: 'tolang.openlib.privacy',
          capabilities: [{
            name: 'settlement.execute',
            mode: 'paid',
            policy: { per_request_fee_tos: '2' },
          }],
        },
      }],
      ['enr:-weak', {
        nodeId: 'node-weak',
        nodeRecord: 'enr:-weak',
        cardJson: '{}',
        parsedCard: {
          agent_id: 'weak-agent',
          capabilities: [{ name: 'settlement.execute', mode: 'sponsored' }],
        },
      }],
    ])
    return {
      agentDiscoverySearch: async ({ capability }: AgentSearchParams) => {
        if (capability === 'settlement.execute') {
          return [
            {
              nodeId: 'node-weak',
              nodeRecord: 'enr:-weak',
              connectionModes: 1,
              trust: {
                registered: false,
                suspended: false,
                stake: '0',
                reputation: '0',
                ratingCount: '0',
                capabilityRegistered: false,
                hasOnchainCapability: false,
                localRankScore: 99,
              },
            },
            {
              nodeId: 'node-artifact',
              nodeRecord: 'enr:-artifact',
              connectionModes: 3,
              trust: {
                registered: true,
                suspended: false,
                stake: '10',
                reputation: '20',
                ratingCount: '2',
                capabilityRegistered: true,
                hasOnchainCapability: true,
                localRankScore: 80,
              },
            },
            {
              nodeId: 'node-package',
              nodeRecord: 'enr:-package',
              connectionModes: 5,
              trust: {
                registered: true,
                suspended: false,
                stake: '5',
                reputation: '10',
                ratingCount: '1',
                capabilityRegistered: true,
                hasOnchainCapability: true,
                localRankScore: 70,
              },
            },
          ]
        }
        return []
      },
      agentDiscoveryDirectorySearch: async ({
        capability,
      }: AgentDirectorySearchParams) => {
        if (capability === 'settlement.execute') {
          return [
            {
              nodeId: 'node-package',
              nodeRecord: 'enr:-package',
              connectionModes: 5,
              trust: {
                registered: true,
                suspended: false,
                stake: '5',
                reputation: '10',
                ratingCount: '1',
                capabilityRegistered: true,
                hasOnchainCapability: true,
                localRankScore: 70,
              },
            },
          ]
        }
        return []
      },
      agentDiscoveryGetCard: async ({ nodeRecord }: { nodeRecord: string }) =>
        cards.get(nodeRecord)!,
    } as unknown as PublicClient
  }

  test('connectionModesFromMask expands bitmask', () => {
    expect(connectionModesFromMask(0x03)).toEqual(['talkreq', 'https'])
    expect(connectionModesFromMask(0x04)).toEqual(['stream'])
  })

  test('discoverAgentProviders joins search results with parsed cards', async () => {
    const client = createAgentDiscoveryClient()
    const providers = await discoverAgentProviders(client, {
      capability: 'settlement.execute',
      limit: 5,
    })
    expect(providers).toHaveLength(3)
    expect(providers[1]?.parsedCard?.agent_id).toBe('settlement-agent')
    expect(providers[1]?.matchedCapability).toBe('settlement.execute')
    expect(providers[1]?.matchedCapabilityEntry?.mode).toBe('sponsored')
  })

  test('directoryDiscoverAgentProviders joins directory results', async () => {
    const client = createAgentDiscoveryClient()
    const providers = await directoryDiscoverAgentProviders(client, {
      nodeRecord: 'enr:-dir',
      capability: 'settlement.execute',
      limit: 3,
    })
    expect(providers).toHaveLength(1)
    expect(providers[0]?.parsedCard?.package_name).toBe('tolang.openlib.privacy')
  })

  test('trusted/preferred provider helpers filter and resolve', async () => {
    const client = createAgentDiscoveryClient()
    const providers = await discoverAgentProviders(client, {
      capability: 'settlement.execute',
    })
    const trusted = rankTrustedAgentProviders(providers)
    expect(trusted.map((item) => item.provider.search.nodeId)).toEqual([
      'node-artifact',
      'node-package',
    ])

    const preferred = filterPreferredAgentProviders(trusted, {
      requiredConnectionModes: ['https'],
      serviceKind: 'settlement',
      capabilityKind: 'managed_execution',
      receiptMode: 'required',
      minTrustScore: 75,
    })
    expect(preferred).toHaveLength(1)
    expect(preferred[0]?.provider.search.nodeId).toBe('node-artifact')

    const selected = resolvePreferredAgentProvider(trusted, {
      packagePrefix: 'tolang.openlib.privacy',
      requiredConnectionModes: ['stream'],
    })
    expect(selected?.provider.search.nodeId).toBe('node-package')
  })

  test('diagnoseAgentProviders explains trust and preference failures', async () => {
    const client = createAgentDiscoveryClient()
    const providers = await discoverAgentProviders(client, {
      capability: 'settlement.execute',
    })
    const diagnostics = diagnoseAgentProviders(providers, {
      requiredConnectionModes: ['https'],
      serviceKind: 'settlement',
      capabilityKind: 'managed_execution',
      receiptMode: 'required',
      minTrustScore: 75,
    })
    expect(diagnostics).toHaveLength(3)
    expect(diagnostics[0]?.trusted).toBe(false)
    expect(diagnostics[0]?.trustFailures).toContain('provider not registered')
    expect(diagnostics[1]?.preferred).toBe(true)
    expect(diagnostics[2]?.preferred).toBe(false)
    expect(diagnostics[2]?.preferenceFailures.length).toBeGreaterThan(0)
  })

  test('searchPreferredAgentProvider resolves the best trusted match directly from the client', async () => {
    const client = createAgentDiscoveryClient()
    const selected = await searchPreferredAgentProvider(
      client,
      {
        capability: 'settlement.execute',
      },
      {
        requiredConnectionModes: ['https'],
        serviceKind: 'settlement',
        capabilityKind: 'managed_execution',
        receiptMode: 'required',
        minTrustScore: 75,
      },
    )
    expect(selected?.provider.search.nodeId).toBe('node-artifact')

    const directorySelected = await directorySearchPreferredAgentProvider(
      client,
      {
        nodeRecord: 'enr:-dir',
        capability: 'settlement.execute',
      },
      {
        requiredConnectionModes: ['stream'],
        packagePrefix: 'tolang.openlib.privacy',
      },
    )
    expect(directorySelected?.provider.search.nodeId).toBe('node-package')
  })

  test('searchPreferredAgentProviderWithDiagnostics returns both the selected provider and explanation set', async () => {
    const client = createAgentDiscoveryClient()
    const resolved = await searchPreferredAgentProviderWithDiagnostics(
      client,
      {
        capability: 'settlement.execute',
      },
      {
        requiredConnectionModes: ['https'],
        serviceKind: 'settlement',
        capabilityKind: 'managed_execution',
        receiptMode: 'required',
        minTrustScore: 75,
      },
    )
    expect(resolved.provider?.provider.search.nodeId).toBe('node-artifact')
    expect(
      resolved.diagnostics.find((item) => item.provider.search.nodeId === 'node-weak')
        ?.trustFailures,
    ).toContain('provider not registered')

    const directoryResolved =
      await directorySearchPreferredAgentProviderWithDiagnostics(
        client,
        {
          nodeRecord: 'enr:-dir',
          capability: 'settlement.execute',
        },
        {
          requiredConnectionModes: ['stream'],
          packagePrefix: 'tolang.openlib.privacy',
        },
    )
    expect(directoryResolved.provider?.provider.search.nodeId).toBe('node-package')
    expect(directoryResolved.diagnostics[0]?.preferred).toBe(true)
  })

  test('preferred-provider throw helpers and diagnostic summaries are usable by app code', async () => {
    const client = createAgentDiscoveryClient()
    const resolved = await searchPreferredAgentProviderWithDiagnostics(
      client,
      {
        capability: 'settlement.execute',
      },
      {
        requiredConnectionModes: ['https'],
        serviceKind: 'settlement',
        capabilityKind: 'managed_execution',
        receiptMode: 'required',
        minTrustScore: 75,
      },
    )
    expect(requirePreferredAgentProvider(resolved, 'settlement.execute').provider.search.nodeId).toBe(
      'node-artifact',
    )

    await expect(
      searchPreferredAgentProviderOrThrow(
        client,
        { capability: 'settlement.execute' },
        {
          packagePrefix: 'tolang.openlib.nonexistent',
        },
      ),
    ).rejects.toThrow(/package prefix mismatch/)

    const missingDirectory = await directorySearchPreferredAgentProviderWithDiagnostics(
      client,
      {
        nodeRecord: 'enr:-dir',
        capability: 'settlement.execute',
      },
      {
        requiredConnectionModes: ['https'],
        packagePrefix: 'tolang.openlib.nonexistent',
      },
    )
    expect(summarizeAgentProviderDiagnostics(missingDirectory.diagnostics)).toMatch(
      /package prefix mismatch/,
    )
    expect(() =>
      requirePreferredAgentProvider(missingDirectory, 'settlement.execute'),
    ).toThrow(/package prefix mismatch/)
    await expect(
      directorySearchPreferredAgentProviderOrThrow(
        client,
        {
          nodeRecord: 'enr:-dir',
          capability: 'settlement.execute',
        },
        {
          requiredConnectionModes: ['https'],
          packagePrefix: 'tolang.openlib.nonexistent',
        },
      ),
    ).rejects.toThrow(/package prefix mismatch/)
  })

  test('execution policy can prefer paid providers with lower advertised fees', async () => {
    const client = createAgentDiscoveryClient()
    const providers = await discoverAgentProviders(client, {
      capability: 'settlement.execute',
    })

    const defaultTrusted = rankTrustedAgentProviders(providers)
    expect(defaultTrusted.map((item) => item.provider.search.nodeId)).toEqual([
      'node-artifact',
      'node-package',
    ])

    const paidFirstTrusted = rankTrustedAgentProviders(providers, {
      searchLimit: 10,
      preferredModes: ['paid', 'hybrid', 'sponsored'],
      preferLowerAdvertisedFee: true,
    })
    expect(paidFirstTrusted.map((item) => item.provider.search.nodeId)).toEqual([
      'node-package',
      'node-artifact',
    ])
  })

  test('searchPreferredAgentProvider accepts execution-policy bundles', async () => {
    const client = createAgentDiscoveryClient()
    const selected = await searchPreferredAgentProvider(
      client,
      {
        capability: 'settlement.execute',
      },
      {
        requiredConnectionModes: ['stream'],
        packagePrefix: 'tolang.openlib.privacy',
      },
      {
        preferredModes: ['paid', 'hybrid', 'sponsored'],
        preferLowerAdvertisedFee: true,
      },
    )
    expect(selected?.provider.search.nodeId).toBe('node-package')
  })
})

describe('agent runtime surface', () => {
  function createAgentRuntimeClient(): PublicClient {
    const cards = new Map([
      ['enr:-artifact', {
        nodeId: 'node-artifact',
        nodeRecord: 'enr:-artifact',
        cardJson: '{}',
        parsedCard: {
          agent_id: 'settlement-agent',
          agent_address: addr1,
          package_name: 'tolang.openlib.settlement',
          routing_profile: {
            service_kind: 'settlement',
            service_kinds: ['settlement'],
            capability_kind: 'managed_execution',
            receipt_mode: 'required',
          },
        },
      }],
      ['enr:-package', {
        nodeId: 'node-package',
        nodeRecord: 'enr:-package',
        cardJson: '{}',
        parsedCard: {
          agent_id: 'privacy-agent',
          agent_address: addr2,
          package_name: 'tolang.openlib.privacy',
        },
      }],
      ['enr:-malformed', {
        nodeId: 'node-malformed',
        nodeRecord: 'enr:-malformed',
        cardJson: '{}',
        parsedCard: {
          agent_id: 'bad-agent',
          agent_address: 'not-an-address',
        },
      }],
    ])
    const metadata = new Map<string, Record<string, unknown>>([
      [addr1, {
        address: addr1,
        code_kind: 'toc',
        code_hash:
          '0x1111111111111111111111111111111111111111111111111111111111111111',
        artifact: {
          contract_name: 'TaskSettlement',
          bytecode_hash:
            '0x1212121212121212121212121212121212121212121212121212121212121212',
          abi: [],
          profile: {
            schema_version: '0.2.0',
            identity: {
              package_name: 'tolang.openlib.settlement',
              package_version: '1.0.0',
            },
            contract: {
              name: 'TaskSettlement',
            },
          },
          routing_profile: {
            service_kind: 'settlement',
            service_kinds: ['settlement'],
            capability_kind: 'managed_execution',
            receipt_mode: 'required',
          },
          suggested_card: {
            agent_id: 'task-settlement',
            agent_address: addr1,
          },
        },
      }],
      [addr2, {
        address: addr2,
        code_kind: 'tor',
        code_hash:
          '0x2222222222222222222222222222222222222222222222222222222222222222',
        package: {
          name: 'privacy',
          package: 'tolang.openlib.privacy',
          version: '1.0.0',
          main_contract: 'ConfidentialEscrow',
          manifest: {},
          contracts: [],
          published: {
            name: 'tolang.openlib.privacy',
            version: '1.0.0',
            package_hash:
              '0x2323232323232323232323232323232323232323232323232323232323232323',
            publisher_id:
              '0x2424242424242424242424242424242424242424242424242424242424242424',
            channel: 'stable',
            status: 'active',
            effective_status: 'active',
            trusted: false,
            contract_count: 1,
            published_at: 10,
          },
        },
      }],
      [addr3, {
        address: addr3,
        code_kind: 'toc',
        code_hash:
          '0x3333333333333333333333333333333333333333333333333333333333333333',
        artifact: {
          contract_name: 'Treasury',
          bytecode_hash:
            '0x3434343434343434343434343434343434343434343434343434343434343434',
          abi: [],
        },
      }],
    ])
    return {
      agentDiscoverySearch: async ({ capability }: AgentSearchParams) => {
        if (capability !== 'settlement.execute') return []
        return [
          {
            nodeId: 'node-artifact',
            nodeRecord: 'enr:-artifact',
            connectionModes: 3,
            trust: {
              registered: true,
              suspended: false,
              stake: '10',
              reputation: '20',
              ratingCount: '2',
              capabilityRegistered: true,
              hasOnchainCapability: true,
              localRankScore: 80,
            },
          },
          {
            nodeId: 'node-package',
            nodeRecord: 'enr:-package',
            connectionModes: 5,
            trust: {
              registered: true,
              suspended: false,
              stake: '5',
              reputation: '10',
              ratingCount: '1',
              capabilityRegistered: true,
              hasOnchainCapability: true,
              localRankScore: 70,
            },
          },
        ]
      },
      agentDiscoveryDirectorySearch: async ({ capability }: AgentDirectorySearchParams) => {
        if (capability !== 'settlement.execute') return []
        return [
          {
            nodeId: 'node-artifact',
            nodeRecord: 'enr:-artifact',
            connectionModes: 3,
            trust: {
              registered: true,
              suspended: false,
              stake: '10',
              reputation: '20',
              ratingCount: '2',
              capabilityRegistered: true,
              hasOnchainCapability: true,
              localRankScore: 80,
            },
          },
        ]
      },
      agentDiscoveryGetCard: async ({ nodeRecord }: { nodeRecord: string }) =>
        cards.get(nodeRecord)!,
      getContractMetadata: async ({ address }: { address: Address }) =>
        (metadata.get(address) ?? null) as any,
      getRuntimeReceipt: async () => ({
        receiptRef:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
        receiptKind: 7,
        status: 'success',
        mode: 1,
        modeName: 'PUBLIC_TRANSFER',
        sender: addr1,
        recipient: addr3,
        settlementRef:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1',
        openedAt: 10,
        finalizedAt: 11,
      }),
      getSettlementEffect: async () => ({
        settlementRef:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1',
        receiptRef:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
        mode: 1,
        modeName: 'PUBLIC_TRANSFER',
        sender: addr1,
        recipient: addr3,
        createdAt: 12,
      }),
    } as unknown as PublicClient
  }

  test('getAgentRuntimeSurface normalizes deployed metadata', async () => {
    const client = createAgentRuntimeClient()
    const surface = await getAgentRuntimeSurface(client, { address: addr1 })
    expect(surface?.codeKind).toBe('toc')
    expect(surface?.contractName).toBe('TaskSettlement')
    expect(surface?.packageName).toBe('tolang.openlib.settlement')
    expect(surface?.routing?.service_kind).toBe('settlement')
  })

  test('discovery/runtime helpers join cards, metadata, and trust filtering', async () => {
    const client = createAgentRuntimeClient()

    const discovered = await getDiscoveredAgentSurface(client, {
      nodeRecord: 'enr:-artifact',
    })
    expect(discovered.runtime?.packageName).toBe('tolang.openlib.settlement')

    const malformed = await getDiscoveredAgentSurface(client, {
      nodeRecord: 'enr:-malformed',
    })
    expect(malformed.runtime).toBeUndefined()

    const joined = await searchDiscoveredAgentSurfaces(client, {
      capability: 'settlement.execute',
    })
    expect(joined).toHaveLength(2)
    expect(joined[0]?.surface?.runtime?.contractName).toBe('TaskSettlement')

    const trusted = await searchTrustedAgentSurfaces(client, {
      capability: 'settlement.execute',
    })
    expect(trusted).toHaveLength(1)
    expect(trusted[0]?.result.nodeId).toBe('node-artifact')

    const preferred = await searchPreferredAgentSurfaces(
      client,
      { capability: 'settlement.execute' },
      {
        requiredConnectionModes: ['https'],
        serviceKind: 'settlement',
        capabilityKind: 'managed_execution',
        receiptMode: 'required',
        minTrustScore: 75,
      },
    )
    expect(preferred).toHaveLength(1)
    expect(preferred[0]?.result.nodeId).toBe('node-artifact')

    const resolved = await resolvePreferredAgentSurface(
      client,
      { capability: 'settlement.execute' },
      { packagePrefix: 'tolang.openlib.settlement' },
    )
    expect(resolved?.result.nodeId).toBe('node-artifact')

    const diagnostics = await searchPreferredAgentSurfaceDiagnostics(
      client,
      { capability: 'settlement.execute' },
      { packagePrefix: 'tolang.openlib.settlement' },
    )
    expect(
      diagnostics.find((item) => item.entry.result.nodeId === 'node-package')
        ?.trustFailures,
    ).toContain('package is untrusted')
    expect(
      diagnosePreferredAgentSurfaces(joined, {
        packagePrefix: 'tolang.openlib.settlement',
      }),
    ).toHaveLength(2)
  })

  test('runtime settlement surface joins runtime metadata for sender and recipient', async () => {
    const client = createAgentRuntimeClient()

    const receiptSurface = await getRuntimeReceiptSurface(client, {
      receiptRef:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
    })
    expect(receiptSurface.effect?.settlementRef).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1',
    )
    expect(receiptSurface.senderRuntime?.contractName).toBe('TaskSettlement')
    expect(receiptSurface.recipientRuntime?.contractName).toBe('Treasury')

    const effectSurface = await getSettlementEffectSurface(client, {
      settlementRef:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb1',
    })
    expect(effectSurface.receipt?.receiptRef).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
    )
    expect(effectSurface.recipientRuntime?.contractName).toBe('Treasury')
  })
})
