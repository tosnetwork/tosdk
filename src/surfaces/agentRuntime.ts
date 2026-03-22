import type {
  AgentCardResponse,
  AgentConnectionMode,
  AgentPublishedCard,
  AgentSearchResult,
} from '../types/agent.js'
import type {
  AgentBundleProfile,
  AgentContractProfile,
  DeployedCodeInfo,
  PackageInfo,
  PublisherInfo,
  TOLArtifactInfo,
  TOLPackageInfo,
} from '../types/protocol.js'
import type { PublicClient, BlockTag } from '../types/client.js'
import type { Address } from '../types/address.js'
import type { RuntimeReceipt, SettlementEffect } from '../types/settlement.js'
import { getAddress } from '../utils/address/getAddress.js'
import type { AgentProviderSelectionPreferences } from './agentDiscovery.js'

export type AgentRuntimeSurface = {
  address: Address
  codeKind: string
  contractName?: string | undefined
  packageName?: string | undefined
  packageVersion?: string | undefined
  profile?: AgentContractProfile | undefined
  bundleProfile?: AgentBundleProfile | undefined
  routing?: import('../types/agent.js').AgentRoutingProfile | undefined
  suggestedCard?: AgentPublishedCard | undefined
  published?: PackageInfo | undefined
  publisher?: PublisherInfo | undefined
  artifact?: TOLArtifactInfo | undefined
  package?: TOLPackageInfo | undefined
}

export type DiscoveredAgentSurface = {
  nodeRecord: string
  card: AgentCardResponse
  runtime?: AgentRuntimeSurface | undefined
}

export type SearchResultSurface = {
  result: AgentSearchResult
  surface?: DiscoveredAgentSurface | undefined
}

export type TrustedSearchResultSurface = SearchResultSurface & {
  trustScore: number
}

export type SettlementRuntimeSurface = {
  receipt?: RuntimeReceipt | undefined
  effect?: SettlementEffect | undefined
  senderRuntime?: AgentRuntimeSurface | undefined
  recipientRuntime?: AgentRuntimeSurface | undefined
}

export type AgentSurfaceSelectionPreferences = AgentProviderSelectionPreferences

export type AgentSurfaceSelectionDiagnostics = {
  entry: SearchResultSurface
  trustScore: number
  trusted: boolean
  preferred: boolean
  trustFailures: string[]
  preferenceFailures: string[]
}

const CONNECTION_MODE_BITS: Record<AgentConnectionMode, number> = {
  talkreq: 0x01,
  https: 0x02,
  stream: 0x04,
}

function normalizeRuntimeSurface(
  info: DeployedCodeInfo,
): AgentRuntimeSurface {
  const artifact = info.artifact
  const pkg = info.package
  const profile = artifact?.profile
  const identity =
    profile && typeof profile.identity === 'object' && profile.identity
      ? (profile.identity as Record<string, unknown>)
      : undefined

  const packageName =
    typeof identity?.package_name === 'string'
      ? identity.package_name
      : pkg?.package ?? pkg?.name
  const packageVersion =
    typeof identity?.package_version === 'string'
      ? identity.package_version
      : pkg?.version

  return {
    address: info.address,
    codeKind: info.code_kind,
    contractName: artifact?.contract_name ?? pkg?.main_contract,
    packageName,
    packageVersion,
    profile,
    bundleProfile: pkg?.bundle_profile,
    routing: artifact?.routing_profile,
    suggestedCard: artifact?.suggested_card ?? pkg?.suggested_card,
    published: pkg?.published,
    publisher: pkg?.publisher,
    artifact,
    package: pkg,
  }
}

function tryNormalizeAddress(value: unknown): Address | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    return getAddress(value as Address)
  } catch {
    return undefined
  }
}

function isTrustedSearchSurface(entry: SearchResultSurface): boolean {
  const trust = entry.result.trust
  if (!trust) return false
  if (!trust.registered || trust.suspended || !trust.hasOnchainCapability) {
    return false
  }
  if (entry.surface?.runtime?.published && !entry.surface.runtime.published.trusted) {
    return false
  }
  return true
}

function requiredConnectionMask(
  modes: readonly AgentConnectionMode[] | undefined,
): number {
  if (!modes?.length) return 0
  return modes.reduce((mask, mode) => mask | CONNECTION_MODE_BITS[mode], 0)
}

function preferenceFailures(
  entry: SearchResultSurface,
  trustScore: number,
  prefs: AgentSurfaceSelectionPreferences,
): string[] {
  const failures: string[] = []
  if (prefs.minTrustScore && trustScore < prefs.minTrustScore) {
    failures.push('trust score below minimum')
  }
  const requiredMask = requiredConnectionMask(prefs.requiredConnectionModes)
  if (
    requiredMask !== 0 &&
    ((entry.result.connectionModes ?? 0) & requiredMask) !== requiredMask
  ) {
    failures.push('required connection modes missing')
  }
  const runtime = entry.surface?.runtime
  if (!runtime) {
    if (
      prefs.packagePrefix ||
      prefs.serviceKind ||
      prefs.capabilityKind ||
      prefs.privacyMode ||
      prefs.receiptMode ||
      prefs.requireDisclosureReady
    ) {
      failures.push('runtime metadata missing')
    }
    return failures
  }
  if (prefs.packagePrefix && !runtime.packageName?.startsWith(prefs.packagePrefix)) {
    failures.push('package prefix mismatch')
  }
  if (
    !prefs.serviceKind &&
    !prefs.capabilityKind &&
    !prefs.privacyMode &&
    !prefs.receiptMode &&
    !prefs.requireDisclosureReady
  ) {
    return failures
  }
  if (!runtime.routing) {
    failures.push('routing profile missing')
    return failures
  }
  if (prefs.serviceKind) {
    const serviceKinds = runtime.routing.service_kinds ?? []
    const match =
      runtime.routing.service_kind === prefs.serviceKind ||
      serviceKinds.includes(prefs.serviceKind)
    if (!match) failures.push('service kind mismatch')
  }
  if (
    prefs.capabilityKind &&
    runtime.routing.capability_kind !== prefs.capabilityKind
  ) {
    failures.push('capability kind mismatch')
  }
  if (prefs.privacyMode && runtime.routing.privacy_mode !== prefs.privacyMode) {
    failures.push('privacy mode mismatch')
  }
  if (prefs.receiptMode && runtime.routing.receipt_mode !== prefs.receiptMode) {
    failures.push('receipt mode mismatch')
  }
  if (
    prefs.requireDisclosureReady &&
    runtime.routing.disclosure_ready !== true
  ) {
    failures.push('disclosure-ready requirement not met')
  }
  return failures
}

async function joinSearchResults(
  client: PublicClient,
  results: readonly AgentSearchResult[],
  blockTag: BlockTag | number | bigint | undefined,
): Promise<SearchResultSurface[]> {
  const out: SearchResultSurface[] = []
  for (const result of results) {
    const entry: SearchResultSurface = { result }
    if (result.nodeRecord) {
      entry.surface = await getDiscoveredAgentSurface(client, {
        nodeRecord: result.nodeRecord,
        ...(typeof blockTag !== 'undefined' ? { blockTag } : {}),
      })
    }
    out.push(entry)
  }
  return out
}

export async function getAgentRuntimeSurface(
  client: PublicClient,
  parameters: {
    address: Address
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<AgentRuntimeSurface | undefined> {
  const info = await client.getContractMetadata(parameters)
  if (!info) return undefined
  return normalizeRuntimeSurface(info)
}

export async function getDiscoveredAgentSurface(
  client: PublicClient,
  parameters: {
    nodeRecord: string
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<DiscoveredAgentSurface> {
  const card = await client.agentDiscoveryGetCard({
    nodeRecord: parameters.nodeRecord,
  })
  const runtimeAddress = tryNormalizeAddress(card.parsedCard?.agent_address)
  const runtime = runtimeAddress
    ? await getAgentRuntimeSurface(client, {
        address: runtimeAddress,
        ...(typeof parameters.blockTag !== 'undefined'
          ? { blockTag: parameters.blockTag }
          : {}),
      })
    : undefined
  return {
    nodeRecord: parameters.nodeRecord,
    card,
    runtime,
  }
}

export async function getRuntimeReceiptSurface(
  client: PublicClient,
  parameters: {
    receiptRef: `0x${string}`
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<SettlementRuntimeSurface> {
  const receipt = await client.getRuntimeReceipt({ receiptRef: parameters.receiptRef })
  const effect =
    receipt.settlementRef && receipt.settlementRef !== ('0x' as `0x${string}`)
      ? await client.getSettlementEffect({ settlementRef: receipt.settlementRef })
      : undefined
  const senderRuntime = tryNormalizeAddress(receipt.sender)
    ? await getAgentRuntimeSurface(client, {
        address: receipt.sender,
        ...(typeof parameters.blockTag !== 'undefined'
          ? { blockTag: parameters.blockTag }
          : {}),
      })
    : undefined
  const recipientRuntime = tryNormalizeAddress(receipt.recipient)
    ? await getAgentRuntimeSurface(client, {
        address: receipt.recipient,
        ...(typeof parameters.blockTag !== 'undefined'
          ? { blockTag: parameters.blockTag }
          : {}),
      })
    : undefined
  return { receipt, effect, senderRuntime, recipientRuntime }
}

export async function getSettlementEffectSurface(
  client: PublicClient,
  parameters: {
    settlementRef: `0x${string}`
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<SettlementRuntimeSurface> {
  const effect = await client.getSettlementEffect({
    settlementRef: parameters.settlementRef,
  })
  const receipt =
    effect.receiptRef && effect.receiptRef !== ('0x' as `0x${string}`)
      ? await client.getRuntimeReceipt({ receiptRef: effect.receiptRef })
      : undefined
  const senderRuntime = tryNormalizeAddress(effect.sender)
    ? await getAgentRuntimeSurface(client, {
        address: effect.sender,
        ...(typeof parameters.blockTag !== 'undefined'
          ? { blockTag: parameters.blockTag }
          : {}),
      })
    : undefined
  const recipientRuntime = tryNormalizeAddress(effect.recipient)
    ? await getAgentRuntimeSurface(client, {
        address: effect.recipient,
        ...(typeof parameters.blockTag !== 'undefined'
          ? { blockTag: parameters.blockTag }
          : {}),
      })
    : undefined
  return { receipt, effect, senderRuntime, recipientRuntime }
}

export async function searchDiscoveredAgentSurfaces(
  client: PublicClient,
  parameters: {
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<SearchResultSurface[]> {
  const results = await client.agentDiscoverySearch({
    capability: parameters.capability,
    ...(typeof parameters.limit !== 'undefined' ? { limit: parameters.limit } : {}),
  })
  return joinSearchResults(client, results, parameters.blockTag)
}

export async function directorySearchDiscoveredAgentSurfaces(
  client: PublicClient,
  parameters: {
    nodeRecord: string
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<SearchResultSurface[]> {
  const results = await client.agentDiscoveryDirectorySearch({
    nodeRecord: parameters.nodeRecord,
    capability: parameters.capability,
    ...(typeof parameters.limit !== 'undefined' ? { limit: parameters.limit } : {}),
  })
  return joinSearchResults(client, results, parameters.blockTag)
}

export function rankTrustedAgentSurfaces(
  entries: readonly SearchResultSurface[],
): TrustedSearchResultSurface[] {
  return [...entries]
    .filter((entry) => isTrustedSearchSurface(entry))
    .map((entry) => ({
      ...entry,
      trustScore: entry.result.trust?.localRankScore ?? 0,
    }))
    .sort((a, b) => {
      if (a.trustScore !== b.trustScore) return b.trustScore - a.trustScore
      return a.result.nodeRecord.localeCompare(b.result.nodeRecord)
    })
}

export function filterPreferredAgentSurfaces(
  entries: readonly TrustedSearchResultSurface[],
  prefs: AgentSurfaceSelectionPreferences,
): TrustedSearchResultSurface[] {
  return entries.filter((entry) => preferenceFailures(entry, entry.trustScore, prefs).length === 0)
}

export async function searchTrustedAgentSurfaces(
  client: PublicClient,
  parameters: {
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<TrustedSearchResultSurface[]> {
  return rankTrustedAgentSurfaces(
    await searchDiscoveredAgentSurfaces(client, parameters),
  )
}

export async function directorySearchTrustedAgentSurfaces(
  client: PublicClient,
  parameters: {
    nodeRecord: string
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
): Promise<TrustedSearchResultSurface[]> {
  return rankTrustedAgentSurfaces(
    await directorySearchDiscoveredAgentSurfaces(client, parameters),
  )
}

export async function searchPreferredAgentSurfaces(
  client: PublicClient,
  parameters: {
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
  prefs: AgentSurfaceSelectionPreferences,
): Promise<TrustedSearchResultSurface[]> {
  return filterPreferredAgentSurfaces(
    await searchTrustedAgentSurfaces(client, parameters),
    prefs,
  )
}

export async function directorySearchPreferredAgentSurfaces(
  client: PublicClient,
  parameters: {
    nodeRecord: string
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
  prefs: AgentSurfaceSelectionPreferences,
): Promise<TrustedSearchResultSurface[]> {
  return filterPreferredAgentSurfaces(
    await directorySearchTrustedAgentSurfaces(client, parameters),
    prefs,
  )
}

export function selectPreferredAgentSurface(
  entries: readonly TrustedSearchResultSurface[],
  prefs: AgentSurfaceSelectionPreferences = {},
): TrustedSearchResultSurface | undefined {
  return filterPreferredAgentSurfaces(entries, prefs)[0]
}

export async function resolvePreferredAgentSurface(
  client: PublicClient,
  parameters: {
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
  prefs: AgentSurfaceSelectionPreferences,
): Promise<TrustedSearchResultSurface | undefined> {
  return selectPreferredAgentSurface(
    await searchTrustedAgentSurfaces(client, parameters),
    prefs,
  )
}

export async function resolveDirectoryPreferredAgentSurface(
  client: PublicClient,
  parameters: {
    nodeRecord: string
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
  prefs: AgentSurfaceSelectionPreferences,
): Promise<TrustedSearchResultSurface | undefined> {
  return selectPreferredAgentSurface(
    await directorySearchTrustedAgentSurfaces(client, parameters),
    prefs,
  )
}

export function diagnosePreferredAgentSurfaces(
  entries: readonly SearchResultSurface[],
  prefs: AgentSurfaceSelectionPreferences,
): AgentSurfaceSelectionDiagnostics[] {
  return entries.map((entry) => {
    const trustScore = entry.result.trust?.localRankScore ?? 0
    const trustFailures: string[] = []
    const trust = entry.result.trust
    if (!trust) {
      trustFailures.push('missing trust summary')
    } else {
      if (!trust.registered) trustFailures.push('provider not registered')
      if (trust.suspended) trustFailures.push('provider suspended')
      if (!trust.hasOnchainCapability) {
        trustFailures.push('capability missing on-chain')
      }
    }
    if (entry.surface?.runtime?.published && !entry.surface.runtime.published.trusted) {
      trustFailures.push('package is untrusted')
    }
    const preferenceFailuresForEntry = preferenceFailures(entry, trustScore, prefs)
    const trusted = trustFailures.length === 0
    return {
      entry,
      trustScore,
      trusted,
      preferred: trusted && preferenceFailuresForEntry.length === 0,
      trustFailures,
      preferenceFailures: preferenceFailuresForEntry,
    }
  })
}

export async function searchPreferredAgentSurfaceDiagnostics(
  client: PublicClient,
  parameters: {
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
  prefs: AgentSurfaceSelectionPreferences,
): Promise<AgentSurfaceSelectionDiagnostics[]> {
  return diagnosePreferredAgentSurfaces(
    await searchDiscoveredAgentSurfaces(client, parameters),
    prefs,
  )
}

export async function directorySearchPreferredAgentSurfaceDiagnostics(
  client: PublicClient,
  parameters: {
    nodeRecord: string
    capability: string
    limit?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  },
  prefs: AgentSurfaceSelectionPreferences,
): Promise<AgentSurfaceSelectionDiagnostics[]> {
  return diagnosePreferredAgentSurfaces(
    await directorySearchDiscoveredAgentSurfaces(client, parameters),
    prefs,
  )
}
