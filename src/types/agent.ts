import type { Address } from './address.js'

export type AgentConnectionMode = 'talkreq' | 'https' | 'stream'

/** Trust summary for an agent provider from on-chain registry. */
export type AgentProviderTrustSummary = {
  registered: boolean
  suspended: boolean
  stake: string
  stakeBucket?: string | undefined
  reputation: string
  reputationBucket?: string | undefined
  ratingCount: string
  capabilityRegistered: boolean
  capabilityBit?: number | undefined
  hasOnchainCapability: boolean
  localRankScore?: number | undefined
  localRankReason?: string | undefined
}

export type AgentPublishedCapability = {
  name: string
  mode?: string | undefined
  ref?: string | undefined
  policy?: Record<string, unknown> | undefined
  rate_limit?: string | undefined
  max_amount?: string | undefined
  price_model?: string | undefined
  description?: string | undefined
}

export type AgentRoutingProfile = {
  contract_type?: string | undefined
  service_kinds?: readonly string[] | undefined
  service_kind?: string | undefined
  capability_kind?: string | undefined
  pricing_kind?: string | undefined
  base_fee?: string | undefined
  privacy_mode?: string | undefined
  receipt_mode?: string | undefined
  disclosure_ready?: boolean | undefined
  trust_floor_ref?: string | undefined
}

export type AgentPublishedThreatModel = {
  family?: string | undefined
  trust_boundary?: string | undefined
  failure_posture?: string | undefined
  runtime_dependency?: string | undefined
  critical_invariants?: readonly string[] | undefined
}

export type AgentPublishedDeploymentTrust = {
  package_name?: string | undefined
  package_version?: string | undefined
  publisher_id?: string | undefined
  trusted?: boolean | undefined
  status?: string | undefined
  effective_status?: string | undefined
  namespace_status?: string | undefined
}

export type AgentPublishedCard = {
  version?: number | undefined
  agent_id?: string | undefined
  agent_address?: Address | undefined
  profile_ref?: string | undefined
  discovery_ref?: string | undefined
  package_name?: string | undefined
  package_version?: string | undefined
  capabilities?: readonly AgentPublishedCapability[] | undefined
  routing_profile?: AgentRoutingProfile | undefined
  threat_model?: AgentPublishedThreatModel | undefined
  deployment_trust?: AgentPublishedDeploymentTrust | undefined
}

/** Info returned by `tos_agentDiscoveryInfo`. */
export type AgentDiscoveryInfo = {
  enabled: boolean
  profileVersion: number
  talkProtocol: string
  nodeId?: string | undefined
  nodeRecord?: string | undefined
  primaryIdentity?: string | undefined
  cardSequence?: number | undefined
  connectionModes?: number | undefined
  capabilities?: readonly string[] | undefined
  hasPublishedCard: boolean
}

/** Result item returned by `tos_agentDiscoverySearch` and `tos_agentDiscoveryDirectorySearch`. */
export type AgentSearchResult = {
  nodeId: string
  nodeRecord: string
  primaryIdentity?: string | undefined
  connectionModes?: number | undefined
  cardSequence?: number | undefined
  capabilities?: readonly string[] | undefined
  trust?: AgentProviderTrustSummary | undefined
}

/** Card response returned by `tos_agentDiscoveryGetCard`. */
export type AgentCardResponse = {
  nodeId: string
  nodeRecord: string
  cardJson: string
  parsedCard?: AgentPublishedCard | undefined
}

/** Parameters for `agentDiscoverySearch`. */
export type AgentSearchParams = {
  capability: string
  limit?: number | undefined
}

/** Parameters for `agentDiscoveryDirectorySearch`. */
export type AgentDirectorySearchParams = {
  nodeRecord: string
  capability: string
  limit?: number | undefined
}

/** Parameters for `agentDiscoveryPublish`. */
export type AgentPublishParams = {
  primaryIdentity: Address
  capabilities: readonly string[]
  connectionModes?: readonly string[] | undefined
  cardJson?: string | undefined
  cardSequence?: number | undefined
}
