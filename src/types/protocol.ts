import type { Address } from './address.js'
import type {
  AgentPublishedCard,
  AgentRoutingProfile,
} from './agent.js'
import type { Hex } from './misc.js'

export type TOLContractMetadata = Record<string, unknown>

export type TOLDiscoveryManifest = Record<string, unknown>

export type TOLAgentPackageInfo = Record<string, unknown>

export type AgentContractProfile = {
  schema_version?: string | undefined
  identity?: Record<string, unknown> | undefined
  contract?: {
    name?: string | undefined
    type?: string | undefined
    is_account?: boolean | undefined
    tags?: readonly string[] | undefined
    policy_profile?: Record<string, unknown> | undefined
  } | undefined
  capabilities?: readonly string[] | undefined
  functions?: readonly Record<string, unknown>[] | undefined
  events?: readonly Record<string, unknown>[] | undefined
  errors?: readonly Record<string, unknown>[] | undefined
  service_kinds?: readonly string[] | undefined
  human_summary?: string | undefined
  gas_model?: Record<string, unknown> | undefined
  typed_discovery?: Record<string, unknown> | undefined
  threat_model?: Record<string, unknown> | undefined
  protocol_alignment?: Record<string, unknown> | undefined
  runtime_boundary?: Record<string, unknown> | undefined
}

export type AgentBundleProfile = {
  schema_version?: string | undefined
  family?: string | undefined
  package_name?: string | undefined
  package_version?: string | undefined
  contracts?: readonly AgentContractProfile[] | undefined
  threat_model?: Record<string, unknown> | undefined
  protocol_alignment?: Record<string, unknown> | undefined
  runtime_boundary?: Record<string, unknown> | undefined
  human_summary?: string | undefined
}

export type PackageInfo = {
  name: string
  namespace?: string | undefined
  version: string
  package_hash: Hex
  manifest_hash?: Hex | undefined
  publisher_id: Hex
  channel: string
  status: string
  effective_status?: string | undefined
  namespace_status?: string | undefined
  trusted: boolean
  contract_count: number
  discovery_ref?: string | undefined
  published_at: number
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type PublisherInfo = {
  publisher_id: Hex
  controller: Address
  metadata_ref: string
  namespace?: string | undefined
  status: string
  effective_status?: string | undefined
  namespace_status?: string | undefined
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type NamespaceGovernanceInfo = {
  namespace: string
  publisher_id?: Hex | undefined
  status: string
  evidence_ref?: string | undefined
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
}

export type CapabilityInfo = {
  owner?: Address | undefined
  name: string
  bit_index: number
  category: number
  version: number
  status: string
  manifest_ref?: string | undefined
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type DelegationInfo = {
  principal: Address
  delegate: Address
  scope_ref: Hex
  capability_ref: string
  policy_ref: string
  not_before_ms: number
  expiry_ms: number
  status: string
  effective_status?: string | undefined
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type VerifierInfo = {
  name: string
  verifier_type: number
  verifier_class?: string | undefined
  controller?: Address | undefined
  verifier_addr: Address
  policy_ref?: string | undefined
  version: number
  status: string
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type VerificationClaimInfo = {
  subject: Address
  proof_type: string
  proof_class?: string | undefined
  verifier_class?: string | undefined
  verified_at: number
  expiry_ms: number
  status: string
  effective_status?: string | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type SettlementPolicyInfo = {
  policy_id: string
  kind: number
  policy_class?: string | undefined
  owner: Address
  asset: string
  max_amount: string
  rules_ref?: string | undefined
  status: string
  created_at?: number | undefined
  updated_at?: number | undefined
  updated_by?: Address | Hex | string | undefined
  status_ref?: string | undefined
}

export type AgentIdentityInfo = {
  agent_address: Address
  registered: boolean
  suspended: boolean
  status: number
  stake: string
  metadata_uri?: string | undefined
  binding_hash?: Hex | undefined
  binding_active: boolean
  binding_verified: boolean
  binding_expiry: number
}

export type TOLArtifactInfo = {
  contract_name: string
  bytecode_hash: Hex
  abi: unknown
  metadata?: TOLContractMetadata | undefined
  discovery?: TOLDiscoveryManifest | undefined
  agent_package?: TOLAgentPackageInfo | undefined
  profile?: AgentContractProfile | undefined
  routing_profile?: AgentRoutingProfile | undefined
  suggested_card?: AgentPublishedCard | undefined
}

export type TOLPackageContractInfo = {
  name: string
  artifact_path?: string | undefined
  interface_path?: string | undefined
  artifact?: TOLArtifactInfo | undefined
}

export type TOLPackageInfo = {
  name?: string | undefined
  package?: string | undefined
  version?: string | undefined
  main_contract?: string | undefined
  init_code?: Hex | string | undefined
  manifest: unknown
  contracts: readonly TOLPackageContractInfo[]
  bundle_profile?: AgentBundleProfile | undefined
  published?: PackageInfo | undefined
  publisher?: PublisherInfo | undefined
  suggested_card?: AgentPublishedCard | undefined
}

export type DeployedCodeInfo = {
  address: Address
  code_hash: Hex
  code_kind: string
  artifact?: TOLArtifactInfo | undefined
  package?: TOLPackageInfo | undefined
}
