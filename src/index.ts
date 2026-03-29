export type { LocalAccount, PrivateKeyAccount } from './accounts/types.js'
export {
  bls12381PrivateKeyToAccount,
  elgamalPrivateKeyToAccount,
  generatePrivateKey,
  privateKeyToAccount,
  secp256r1PrivateKeyToAccount,
  hdKeyToAccount,
  mnemonicToAccount,
  toAccount,
} from './accounts/index.js'
export type { Address } from './types/address.js'
export type { AuditMeta, SessionProof } from './types/auditReceipt.js'
export {
  BOUNDARY_SCHEMA_VERSION,
} from './types/boundary.js'
export type {
  AgentRole,
  ApprovalRecord,
  ApprovalScope,
  ApprovalStatus,
  ExecutionReceipt,
  IntentConstraints,
  IntentEnvelope,
  IntentStatus,
  PlanRecord,
  PlanStatus,
  ReceiptStatus,
  RouteStep,
  TerminalClass as BoundaryTerminalClass,
  TerminalClassName,
  TrustTier as BoundaryTrustTier,
} from './types/boundary.js'
export type { GatewayConfig } from './types/gateway.js'
export type { TNSResolveResult, TNSReverseResult } from './types/tns.js'
export type {
  DelegateAuth,
  PolicyWalletSchemaInfo,
  RecoveryState,
  SpendCaps,
  TerminalPolicy,
} from './types/policyWallet.js'
export type {
  AgentCardResponse,
  AgentConnectionMode,
  AgentDirectorySearchParams,
  AgentDiscoveryInfo,
  AgentProviderTrustSummary,
  AgentPublishParams,
  AgentPublishedCapability,
  AgentPublishedCard,
  AgentPublishedThreatModel,
  AgentRoutingProfile,
  AgentSearchParams,
  AgentSearchResult,
} from './types/agent.js'
export type {
  AgentBundleProfile,
  AgentContractProfile,
  AgentIdentityInfo,
  CapabilityInfo,
  DelegationInfo,
  DeployedCodeInfo,
  NamespaceGovernanceInfo,
  PackageInfo,
  PublisherInfo,
  SettlementPolicyInfo,
  TOLAgentPackageInfo,
  TOLArtifactInfo,
  TOLContractMetadata,
  TOLDiscoveryManifest,
  TOLPackageContractInfo,
  TOLPackageInfo,
  VerificationClaimInfo,
  VerifierInfo,
} from './types/protocol.js'
export type {
  AgentProviderSelectionDiagnostics,
  AgentProviderSelectionPreferences,
  DiscoveredAgentProvider,
  PreferredAgentProviderResolution,
  TrustedDiscoveredAgentProvider,
} from './surfaces/agentDiscovery.js'
export type {
  AgentRuntimeSurface,
  AgentSurfaceSelectionDiagnostics,
  AgentSurfaceSelectionPreferences,
  DiscoveredAgentSurface,
  SearchResultSurface,
  SettlementRuntimeSurface,
  TrustedSearchResultSurface,
} from './surfaces/agentRuntime.js'
export type {
  ArtifactAnchorRecord,
  ArtifactAnchorSummary,
  ArtifactBundleKind,
  ArtifactItemResponse,
  ArtifactProviderRecord,
  ArtifactRequesterEnvelope,
  ArtifactVerificationRecord,
  ArtifactVerificationReceipt,
  CaptureNewsRequest,
  CaptureOracleEvidenceRequest,
  ArtifactVerificationStatus,
} from './types/artifact.js'
export type {
  PaymasterAuthorizationResponse,
  PaymasterAuthorizeRequest,
  PaymasterProviderTrustTier,
  PaymasterQuoteRequest,
  PaymasterQuoteResponse,
  RequesterIdentityEnvelope,
  SignerExecutionResponse,
  SignerProviderTrustTier,
  SignerQuoteRequest,
  SignerQuoteResponse,
  SignerSubmitRequest,
} from './types/delegation.js'
export type { Chain } from './types/chain.js'
export type {
  EpochInfo,
  GetEpochInfoParams,
  GetSnapshotParams,
  GetValidatorParams,
  GetValidatorsParams,
  Snapshot,
  ValidatorInfo,
} from './types/dpos.js'
export type {
  CallPackageParameters,
  DeployPackageParameters,
  PackageArgument,
  SendPackageTransactionParameters,
} from './types/contract.js'
export type {
  BuiltTransactionRequest,
  BuiltTransactionResult,
  GetLeaseParameters,
  LeaseCloseParameters,
  LeaseDeployParameters,
  LeaseDeployResult,
  LeaseRecord,
  LeaseRenewParameters,
  LeaseStatus,
  WalletLeaseCloseParameters,
  WalletLeaseDeployParameters,
  WalletLeaseRenewParameters,
} from './types/lease.js'
export type { Hex, Signature } from './types/misc.js'
export type {
  MarketBindingKind,
  MarketBindingReceipt,
} from './types/market.js'
export type {
  StoredBundleResponse,
  StorageAuditResponse,
  StorageAnchorSummary,
  StorageIdentityEnvelope,
  StorageLeaseResponse,
  StoragePutRequest,
  StorageQuoteRequest,
  StorageQuoteResponse,
  StorageReceipt,
  StorageReceiptStatus,
  StorageRenewalResponse,
  StorageRenewRequest,
} from './types/storage.js'
export type {
  AsyncFulfillment,
  RuntimeReceipt,
  SettlementEffect,
  SettlementCallback,
  SettlementKind,
  SettlementReceipt,
} from './types/settlement.js'
export type {
  EncryptedBalanceInfo,
  GetPrivBalanceParameters,
  GetPrivNonceParameters,
  PrivBalanceRecord,
} from './types/privacy.js'
export type {
  AuditorDecryptParams,
  AuditorDecryptResult,
  DecryptionToken,
  DecryptionTokenParams,
  DisclosureProofParams,
  DisclosureProofResult,
  TokenDecryptResult,
  VerifyDisclosureParams,
} from './types/disclosure.js'
export type {
  TerminalClass,
  TransactionSignatureBundle,
  TransactionSerializable,
  TransactionSerializableNative,
  TransactionSerialized,
  TransactionType,
  TrustTier,
} from './types/transaction.js'
export {
  TerminalClassLabel,
  TrustTierLabel,
} from './types/transaction.js'
export type {
  AccessListItem,
  AccessListResult,
  AccountProof,
  AccountState,
  BlockTag,
  ChainProfile,
  FeeHistory,
  FilterId,
  FinalizedBlock,
  HttpTransportConfig,
  LogFilter,
  LogFilterTopics,
  MaliciousVoteEvidence,
  MaliciousVoteEvidenceRecord,
  NewFilterParams,
  PruneWatermark,
  PublicClient,
  PublicClientConfig,
  RetentionPolicy,
  RpcBlock,
  RpcLog,
  RpcSubscription,
  RpcTransport,
  RpcTransaction,
  RpcTransactionReceipt,
  RpcTransactionRequest,
  SendSystemActionParameters,
  SetSignerRpcParameters,
  SignTransactionParameters,
  StorageProof,
  SubmitMaliciousVoteEvidenceParameters,
  SyncingStatus,
  TransportConfig,
  ValidatorMaintenanceParameters,
  WaitForTransactionReceiptParameters,
  WebSocketLike,
  WebSocketTransportConfig,
  WalletClient,
  WalletClientConfig,
} from './types/client.js'
export type {
  TxPoolContent,
  TxPoolContentFrom,
  TxPoolInspect,
  TxPoolInspectSection,
  TxPoolSection,
  TxPoolStatus,
} from './types/txpool.js'

export {
  connectionModesFromMask,
  discoverCapabilityEntryFromCard,
  discoverAgentProviders,
  directoryDiscoverAgentProviders,
  resolveAgentProviderExecutionPolicy,
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
  type AgentProviderExecutionPolicy,
} from './surfaces/agentDiscovery.js'
export {
  createArtifactProviderClient,
  buildPaymasterAuthorizationRequest,
  createPaymasterProviderClient,
  createPublicClient,
  createSignerProviderClient,
  createStorageProviderClient,
  createWalletClient,
  encodeSystemActionData,
  systemActionAddress,
} from './clients/index.js'
export { tos, tosTestnet } from './chains/index.js'
export {
  http,
  createHttpTransport,
  webSocket,
  createTransport,
  createWebSocketTransport,
} from './transports/index.js'
export { toBytes, type ToBytesErrorType } from './utils/encoding/toBytes.js'
export {
  toHex,
  type BoolToHexErrorType,
  type BytesToHexErrorType,
  type NumberToHexErrorType,
  type StringToHexErrorType,
  type ToHexErrorType,
} from './utils/encoding/toHex.js'
export {
  keccak256,
  type Keccak256ErrorType,
} from './utils/hash/keccak256.js'
export {
  canonicalizeArtifactAnchorSummary,
  canonicalizeArtifactValue,
  canonicalizeArtifactVerificationReceipt,
  hashArtifactAnchorSummary,
  hashArtifactValue,
  hashArtifactVerificationReceipt,
} from './utils/artifact.js'
export {
  canonicalizeMarketBindingReceipt,
  canonicalizeMarketBindingValue,
  hashMarketBindingReceipt,
  hashMarketBindingValue,
} from './utils/market.js'
export {
  canonicalizeStorageAnchorSummary,
  canonicalizeStorageReceipt,
  canonicalizeStorageValue,
  hashStorageAnchorSummary,
  hashStorageReceipt,
  hashStorageValue,
} from './utils/storage.js'
export {
  canonicalizeSettlementReceipt,
  canonicalizeSettlementValue,
  hashSettlementReceipt,
  hashSettlementValue,
} from './utils/settlement.js'
export {
  recoverAddress,
  type RecoverAddressErrorType,
} from './utils/signature/recoverAddress.js'
export {
  blsSignatureDst,
  elgamalPublicKeyFromPrivateKey,
  normalizeSignerType,
  publicKeyToNativeAddress,
  signHash,
  signatureToRawBytes,
  verifyHashSignature,
} from './accounts/utils/nativeSigner.js'
export {
  verifyMessage,
  type VerifyMessageErrorType,
} from './utils/signature/verifyMessage.js'
export {
  parseUnits,
  type ParseUnitsErrorType,
} from './utils/unit/parseUnits.js'
export {
  formatTos,
  type FormatTosErrorType,
} from './utils/unit/formatEther.js'
export {
  formatGtomi,
  type FormatGtomiErrorType,
} from './utils/unit/formatGwei.js'
export {
  formatUnits,
  type FormatUnitsErrorType,
} from './utils/unit/formatUnits.js'
export {
  tosUnits,
  gtomiUnits,
  tomiUnits,
} from './constants/unit.js'
export {
  defineChain,
  extendSchema,
  type DefineChainReturnType,
} from './utils/chain/defineChain.js'
export { encodeAbiParameters } from './utils/abi/encodeAbiParameters.js'
export {
  encodePackageCallData,
} from './utils/contract/encodePackageCallData.js'
export {
  encodePackageDeployData,
} from './utils/contract/encodePackageDeployData.js'
export {
  hashTransaction,
  type HashTransactionErrorType,
} from './utils/transaction/hashTransaction.js'
export { serializeTransaction } from './utils/transaction/serializeTransaction.js'

// -- Reusable SDK Surfaces --
export {
  buildRequesterEnvelope,
  toDelegatedResult,
  toSponsoredResult,
  isSignerQuoteValid,
  isPaymasterQuoteValid,
  validateDelegatedRequest,
  type DelegatedExecutionRequest,
  type DelegatedExecutionResult,
  type SponsoredExecutionResult,
} from './surfaces/delegatedExecution.js'

export {
  buildEvidenceCaptureRequest,
  verifyEvidenceReceipt,
  verifyEvidenceAnchor,
  isOracleEvidenceKind,
  validateEvidenceParams,
  type EvidenceCaptureParams,
  type EvidenceVerificationResult,
  type EvidenceAnchorResult,
} from './surfaces/evidence.js'

export {
  registerProvider,
  aggregateFleetStatus,
  checkProviderHealth,
  filterByRole,
  validateRegistration,
  type ProviderRole,
  type ProviderRegistration,
  type ProviderHealthStatus,
  type FleetStatus,
} from './surfaces/operatorControl.js'

export {
  buildProofArtifactSearchParams,
  isCryptographicProofArtifactKind,
  isPublicProofArtifactKind,
  verifyProofArtifactAnchor,
  verifyProofArtifactReceipt,
  type ProofAnchorResult,
  type ProofArtifactSearchParams,
  type ProofVerificationResult,
  type PublicProofArtifactKind,
} from './surfaces/proofMarket.js'

export {
  inspectRuntimeReceipt,
  inspectSettlementEffect,
  type RuntimeSettlementSurface,
} from './surfaces/runtimeSettlement.js'

export {
  balanceAt,
  blockByHash,
  blockByNumber,
  callContract,
  callContractAtHash,
  callContractWithOverrides,
  codeAt,
  filterLogs,
  headerByHash,
  headerByNumber,
  networkId,
  nonceAt,
  peerCount,
  pendingBalanceAt,
  pendingCallContract,
  pendingCodeAt,
  pendingNonceAt,
  pendingStorageAt,
  pendingTransactionCount,
  storageAt,
  subscribeFilterLogs,
  subscribeNewHead,
  suggestGasTipCap,
  syncProgress,
  transactionByHash,
  transactionCount,
  transactionInBlock,
  transactionReceipt,
  transactionSender,
} from './surfaces/goClientParity.js'

export {
  getAgentRuntimeSurface,
  getDiscoveredAgentSurface,
  getRuntimeReceiptSurface,
  getSettlementEffectSurface,
  searchDiscoveredAgentSurfaces,
  directorySearchDiscoveredAgentSurfaces,
  rankTrustedAgentSurfaces,
  filterPreferredAgentSurfaces,
  searchTrustedAgentSurfaces,
  directorySearchTrustedAgentSurfaces,
  searchPreferredAgentSurfaces,
  directorySearchPreferredAgentSurfaces,
  selectPreferredAgentSurface,
  resolvePreferredAgentSurface,
  resolveDirectoryPreferredAgentSurface,
  diagnosePreferredAgentSurfaces,
  searchPreferredAgentSurfaceDiagnostics,
  directorySearchPreferredAgentSurfaceDiagnostics,
} from './surfaces/agentRuntime.js'

// -- Versioned Schema / Reference Exports --
export {
  SCHEMA_VERSION,
  createSchemaReference,
  type SchemaVersion,
  type SchemaReference,
} from './schema/version.js'

export {
  SignerQuoteRequestSchema,
  SignerQuoteResponseSchema,
  SignerSubmitRequestSchema,
  SignerExecutionResponseSchema,
  PaymasterQuoteRequestSchema,
  PaymasterQuoteResponseSchema,
  PaymasterAuthorizeRequestSchema,
  PaymasterAuthorizationResponseSchema,
  StorageQuoteRequestSchema,
  StorageQuoteResponseSchema,
  StoragePutRequestSchema,
  StorageLeaseResponseSchema,
  ALL_PROVIDER_SCHEMAS,
} from './schema/providerSchemas.js'

export {
  StorageReceiptSchema,
  StorageAnchorSummarySchema,
  ArtifactVerificationReceiptSchema,
  ArtifactAnchorSummarySchema,
  MarketBindingReceiptSchema,
  SettlementReceiptSchema,
  ALL_OPERATOR_SCHEMAS,
} from './schema/operatorSchemas.js'

export {
  validateAgainstSchema,
  detectDrift,
  validateBatch,
  detectBatchDrift,
  type ValidationResult,
  type DriftReport,
} from './schema/validate.js'
