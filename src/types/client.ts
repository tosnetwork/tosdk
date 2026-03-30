import type { LocalAccount } from '../accounts/types.js'

import type { Address } from './address.js'
import type {
  AgentCardResponse,
  AgentDirectorySearchParams,
  AgentDiscoveryInfo,
  AgentPublishedCard,
  AgentPublishParams,
  AgentSearchParams,
  AgentSearchResult,
} from './agent.js'
import type { Chain } from './chain.js'
import type {
  CallPackageParameters,
  DeployPackageParameters,
  PackageArgument,
  SendPackageTransactionParameters,
} from './contract.js'
import type {
  BuiltTransactionResult,
  GetLeaseParameters,
  LeaseCloseParameters,
  LeaseDeployParameters,
  LeaseDeployResult,
  LeaseRecord,
  LeaseRenewParameters,
  WalletLeaseCloseParameters,
  WalletLeaseDeployParameters,
  WalletLeaseRenewParameters,
} from './lease.js'
import type { Hex, Signature } from './misc.js'
import type {
  EpochInfo,
  GetEpochInfoParams,
  GetSnapshotParams,
  GetValidatorParams,
  GetValidatorsParams,
  Snapshot,
  ValidatorInfo,
} from './dpos.js'
import type {
  EncryptedBalanceInfo,
  GetPrivBalanceParameters,
  GetPrivNonceParameters,
  PrivBalanceRecord,
} from './privacy.js'
import type {
  AuditorDecryptParams,
  AuditorDecryptResult,
  DecryptionToken,
  DecryptionTokenParams,
  DisclosureProofParams,
  DisclosureProofResult,
  VerifyDisclosureParams,
} from './disclosure.js'
import type {
  TxPoolContent,
  TxPoolContentFrom,
  TxPoolInspect,
  TxPoolStatus,
} from './txpool.js'
import type { AuditMeta, SessionProof } from './auditReceipt.js'
import type { GatewayConfig } from './gateway.js'
import type { TNSResolveResult, TNSReverseResult } from './tns.js'
import type {
  DelegateAuth,
  RecoveryState,
  SpendCaps,
  TerminalPolicy,
} from './policyWallet.js'
import type {
  AsyncFulfillment,
  RuntimeReceipt,
  SettlementCallback,
  SettlementEffect,
} from './settlement.js'
import type {
  AgentIdentityInfo,
  CapabilityInfo,
  DelegationInfo,
  DeployedCodeInfo,
  NamespaceGovernanceInfo,
  PackageInfo,
  PublisherInfo,
  SettlementPolicyInfo,
  VerificationClaimInfo,
  VerifierInfo,
} from './protocol.js'

export type BlockTag =
  | 'latest'
  | 'pending'
  | 'earliest'
  | 'safe'
  | 'finalized'
  | Hex

export type RpcTransactionRequest = {
  from?: Address | undefined
  to: Address
  gas?: Hex | undefined
  value?: Hex | undefined
  data?: Hex | undefined
}

export type RpcTransaction = {
  blockHash?: Hex | null | undefined
  blockNumber?: Hex | null | undefined
  from: Address
  gas?: Hex | undefined
  hash: Hex
  input?: Hex | undefined
  nonce?: Hex | undefined
  signerType?: string | undefined
  to: Address | null
  transactionIndex?: Hex | undefined
  type?: Hex | string | undefined
  value?: Hex | undefined
  [key: string]: unknown
}

export type RpcLog = {
  address: Address
  blockHash?: Hex | null | undefined
  blockNumber?: Hex | null | undefined
  data: Hex
  logIndex?: Hex | undefined
  removed?: boolean | undefined
  topics: readonly Hex[]
  transactionHash?: Hex | null | undefined
  transactionIndex?: Hex | undefined
  [key: string]: unknown
}

export type LogFilterTopics = readonly (
  | Hex
  | null
  | readonly (Hex | null)[]
)[]

export type LogFilter = {
  address?: Address | readonly Address[] | undefined
  topics?: LogFilterTopics | undefined
  blockHash?: Hex | undefined
  fromBlock?: BlockTag | number | bigint | undefined
  toBlock?: BlockTag | number | bigint | undefined
}

export type FeeHistory = {
  oldestBlock: bigint
  reward?: bigint[][] | undefined
  baseFeePerGas?: bigint[] | undefined
  gasUsedRatio: number[]
}

export type RpcSignerDescriptor = {
  type: string
  value: Hex
  defaulted: boolean
}

export type RpcSignerProfile = {
  address: Address
  signer: RpcSignerDescriptor
  blockNumber?: Hex | null | undefined
}

export type RpcTransactionReceipt = {
  blockHash: Hex
  blockNumber: Hex
  contractAddress?: Address | null | undefined
  cumulativeGasUsed: Hex
  effectiveGasPrice?: Hex | undefined
  from: Address
  gasUsed: Hex
  logs: readonly unknown[]
  logsBloom?: Hex | undefined
  status?: Hex | undefined
  to: Address | null
  transactionHash: Hex
  transactionIndex?: Hex | undefined
  type?: Hex | string | undefined
  [key: string]: unknown
}

export type RpcBlock = {
  hash?: Hex | null | undefined
  number?: Hex | null | undefined
  parentHash?: Hex | undefined
  timestamp?: Hex | undefined
  transactions: readonly unknown[]
  [key: string]: unknown
}

export type RpcHeader = Omit<RpcBlock, 'transactions'> & {
  transactions?: readonly unknown[] | undefined
}

export type CodeObject = {
  codeHash: Hex
  code: Hex
  createdAt: bigint
  expireAt: bigint
  expired: boolean
}

export type CodeObjectMeta = {
  codeHash: Hex
  createdAt: bigint
  expireAt: bigint
  expired: boolean
}

export type OverrideAccount = {
  nonce?: number | bigint | undefined
  code?: Hex | undefined
  balance?: number | bigint | undefined
  state?: Record<Hex, Hex> | undefined
  stateDiff?: Record<Hex, Hex> | undefined
}

export type NodeInfo = {
  id?: string | undefined
  name?: string | undefined
  enode?: string | undefined
  enr?: string | undefined
  ip?: string | undefined
  listenAddr?: string | undefined
  ports?: Record<string, unknown> | undefined
  protocols?: Record<string, unknown> | undefined
  [key: string]: unknown
}

export type GCStats = Record<string, unknown>

export type MemStats = Record<string, unknown>

export type HttpTransportConfig = {
  type: 'http'
  url?: string | undefined
  fetchFn?: typeof fetch | undefined
  headers?: HeadersInit | undefined
}

export type WebSocketLike = {
  readyState: number
  addEventListener(
    type: 'close' | 'error' | 'message' | 'open',
    listener: (event: any) => void,
  ): void
  removeEventListener(
    type: 'close' | 'error' | 'message' | 'open',
    listener: (event: any) => void,
  ): void
  send(data: string): void
  close(code?: number, reason?: string): void
}

export type WebSocketTransportConfig = {
  type: 'webSocket'
  url?: string | undefined
  webSocketFactory?: ((url: string) => WebSocketLike) | undefined
}

export type TransportConfig = HttpTransportConfig | WebSocketTransportConfig

export type RpcTransport = {
  key: string
  name: string
  url: string
  request<T>(method: string, params?: readonly unknown[]): Promise<T>
}

export type RpcSubscription = {
  id: string
  unsubscribe(): Promise<void>
}

export type SubscriptionTransport = RpcTransport & {
  subscribe<T>(parameters: {
    namespace?: string | undefined
    event: string
    params?: readonly unknown[] | undefined
    onData(data: T): void
    onError?(error: Error): void
  }): Promise<RpcSubscription>
}

export type PublicClientConfig = {
  chain?: Chain | undefined
  transport?: TransportConfig | undefined
}

export type WaitForTransactionReceiptParameters = {
  hash: Hex
  timeoutMs?: number | undefined
  pollIntervalMs?: number | undefined
}

export type SyncingStatus = {
  startingBlock: Hex
  currentBlock: Hex
  highestBlock: Hex
  pulledStates?: Hex | undefined
  knownStates?: Hex | undefined
  [key: string]: unknown
}

export type StorageProof = {
  key: Hex
  value: Hex
  proof: readonly Hex[]
}

export type AccountProof = {
  address: Address
  accountProof: readonly Hex[]
  balance: Hex
  codeHash: Hex
  nonce: Hex
  storageHash: Hex
  storageProof: readonly StorageProof[]
}

export type AccessListItem = {
  address: Address
  storageKeys: readonly Hex[]
}

export type AccessListResult = {
  accessList: readonly AccessListItem[]
  gasUsed: Hex
}

/** Chain identity and storage/retention profile. */
export type ChainProfile = {
  chainId: Hex
  networkId: Hex
  targetBlockIntervalMs: Hex
  retainBlocks: Hex
  snapshotInterval: Hex
}

/** Finalized block checkpoint info. */
export type FinalizedBlock = {
  number: Hex
  hash: Hex
  timestamp: Hex
  validatorSetHash: Hex
}

/** Block retention policy and current watermark. */
export type RetentionPolicy = {
  retainBlocks: Hex
  snapshotInterval: Hex
  headBlock: Hex
  oldestAvailableBlock: Hex
}

/** Prune watermark response. */
export type PruneWatermark = {
  headBlock: Hex
  oldestAvailableBlock: Hex
  retainBlocks: Hex
}

/** Full account state including nonce, balance, and signer. */
export type AccountState = {
  address: Address
  nonce: Hex
  balance: Hex
  signer: RpcSignerDescriptor
  blockNumber: Hex
}

/** Malicious vote evidence containing two conflicting checkpoint votes. */
export type MaliciousVoteEvidence = {
  version: string
  kind: string
  chainId: Hex
  number: Hex
  signer: Address
  signerType: string
  signerPubKey: string
  first: Record<string, unknown>
  second: Record<string, unknown>
}

/** A recorded malicious vote evidence entry. */
export type MaliciousVoteEvidenceRecord = {
  evidenceHash: Hex
  offenseKey: Hex
  number: Hex
  signer: Address
  submittedBy: Address
  submittedAt: Hex
  status: string
}

/** Parameters for submitting malicious vote evidence. */
export type SubmitMaliciousVoteEvidenceParameters = {
  from: Address
  nonce?: number | bigint | undefined
  gas?: number | bigint | undefined
  evidence: MaliciousVoteEvidence
}

/** Parameters for validator maintenance operations. */
export type ValidatorMaintenanceParameters = {
  from: Address
  nonce?: number | bigint | undefined
  gas?: number | bigint | undefined
}

/** Parameters for the setSigner RPC call. */
export type SetSignerRpcParameters = {
  from: Address
  nonce?: number | bigint | undefined
  gas?: number | bigint | undefined
  signerType: string
  signerValue: string
}

/** Opaque filter identifier returned by tos_newFilter / tos_newBlockFilter / tos_newPendingTransactionFilter. */
export type FilterId = Hex

export type NewFilterParams = {
  address?: Address | readonly Address[] | undefined
  topics?: LogFilterTopics | undefined
  fromBlock?: BlockTag | number | bigint | undefined
  toBlock?: BlockTag | number | bigint | undefined
}

export type PublicClient = {
  chain?: Chain | undefined
  transport: RpcTransport
  request<T>(method: string, params?: readonly unknown[]): Promise<T>
  getChainId(): Promise<bigint>
  getBlockNumber(): Promise<bigint>
  // Phase 0.3: returns encrypted commitment (32 bytes hex), not plaintext bigint
  getBalance(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<Hex>
  getEncryptedBalance(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<EncryptedBalanceInfo>
  getTransactionCount(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<bigint>
  getSponsorNonce(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<bigint>
  getSigner(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<RpcSignerProfile>
  getReceiveKey(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<Hex>
  privGetBalance(parameters: GetPrivBalanceParameters): Promise<PrivBalanceRecord>
  privGetNonce(parameters: GetPrivNonceParameters): Promise<bigint>
  // -- Selective Disclosure --
  privProveDisclosure(parameters: DisclosureProofParams): Promise<DisclosureProofResult>
  privVerifyDisclosure(parameters: VerifyDisclosureParams): Promise<boolean>
  privGenerateDecryptionToken(parameters: DecryptionTokenParams): Promise<DecryptionToken>
  privVerifyDecryptionToken(parameters: DecryptionToken): Promise<boolean>
  privDecryptWithToken(parameters: { token: Hex; commitment: Hex }): Promise<bigint>
  privDecryptWithAuditorKey(parameters: AuditorDecryptParams): Promise<AuditorDecryptResult>
  getLease(parameters: GetLeaseParameters): Promise<LeaseRecord | null>
  getTransactionReceipt(parameters: {
    hash: Hex
  }): Promise<RpcTransactionReceipt | null>
  getTransactionByHash(parameters: {
    hash: Hex
  }): Promise<RpcTransaction | null>
  getBlockByHash(parameters: {
    hash: Hex
    includeTransactions?: boolean | undefined
  }): Promise<RpcBlock | null>
  getHeaderByHash(parameters: {
    hash: Hex
  }): Promise<RpcHeader | null>
  getBlockByNumber(parameters?: {
    blockNumber?: BlockTag | number | bigint | undefined
    includeTransactions?: boolean | undefined
  }): Promise<RpcBlock | null>
  getHeaderByNumber(parameters?: {
    blockNumber?: BlockTag | number | bigint | undefined
  }): Promise<RpcHeader | null>
  getCode(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<Hex>
  getStorageAt(parameters: {
    address: Address
    slot: Hex
    blockTag?: BlockTag | undefined
  }): Promise<Hex>
  getLogs(parameters: LogFilter): Promise<readonly RpcLog[]>
  call(parameters: {
    request: RpcTransactionRequest
    blockTag?: BlockTag | undefined
  }): Promise<Hex>
  callAtHash(parameters: {
    request: RpcTransactionRequest
    blockHash: Hex
  }): Promise<Hex>
  pendingCall(parameters: {
    request: RpcTransactionRequest
  }): Promise<Hex>
  callWithOverrides(parameters: {
    request: RpcTransactionRequest
    blockTag?: BlockTag | number | bigint | undefined
    overrides?: Record<Address, OverrideAccount> | undefined
  }): Promise<Hex>
  callPackage(parameters: CallPackageParameters): Promise<Hex>
  buildLeaseDeployTx(
    parameters: LeaseDeployParameters,
  ): Promise<BuiltTransactionResult>
  buildLeaseRenewTx(
    parameters: LeaseRenewParameters,
  ): Promise<BuiltTransactionResult>
  buildLeaseCloseTx(
    parameters: LeaseCloseParameters,
  ): Promise<BuiltTransactionResult>
  estimateGas(parameters: {
    request: RpcTransactionRequest
    blockTag?: BlockTag | undefined
  }): Promise<bigint>
  maxPriorityFeePerGas(): Promise<bigint>
  feeHistory(parameters: {
    blockCount: number | bigint
    lastBlock?: BlockTag | number | bigint | undefined
    rewardPercentiles?: readonly number[] | undefined
  }): Promise<FeeHistory>
  watchBlocks(parameters: {
    onBlock(block: RpcBlock): void
    onError?(error: Error): void
  }): Promise<RpcSubscription>
  watchLogs(parameters: {
    filter?: LogFilter | undefined
    onLog(log: RpcLog): void
    onError?(error: Error): void
  }): Promise<RpcSubscription>
  waitForTransactionReceipt(
    parameters: WaitForTransactionReceiptParameters,
  ): Promise<RpcTransactionReceipt>
  gasPrice(): Promise<bigint>
  syncing(): Promise<false | SyncingStatus>
  getBlockTransactionCountByNumber(parameters: {
    blockNumber: BlockTag | number | bigint
  }): Promise<bigint>
  getBlockTransactionCountByHash(parameters: {
    hash: Hex
  }): Promise<bigint>
  getTransactionByBlockNumberAndIndex(parameters: {
    blockNumber: BlockTag | number | bigint
    index: number | bigint
  }): Promise<RpcTransaction | null>
  getTransactionByBlockHashAndIndex(parameters: {
    hash: Hex
    index: number | bigint
  }): Promise<RpcTransaction | null>
  pendingTransactions(): Promise<readonly RpcTransaction[]>
  getPendingTransactionCount(): Promise<bigint>
  getProof(parameters: {
    address: Address
    storageKeys: readonly Hex[]
    blockTag?: BlockTag | undefined
  }): Promise<AccountProof>
  createAccessList(parameters: {
    request: RpcTransactionRequest
    blockTag?: BlockTag | undefined
  }): Promise<AccessListResult>
  netVersion(): Promise<string>
  getNetworkId(): Promise<bigint>
  netPeerCount(): Promise<bigint>
  netListening(): Promise<boolean>
  clientVersion(): Promise<string>
  // DPoS / Validator queries
  getSnapshot(parameters?: GetSnapshotParams): Promise<Snapshot>
  getValidators(parameters?: GetValidatorsParams): Promise<readonly Address[]>
  getValidator(parameters: GetValidatorParams): Promise<ValidatorInfo>
  getEpochInfo(parameters?: GetEpochInfoParams): Promise<EpochInfo>
  // Agent Discovery (read-only)
  agentDiscoveryInfo(): Promise<AgentDiscoveryInfo>
  agentDiscoverySearch(parameters: AgentSearchParams): Promise<readonly AgentSearchResult[]>
  agentDiscoveryGetCard(parameters: { nodeRecord: string }): Promise<AgentCardResponse>
  agentDiscoveryDirectorySearch(parameters: AgentDirectorySearchParams): Promise<readonly AgentSearchResult[]>
  agentDiscoveryGetSuggestedCard(parameters: {
    address: Address
    blockTag?: BlockTag | number | bigint | undefined
  }): Promise<AgentPublishedCard | null>
  // Filter system
  newBlockFilter(): Promise<FilterId>
  newPendingTransactionFilter(): Promise<FilterId>
  newFilter(parameters: NewFilterParams): Promise<FilterId>
  getFilterChanges(parameters: {
    filterId: FilterId
  }): Promise<readonly RpcLog[] | readonly Hex[]>
  getFilterLogs(parameters: { filterId: FilterId }): Promise<readonly RpcLog[]>
  uninstallFilter(parameters: { filterId: FilterId }): Promise<boolean>
  // Chain state queries
  getChainProfile(): Promise<ChainProfile>
  getFinalizedBlock(): Promise<FinalizedBlock | null>
  getRetentionPolicy(): Promise<RetentionPolicy>
  getPruneWatermark(): Promise<PruneWatermark>
  getCodeObject(parameters: {
    codeHash: Hex
    blockTag?: BlockTag | number | bigint | undefined
  }): Promise<CodeObject | null>
  getCodeObjectMeta(parameters: {
    codeHash: Hex
    blockTag?: BlockTag | number | bigint | undefined
  }): Promise<CodeObjectMeta | null>
  getAccount(parameters: {
    address: Address
    blockTag?: BlockTag | undefined
  }): Promise<AccountState>
  // WebSocket subscriptions
  watchPendingTransactions(parameters: {
    onTransaction(hash: Hex): void
    onError?(error: Error): void
  }): Promise<RpcSubscription>
  watchSyncing(parameters: {
    onStatus(status: SyncingStatus | false): void
    onError?(error: Error): void
  }): Promise<RpcSubscription>
  // Malicious vote evidence (read-only)
  getMaliciousVoteEvidence(parameters: {
    hash: Hex
    blockTag?: BlockTag | undefined
  }): Promise<MaliciousVoteEvidenceRecord | null>
  listMaliciousVoteEvidence(parameters?: {
    count?: number | bigint | undefined
    blockTag?: BlockTag | undefined
  }): Promise<readonly MaliciousVoteEvidenceRecord[]>
  // TxPool
  txpoolContent(): Promise<TxPoolContent>
  txpoolContentFrom(parameters: { address: Address }): Promise<TxPoolContentFrom>
  txpoolStatus(): Promise<TxPoolStatus>
  txpoolInspect(): Promise<TxPoolInspect>

  // -- Policy Wallet --
  getPolicyWalletSpendCaps(parameters: {
    account: Address
  }): Promise<SpendCaps>
  getPolicyWalletTerminalPolicy(parameters: {
    account: Address
    terminalClass: number
  }): Promise<TerminalPolicy>
  getPolicyWalletDelegateAuth(parameters: {
    account: Address
    delegate: Address
  }): Promise<DelegateAuth>
  getPolicyWalletRecoveryState(parameters: {
    account: Address
  }): Promise<RecoveryState>
  isPolicyWalletSuspended(parameters: {
    account: Address
  }): Promise<boolean>
  getPolicyWalletOwner(parameters: {
    account: Address
  }): Promise<Address>
  getPolicyWalletGuardian(parameters: {
    account: Address
  }): Promise<Address>

  // -- Gateway --
  getGatewayConfig(parameters: {
    agent: Address
  }): Promise<GatewayConfig>
  isGatewayActive(parameters: {
    agent: Address
  }): Promise<boolean>

  // -- Audit Receipt --
  getAuditMeta(parameters: { txHash: Hex }): Promise<AuditMeta>
  getSessionProof(parameters: { txHash: Hex }): Promise<SessionProof>

  // -- Settlement --
  getSettlementCallback(parameters: {
    callbackId: string
  }): Promise<SettlementCallback>
  getAsyncFulfillment(parameters: {
    fulfillmentId: string
  }): Promise<AsyncFulfillment>
  getRuntimeReceipt(parameters: {
    receiptRef: Hex
  }): Promise<RuntimeReceipt>
  getSettlementEffect(parameters: {
    settlementRef: Hex
  }): Promise<SettlementEffect>

  // -- Tolang protocol metadata / registries --
  getContractMetadata(parameters: {
    address: Address
    blockTag?: BlockTag | number | bigint | undefined
  }): Promise<DeployedCodeInfo | null>
  getCapability(parameters: {
    name: string
  }): Promise<CapabilityInfo | null>
  getDelegation(parameters: {
    principal: Address
    delegate: Address
    scopeRef: Hex
  }): Promise<DelegationInfo | null>
  getPackage(parameters: {
    name: string
    version: string
  }): Promise<PackageInfo | null>
  getPackageByHash(parameters: {
    packageHash: Hex
  }): Promise<PackageInfo | null>
  getLatestPackage(parameters: {
    name: string
    channel: string
  }): Promise<PackageInfo | null>
  getPublisher(parameters: {
    publisherId: Hex
  }): Promise<PublisherInfo | null>
  getPublisherByNamespace(parameters: {
    namespace: string
  }): Promise<PublisherInfo | null>
  getNamespaceClaim(parameters: {
    namespace: string
  }): Promise<NamespaceGovernanceInfo | null>
  getVerifier(parameters: {
    name: string
  }): Promise<VerifierInfo | null>
  getVerification(parameters: {
    subject: Address
    proofType: string
  }): Promise<VerificationClaimInfo | null>
  getSettlementPolicy(parameters: {
    owner: Address
    asset: string
  }): Promise<SettlementPolicyInfo | null>
  getAgentIdentity(parameters: {
    agent: Address
  }): Promise<AgentIdentityInfo | null>

  // -- TNS (TOS Name Service) --
  tnsResolve(parameters: { name: string }): Promise<TNSResolveResult>
  tnsReverse(parameters: { address: Address }): Promise<TNSReverseResult>

  // -- Schema / Version --
  getBoundaryVersion(): Promise<string>
  getGatewayBoundaryVersion(): Promise<string>
  getAuditReceiptBoundaryVersion(): Promise<string>
  getSettlementBoundaryVersion(): Promise<string>
  getPolicyWalletSchemaVersion(): Promise<{ schema_version: string; namespace: string }>
  getGatewaySchemaVersion(): Promise<{ schema_version: string; namespace: string }>
  getAuditReceiptSchemaVersion(): Promise<{ schema_version: string; namespace: string }>
  getSettlementSchemaVersion(): Promise<{ schema_version: string; namespace: string }>
  getGcStats(): Promise<GCStats>
  getMemStats(): Promise<MemStats>
  getNodeInfo(): Promise<NodeInfo>
  setHead(parameters: {
    blockNumber: BlockTag | number | bigint
  }): Promise<void>
}

export type WalletClientConfig = PublicClientConfig & {
  account: LocalAccount
}

export type SignTransactionParameters = {
  account?: LocalAccount | undefined
  chainId?: number | bigint | undefined
  nonce?: number | bigint | undefined
  gas?: number | bigint | undefined
  to?: Address | null | undefined
  value?: number | bigint | undefined
  data?: Hex | undefined
  from?: Address | undefined
  signerType?: string | undefined
  sponsor?: Address | undefined
  sponsorSignerType?: string | undefined
  sponsorNonce?: number | bigint | undefined
  sponsorExpiry?: number | bigint | undefined
  sponsorPolicyHash?: Hex | undefined
  sponsorSignature?: Signature | undefined

  // Phase 0.3: encrypted transfer fields (optional, for commitment-based transfers)
  commitment?: Hex | undefined
  senderHandle?: Hex | undefined
  receiverHandle?: Hex | undefined
  sourceCommitment?: Hex | undefined
  ctValidityProof?: Hex | undefined
  commitmentEqProof?: Hex | undefined
  rangeProof?: Hex | undefined
  auditorHandle?: Hex | undefined
  encryptedMemo?: Hex | undefined

  // Account activation fields (for first transfer to a new account)
  recipientPubkey?: Hex | undefined
  recipientReceiveKey?: Hex | undefined
}

export type SendSystemActionParameters = {
  account?: LocalAccount | undefined
  action: string
  payload?: Record<string, unknown> | undefined
  gas?: number | bigint | undefined
  value?: number | bigint | undefined
}

export type SetSignerMetadataParameters = {
  account?: LocalAccount | undefined
  signerType: string
  signerValue: Hex
  gas?: number | bigint | undefined
}

export type WalletClient = PublicClient & {
  account: LocalAccount
  signAuthorization(parameters: SignTransactionParameters): Promise<Signature>
  assembleTransaction(
    parameters: SignTransactionParameters & {
      executionSignature: Signature
      sponsorSignature?: Signature | undefined
    },
  ): Promise<Hex>
  signTransaction(parameters: SignTransactionParameters): Promise<Hex>
  sendRawTransaction(parameters: { serializedTransaction: Hex }): Promise<Hex>
  sendTransaction(parameters: SignTransactionParameters): Promise<Hex>
  sendPackageTransaction(
    parameters: SendPackageTransactionParameters,
  ): Promise<Hex>
  deployPackage(parameters: DeployPackageParameters): Promise<Hex>
  leaseDeploy(parameters: WalletLeaseDeployParameters): Promise<LeaseDeployResult>
  leaseRenew(parameters: WalletLeaseRenewParameters): Promise<Hex>
  leaseClose(parameters: WalletLeaseCloseParameters): Promise<Hex>
  sendSystemAction(parameters: SendSystemActionParameters): Promise<Hex>
  setSignerMetadata(parameters: SetSignerMetadataParameters): Promise<Hex>
  agentDiscoveryPublish(parameters: AgentPublishParams): Promise<AgentDiscoveryInfo>
  agentDiscoveryPublishSuggested(parameters: {
    address: Address
    primaryIdentity: Address
    connectionModes?: readonly string[] | undefined
    cardSequence?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  }): Promise<AgentDiscoveryInfo>
  agentDiscoveryClear(): Promise<AgentDiscoveryInfo>
  // Validator maintenance
  enterMaintenance(parameters: ValidatorMaintenanceParameters): Promise<Hex>
  buildEnterMaintenanceTx(parameters: ValidatorMaintenanceParameters): Promise<BuiltTransactionResult>
  exitMaintenance(parameters: ValidatorMaintenanceParameters): Promise<Hex>
  buildExitMaintenanceTx(parameters: ValidatorMaintenanceParameters): Promise<BuiltTransactionResult>
  submitMaliciousVoteEvidence(parameters: SubmitMaliciousVoteEvidenceParameters): Promise<Hex>
  buildSubmitMaliciousVoteEvidenceTx(parameters: SubmitMaliciousVoteEvidenceParameters): Promise<BuiltTransactionResult>
  // Signer management
  setSigner(parameters: SetSignerRpcParameters): Promise<Hex>
  buildSetSignerTx(parameters: SetSignerRpcParameters): Promise<BuiltTransactionResult>
}

export type {
  CallPackageParameters,
  DeployPackageParameters,
  PackageArgument,
  SendPackageTransactionParameters,
}
