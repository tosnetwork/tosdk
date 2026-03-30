import type { ErrorType } from '../errors/utils.js'
import {
  TransactionReceiptTimeoutError,
  type TransactionReceiptTimeoutErrorType,
} from '../errors/client.js'
import type {
  AgentCardResponse,
  AgentDirectorySearchParams,
  AgentDiscoveryInfo,
  AgentPublishedCard,
  AgentSearchParams,
  AgentSearchResult,
} from '../types/agent.js'
import type {
  AccessListResult,
  AccountProof,
  AccountState,
  BlockTag,
  CodeObject,
  CodeObjectMeta,
  CallPackageParameters,
  ChainProfile,
  GCStats,
  FeeHistory,
  FilterId,
  FinalizedBlock,
  LogFilter,
  MaliciousVoteEvidenceRecord,
  MemStats,
  NewFilterParams,
  NodeInfo,
  OverrideAccount,
  PruneWatermark,
  PublicClient,
  PublicClientConfig,
  RetentionPolicy,
  RpcBlock,
  RpcHeader,
  RpcTransactionRequest,
  RpcLog,
  RpcSubscription,
  RpcSignerProfile,
  RpcTransaction,
  RpcTransactionReceipt,
  SubscriptionTransport,
  SyncingStatus,
  WaitForTransactionReceiptParameters,
} from '../types/client.js'
import type {
  TxPoolContent,
  TxPoolContentFrom,
  TxPoolInspect,
  TxPoolStatus,
} from '../types/txpool.js'
import type {
  EpochInfo,
  GetEpochInfoParams,
  GetSnapshotParams,
  GetValidatorParams,
  GetValidatorsParams,
  Snapshot,
  ValidatorInfo,
} from '../types/dpos.js'
import type {
  BuiltTransactionResult,
  GetLeaseParameters,
  LeaseCloseParameters,
  LeaseDeployParameters,
  LeaseRecord,
  LeaseRenewParameters,
} from '../types/lease.js'
import type { Address } from '../types/address.js'
import type { Hex } from '../types/misc.js'
import type {
  EncryptedBalanceInfo,
  GetPrivBalanceParameters,
  GetPrivNonceParameters,
  PrivBalanceRecord,
} from '../types/privacy.js'
import type {
  AuditorDecryptParams,
  AuditorDecryptResult,
  DecryptionToken,
  DecryptionTokenParams,
  DisclosureProofParams,
  DisclosureProofResult,
  VerifyDisclosureParams,
} from '../types/disclosure.js'
import type { AuditMeta, SessionProof } from '../types/auditReceipt.js'
import type { GatewayConfig } from '../types/gateway.js'
import type { TNSResolveResult, TNSReverseResult } from '../types/tns.js'
import type {
  DelegateAuth,
  RecoveryState,
  SpendCaps,
  TerminalPolicy,
} from '../types/policyWallet.js'
import type {
  AsyncFulfillment,
  RuntimeReceipt,
  SettlementCallback,
  SettlementEffect,
} from '../types/settlement.js'
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
} from '../types/protocol.js'
import { type NumberToHexErrorType, numberToHex } from '../utils/encoding/toHex.js'
import { createTransport, http } from '../transports/index.js'
import { encodePackageCallData } from '../utils/contract/encodePackageCallData.js'
import { getAddress, type GetAddressErrorType } from '../utils/address/getAddress.js'
import {
  InvalidLogFilterError,
  type InvalidLogFilterErrorType,
  SubscriptionsUnsupportedError,
  type SubscriptionsUnsupportedErrorType,
} from '../errors/client.js'

export type CreatePublicClientErrorType =
  | GetAddressErrorType
  | InvalidLogFilterErrorType
  | NumberToHexErrorType
  | SubscriptionsUnsupportedErrorType
  | TransactionReceiptTimeoutErrorType
  | ErrorType

export function createPublicClient(
  config: PublicClientConfig = {},
): PublicClient {
  const transport = createTransport(config.transport ?? http(), config.chain)

  const request = <T>(method: string, params: readonly unknown[] = []) =>
    transport.request<T>(method, params)

  const subscribe = <T>({
    event,
    onData,
    onError,
    params = [],
  }: {
    event: string
    onData(data: T): void
    onError?(error: Error): void
    params?: readonly unknown[] | undefined
  }): Promise<RpcSubscription> => {
    if (!('subscribe' in transport) || typeof transport.subscribe !== 'function') {
      throw new SubscriptionsUnsupportedError()
    }
    return (transport as SubscriptionTransport).subscribe<T>({
      event,
      onData,
      params,
      ...(onError ? { onError } : {}),
    })
  }

  return {
    chain: config.chain,
    transport,
    request,
    async getChainId() {
      return parseRpcQuantity(await request<Hex>('tos_chainId'))
    },
    async getBlockNumber() {
      return parseRpcQuantity(await request<Hex>('tos_blockNumber'))
    },
    async getBalance({ address, blockTag = 'latest' }) {
      // Phase 0.3: returns encrypted commitment (32 bytes hex), not plaintext bigint
      const result = await request<Hex>('tos_getBalance', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
      return result as Hex  // "0x..." 64-char hex string (32 bytes)
    },
    async getEncryptedBalance({ address, blockTag = 'latest' }): Promise<EncryptedBalanceInfo> {
      // Uses privGetBalance which now returns account-level encrypted balance fields
      const result = await request<RpcEncryptedBalanceResult>(
        'tos_privGetBalance',
        [getAddress(address), normalizeBlockTag(blockTag)],
      )
      return {
        balance: result.balance,
        handle: result.handle,
        version: parseRpcQuantity(result.version),
        nonce: parseRpcQuantity(result.nonce),
      }
    },
    async getTransactionCount({ address, blockTag = 'pending' }) {
      return parseRpcQuantity(
        await request<Hex>('tos_getTransactionCount', [
          getAddress(address),
          normalizeBlockTag(blockTag),
        ]),
      )
    },
    async getSponsorNonce({ address, blockTag = 'latest' }) {
      return parseRpcQuantity(
        await request<Hex>('tos_getSponsorNonce', [
          getAddress(address),
          normalizeBlockTag(blockTag),
        ]),
      )
    },
    async getSigner({ address, blockTag = 'latest' }) {
      return request<RpcSignerProfile>('tos_getSigner', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
    },
    async getReceiveKey({ address, blockTag = 'latest' }) {
      const result = await request<Hex>('tos_getReceiveKey', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
      return result
    },
    async privGetBalance({
      pubkey,
      blockTag = 'latest',
    }: GetPrivBalanceParameters) {
      return parsePrivBalanceResult(
        await request<RpcPrivBalanceResult>('tos_privGetBalance', [
          pubkey,
          normalizeBlockTag(blockTag),
        ]),
      )
    },
    async privGetNonce({
      pubkey,
      blockTag = 'latest',
    }: GetPrivNonceParameters) {
      // Phase 0.3: nonce is unified — use tos_getTransactionCount instead
      // of the removed tos_privGetNonce RPC.
      return parseRpcQuantity(
        await request<Hex>('tos_getTransactionCount', [
          pubkey,
          normalizeBlockTag(blockTag),
        ]),
      )
    },
    // -- Selective Disclosure --
    async privProveDisclosure(parameters: DisclosureProofParams) {
      const rpc = await request<RpcDisclosureProofResult>(
        'tos_privProveDisclosure',
        [serializeDisclosureProofParams(parameters)],
      )
      return {
        proof: rpc.proof,
        blockNumber: parseRpcQuantity(rpc.blockNumber),
      } satisfies DisclosureProofResult
    },
    async privVerifyDisclosure(parameters: VerifyDisclosureParams) {
      return request<boolean>('tos_privVerifyDisclosure', [
        serializeVerifyDisclosureParams(parameters),
      ])
    },
    async privGenerateDecryptionToken(parameters: DecryptionTokenParams) {
      const rpc = await request<RpcDecryptionTokenResult>(
        'tos_privGenerateDecryptionToken',
        [serializeDecryptionTokenParams(parameters)],
      )
      return {
        pubkey: parameters.pubkey,
        commitment: parameters.commitment,
        handle: parameters.handle,
        token: rpc.token,
        dleqProof: rpc.dleqProof,
        blockNumber: parseRpcQuantity(rpc.blockNumber),
      } satisfies DecryptionToken
    },
    async privVerifyDecryptionToken(parameters: DecryptionToken) {
      return request<boolean>('tos_privVerifyDecryptionToken', [
        {
          pubkey: parameters.pubkey,
          commitment: parameters.commitment,
          handle: parameters.handle,
          token: parameters.token,
          dleqProof: parameters.dleqProof,
          blockNumber: numberToHex(parameters.blockNumber),
        },
      ])
    },
    async privDecryptWithToken({ token, commitment }: { token: Hex; commitment: Hex }) {
      return parseRpcQuantity(
        await request<Hex>('tos_privDecryptWithToken', [{ token, commitment }]),
      )
    },
    async privDecryptWithAuditorKey(parameters: AuditorDecryptParams) {
      const rpc = await request<{ amount: Hex; txType: string }>(
        'tos_privDecryptWithAuditorKey',
        [{ auditorPrivkey: parameters.auditorPrivkey, txHash: parameters.txHash }],
      )
      return {
        amount: parseRpcQuantity(rpc.amount),
        txType: rpc.txType,
      } satisfies AuditorDecryptResult
    },
    async getLease({ address, blockTag = 'latest' }: GetLeaseParameters) {
      const record = await request<RpcLeaseRecord | null>('tos_getLease', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
      return parseLeaseRecord(record)
    },
    async getTransactionReceipt({ hash }) {
      return request<RpcTransactionReceipt | null>('tos_getTransactionReceipt', [hash])
    },
    async getTransactionByHash({ hash }) {
      return request<RpcTransaction | null>('tos_getTransactionByHash', [hash])
    },
    async getBlockByHash({ hash, includeTransactions = false }) {
      return request<RpcBlock | null>('tos_getBlockByHash', [
        hash,
        includeTransactions,
      ])
    },
    async getHeaderByHash({ hash }) {
      return request<RpcHeader | null>('tos_getHeaderByHash', [hash])
    },
    async getBlockByNumber({
      blockNumber = 'latest',
      includeTransactions = false,
    } = {}) {
      return request<RpcBlock | null>('tos_getBlockByNumber', [
        normalizeBlockTag(blockNumber),
        includeTransactions,
      ])
    },
    async getHeaderByNumber({ blockNumber = 'latest' } = {}) {
      return request<RpcHeader | null>('tos_getHeaderByNumber', [
        normalizeBlockTag(blockNumber),
      ])
    },
    async getCode({ address, blockTag = 'latest' }) {
      return request<Hex>('tos_getCode', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
    },
    async getStorageAt({ address, slot, blockTag = 'latest' }) {
      return request<Hex>('tos_getStorageAt', [
        getAddress(address),
        slot,
        normalizeBlockTag(blockTag),
      ])
    },
    async getLogs(filter) {
      return request<readonly RpcLog[]>('tos_getLogs', [
        serializeLogFilter(filter),
      ])
    },
    async call({ request: callRequest, blockTag = 'latest' }) {
      return request<Hex>('tos_call', [
        serializeRpcTransactionRequest(callRequest),
        normalizeBlockTag(blockTag),
      ])
    },
    async callAtHash({ request: callRequest, blockHash }) {
      return request<Hex>('tos_call', [
        serializeRpcTransactionRequest(callRequest),
        { blockHash, requireCanonical: false },
      ])
    },
    async pendingCall({ request: callRequest }) {
      return request<Hex>('tos_call', [
        serializeRpcTransactionRequest(callRequest),
        'pending',
      ])
    },
    async callWithOverrides({
      request: callRequest,
      blockTag = 'latest',
      overrides,
    }) {
      const params: unknown[] = [
        serializeRpcTransactionRequest(callRequest),
        normalizeBlockTag(blockTag),
      ]
      if (typeof overrides !== 'undefined') {
        params.push(serializeOverrideMap(overrides))
      }
      return request<Hex>('tos_call', params)
    },
    async callPackage({
      address,
      packageName,
      functionSignature,
      args = [],
      blockTag = 'latest',
    }: CallPackageParameters) {
      return request<Hex>('tos_call', [
        serializeRpcTransactionRequest({
          to: getAddress(address),
          data: encodePackageCallData({
            packageName,
            functionSignature,
            args,
          }),
        }),
        normalizeBlockTag(blockTag),
      ])
    },
    async buildLeaseDeployTx(parameters: LeaseDeployParameters) {
      return parseBuiltTransactionResult(
        await request<RpcBuiltTransactionResult>('tos_buildLeaseDeployTx', [
          serializeLeaseDeployParameters(parameters),
        ]),
      )
    },
    async buildLeaseRenewTx(parameters: LeaseRenewParameters) {
      return parseBuiltTransactionResult(
        await request<RpcBuiltTransactionResult>('tos_buildLeaseRenewTx', [
          serializeLeaseRenewParameters(parameters),
        ]),
      )
    },
    async buildLeaseCloseTx(parameters: LeaseCloseParameters) {
      return parseBuiltTransactionResult(
        await request<RpcBuiltTransactionResult>('tos_buildLeaseCloseTx', [
          serializeLeaseCloseParameters(parameters),
        ]),
      )
    },
    async estimateGas({ request: estimateRequest, blockTag = 'latest' }) {
      return parseRpcQuantity(
        await request<Hex>('tos_estimateGas', [
          serializeRpcTransactionRequest(estimateRequest),
          normalizeBlockTag(blockTag),
        ]),
      )
    },
    async maxPriorityFeePerGas() {
      return parseRpcQuantity(await request<Hex>('tos_maxPriorityFeePerGas'))
    },
    async feeHistory({
      blockCount,
      lastBlock = 'latest',
      rewardPercentiles = [],
    }) {
      const response = await request<{
        oldestBlock: Hex
        reward?: Hex[][]
        baseFeePerGas?: Hex[]
        gasUsedRatio: number[]
      }>('tos_feeHistory', [
        numberToHex(blockCount),
        normalizeBlockTag(lastBlock),
        rewardPercentiles,
      ])
      return parseFeeHistory(response)
    },
    async watchBlocks({ onBlock, onError }) {
      return subscribe<RpcBlock>({
        event: 'newHeads',
        onData: onBlock,
        ...(onError ? { onError } : {}),
      })
    },
    async watchLogs({ filter, onLog, onError }) {
      return subscribe<RpcLog>({
        event: 'logs',
        params: filter ? [serializeLogFilter(filter)] : [],
        onData: onLog,
        ...(onError ? { onError } : {}),
      })
    },
    async waitForTransactionReceipt({
      hash,
      pollIntervalMs = 2_000,
      timeoutMs = 60_000,
    }: WaitForTransactionReceiptParameters) {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const receipt = await request<RpcTransactionReceipt | null>(
          'tos_getTransactionReceipt',
          [hash],
        )
        if (receipt) return receipt
        await delay(pollIntervalMs)
      }
      throw new TransactionReceiptTimeoutError({ hash, timeoutMs })
    },
    async gasPrice() {
      return parseRpcQuantity(await request<Hex>('tos_gasPrice'))
    },
    async syncing() {
      const result = await request<false | SyncingStatus>('tos_syncing')
      if (result === false) return false
      return result
    },
    async getBlockTransactionCountByNumber({ blockNumber }) {
      return parseRpcQuantity(
        await request<Hex>('tos_getBlockTransactionCountByNumber', [
          normalizeBlockTag(blockNumber),
        ]),
      )
    },
    async getBlockTransactionCountByHash({ hash }) {
      return parseRpcQuantity(
        await request<Hex>('tos_getBlockTransactionCountByHash', [hash]),
      )
    },
    async getTransactionByBlockNumberAndIndex({ blockNumber, index }) {
      return request<RpcTransaction | null>(
        'tos_getTransactionByBlockNumberAndIndex',
        [normalizeBlockTag(blockNumber), numberToHex(index)],
      )
    },
    async getTransactionByBlockHashAndIndex({ hash, index }) {
      return request<RpcTransaction | null>(
        'tos_getTransactionByBlockHashAndIndex',
        [hash, numberToHex(index)],
      )
    },
    async pendingTransactions() {
      return request<readonly RpcTransaction[]>('tos_pendingTransactions')
    },
    async getPendingTransactionCount() {
      return parseRpcQuantity(
        await request<Hex>('tos_getBlockTransactionCountByNumber', ['pending']),
      )
    },
    async getProof({ address, storageKeys, blockTag = 'latest' }) {
      return request<AccountProof>('tos_getProof', [
        getAddress(address),
        storageKeys,
        normalizeBlockTag(blockTag),
      ])
    },
    async createAccessList({ request: accessListRequest, blockTag = 'latest' }) {
      return request<AccessListResult>('tos_createAccessList', [
        serializeRpcTransactionRequest(accessListRequest),
        normalizeBlockTag(blockTag),
      ])
    },
    async netVersion() {
      return request<string>('net_version')
    },
    async getNetworkId() {
      return BigInt(await request<string>('net_version'))
    },
    async netPeerCount() {
      return parseRpcQuantity(await request<Hex>('net_peerCount'))
    },
    async netListening() {
      return request<boolean>('net_listening')
    },
    async clientVersion() {
      return request<string>('web3_clientVersion')
    },
    // -- DPoS / Validator queries --
    async getSnapshot({ blockTag = 'latest' }: GetSnapshotParams = {}) {
      return request<Snapshot>('dpos_getSnapshot', [
        normalizeBlockTag(blockTag),
      ])
    },
    async getValidators({ blockTag = 'latest' }: GetValidatorsParams = {}) {
      return request<readonly Address[]>('dpos_getValidators', [
        normalizeBlockTag(blockTag),
      ])
    },
    async getValidator({ address, blockTag = 'latest' }: GetValidatorParams) {
      return request<ValidatorInfo>('dpos_getValidator', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
    },
    async getEpochInfo({ blockTag = 'latest' }: GetEpochInfoParams = {}) {
      return request<EpochInfo>('dpos_getEpochInfo', [
        normalizeBlockTag(blockTag),
      ])
    },
    // -- Agent Discovery (read-only) --
    async agentDiscoveryInfo() {
      return request<AgentDiscoveryInfo>('tos_agentDiscoveryInfo')
    },
    async agentDiscoverySearch({ capability, limit }: AgentSearchParams) {
      const params: unknown[] = [capability]
      if (typeof limit !== 'undefined') {
        params.push(limit)
      }
      return request<readonly AgentSearchResult[]>(
        'tos_agentDiscoverySearch',
        params,
      )
    },
    async agentDiscoveryGetCard({ nodeRecord }: { nodeRecord: string }) {
      return request<AgentCardResponse>('tos_agentDiscoveryGetCard', [
        nodeRecord,
      ])
    },
    async agentDiscoveryDirectorySearch({
      nodeRecord,
      capability,
      limit,
    }: AgentDirectorySearchParams) {
      const params: unknown[] = [nodeRecord, capability]
      if (typeof limit !== 'undefined') {
        params.push(limit)
      }
      return request<readonly AgentSearchResult[]>(
        'tos_agentDiscoveryDirectorySearch',
        params,
      )
    },
    async agentDiscoveryGetSuggestedCard({
      address,
      blockTag,
    }: {
      address: Address
      blockTag?: BlockTag | number | bigint | undefined
    }) {
      return request<AgentPublishedCard | null>('tos_agentDiscoveryGetSuggestedCard', [
        {
          address: getAddress(address),
          ...(typeof blockTag !== 'undefined'
            ? { block: normalizeBlockTag(blockTag) }
            : {}),
        },
      ])
    },
    // -- Filter system --
    async newBlockFilter() {
      return request<FilterId>('tos_newBlockFilter')
    },
    async newPendingTransactionFilter() {
      return request<FilterId>('tos_newPendingTransactionFilter')
    },
    async newFilter(params: NewFilterParams) {
      return request<FilterId>('tos_newFilter', [
        serializeNewFilterParams(params),
      ])
    },
    async getFilterChanges({ filterId }) {
      return request<readonly RpcLog[] | readonly Hex[]>(
        'tos_getFilterChanges',
        [filterId],
      )
    },
    async getFilterLogs({ filterId }) {
      return request<readonly RpcLog[]>('tos_getFilterLogs', [filterId])
    },
    async uninstallFilter({ filterId }) {
      return request<boolean>('tos_uninstallFilter', [filterId])
    },
    // -- Chain state queries --
    async getChainProfile() {
      return request<ChainProfile>('tos_getChainProfile')
    },
    async getFinalizedBlock() {
      return request<FinalizedBlock | null>('tos_getFinalizedBlock')
    },
    async getRetentionPolicy() {
      return request<RetentionPolicy>('tos_getRetentionPolicy')
    },
    async getPruneWatermark() {
      return request<PruneWatermark>('tos_getPruneWatermark')
    },
    async getCodeObject({ codeHash, blockTag = 'latest' }) {
      const result = await request<RpcCodeObject | null>('tos_getCodeObject', [
        codeHash,
        normalizeBlockTag(blockTag),
      ])
      return parseCodeObject(result)
    },
    async getCodeObjectMeta({ codeHash, blockTag = 'latest' }) {
      const result = await request<RpcCodeObjectMeta | null>(
        'tos_getCodeObjectMeta',
        [codeHash, normalizeBlockTag(blockTag)],
      )
      return parseCodeObjectMeta(result)
    },
    async getAccount({ address, blockTag = 'latest' }) {
      return request<AccountState>('tos_getAccount', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
    },
    // -- WebSocket subscriptions --
    async watchPendingTransactions({ onTransaction, onError }) {
      return subscribe<Hex>({
        event: 'newPendingTransactions',
        onData: onTransaction,
        ...(onError ? { onError } : {}),
      })
    },
    async watchSyncing({ onStatus, onError }) {
      return subscribe<SyncingStatus | false>({
        event: 'syncing',
        onData: onStatus,
        ...(onError ? { onError } : {}),
      })
    },
    // -- Malicious vote evidence (read-only) --
    async getMaliciousVoteEvidence({ hash, blockTag = 'latest' }) {
      return request<MaliciousVoteEvidenceRecord | null>(
        'tos_getMaliciousVoteEvidence',
        [hash, normalizeBlockTag(blockTag)],
      )
    },
    async listMaliciousVoteEvidence({ count = 100, blockTag = 'latest' } = {}) {
      return request<readonly MaliciousVoteEvidenceRecord[]>(
        'tos_listMaliciousVoteEvidence',
        [numberToHex(count), normalizeBlockTag(blockTag)],
      )
    },
    // -- TxPool --
    async txpoolContent() {
      return request<TxPoolContent>('txpool_content')
    },
    async txpoolContentFrom({ address }) {
      return request<TxPoolContentFrom>('txpool_contentFrom', [
        getAddress(address),
      ])
    },
    async txpoolStatus() {
      return request<TxPoolStatus>('txpool_status')
    },
    async txpoolInspect() {
      return request<TxPoolInspect>('txpool_inspect')
    },

    // -- Policy Wallet --
    async getPolicyWalletSpendCaps({ account }) {
      return request<SpendCaps>('policyWallet_getSpendCaps', [
        getAddress(account),
      ])
    },
    async getPolicyWalletTerminalPolicy({ account, terminalClass }) {
      return request<TerminalPolicy>('policyWallet_getTerminalPolicy', [
        getAddress(account),
        numberToHex(terminalClass),
      ])
    },
    async getPolicyWalletDelegateAuth({ account, delegate }) {
      return request<DelegateAuth>('policyWallet_getDelegateAuth', [
        getAddress(account),
        getAddress(delegate),
      ])
    },
    async getPolicyWalletRecoveryState({ account }) {
      return request<RecoveryState>('policyWallet_getRecoveryState', [
        getAddress(account),
      ])
    },
    async isPolicyWalletSuspended({ account }) {
      return request<boolean>('policyWallet_isSuspended', [
        getAddress(account),
      ])
    },
    async getPolicyWalletOwner({ account }) {
      return request<Address>('policyWallet_getOwner', [
        getAddress(account),
      ])
    },
    async getPolicyWalletGuardian({ account }) {
      return request<Address>('policyWallet_getGuardian', [
        getAddress(account),
      ])
    },

    // -- Gateway --
    async getGatewayConfig({ agent }) {
      return request<GatewayConfig>('gateway_getGatewayConfig', [
        getAddress(agent),
      ])
    },
    async isGatewayActive({ agent }) {
      return request<boolean>('gateway_isGatewayActive', [
        getAddress(agent),
      ])
    },

    // -- Audit Receipt --
    async getAuditMeta({ txHash }) {
      return request<AuditMeta>('auditReceipt_getAuditMeta', [txHash])
    },
    async getSessionProof({ txHash }) {
      return request<SessionProof>('auditReceipt_getSessionProof', [txHash])
    },

    // -- Settlement --
    async getSettlementCallback({ callbackId }) {
      return request<SettlementCallback>('settlement_getCallback', [
        callbackId,
      ])
    },
    async getAsyncFulfillment({ fulfillmentId }) {
      return request<AsyncFulfillment>('settlement_getFulfillment', [
        fulfillmentId,
      ])
    },
    async getRuntimeReceipt({ receiptRef }) {
      return request<RuntimeReceipt>('settlement_getRuntimeReceipt', [
        receiptRef,
      ])
    },
    async getSettlementEffect({ settlementRef }) {
      return request<SettlementEffect>('settlement_getSettlementEffect', [
        settlementRef,
      ])
    },

    // -- Tolang protocol metadata / registries --
    async getContractMetadata({ address, blockTag = 'latest' }) {
      return request<DeployedCodeInfo | null>('tos_getContractMetadata', [
        getAddress(address),
        normalizeBlockTag(blockTag),
      ])
    },
    async getCapability({ name }) {
      return request<CapabilityInfo | null>('tos_tolGetCapability', [name])
    },
    async getDelegation({ principal, delegate, scopeRef }) {
      return request<DelegationInfo | null>('tos_tolGetDelegation', [
        getAddress(principal),
        getAddress(delegate),
        scopeRef,
      ])
    },
    async getPackage({ name, version }) {
      return request<PackageInfo | null>('tos_tolGetPackage', [name, version])
    },
    async getPackageByHash({ packageHash }) {
      return request<PackageInfo | null>('tos_tolGetPackageByHash', [
        packageHash,
      ])
    },
    async getLatestPackage({ name, channel }) {
      return request<PackageInfo | null>('tos_tolGetLatestPackage', [
        name,
        channel,
      ])
    },
    async getPublisher({ publisherId }) {
      return request<PublisherInfo | null>('tos_tolGetPublisher', [
        publisherId,
      ])
    },
    async getPublisherByNamespace({ namespace }) {
      return request<PublisherInfo | null>('tos_tolGetPublisherByNamespace', [
        namespace,
      ])
    },
    async getNamespaceClaim({ namespace }) {
      return request<NamespaceGovernanceInfo | null>('tos_tolGetNamespaceClaim', [
        namespace,
      ])
    },
    async getVerifier({ name }) {
      return request<VerifierInfo | null>('tos_tolGetVerifier', [name])
    },
    async getVerification({ subject, proofType }) {
      return request<VerificationClaimInfo | null>('tos_tolGetVerification', [
        getAddress(subject),
        proofType,
      ])
    },
    async getSettlementPolicy({ owner, asset }) {
      return request<SettlementPolicyInfo | null>('tos_tolGetSettlementPolicy', [
        getAddress(owner),
        asset,
      ])
    },
    async getAgentIdentity({ agent }) {
      return request<AgentIdentityInfo | null>('tos_tolGetAgentIdentity', [
        getAddress(agent),
      ])
    },

    // -- TNS (TOS Name Service) --
    async tnsResolve({ name }) {
      return request<TNSResolveResult>('tns_resolve', [name])
    },
    async tnsReverse({ address }) {
      return request<TNSReverseResult>('tns_reverse', [
        getAddress(address),
      ])
    },

    // -- Schema / Version --
    async getBoundaryVersion() {
      return request<string>('policyWallet_getBoundaryVersion')
    },
    async getGatewayBoundaryVersion() {
      return request<string>('gateway_getBoundaryVersion')
    },
    async getAuditReceiptBoundaryVersion() {
      return request<string>('auditReceipt_getBoundaryVersion')
    },
    async getSettlementBoundaryVersion() {
      return request<string>('settlement_getBoundaryVersion')
    },
    async getPolicyWalletSchemaVersion() {
      return request<{ schema_version: string; namespace: string }>('policyWallet_getSchemaVersion')
    },
    async getGatewaySchemaVersion() {
      return request<{ schema_version: string; namespace: string }>('gateway_getSchemaVersion')
    },
    async getAuditReceiptSchemaVersion() {
      return request<{ schema_version: string; namespace: string }>('auditReceipt_getSchemaVersion')
    },
    async getSettlementSchemaVersion() {
      return request<{ schema_version: string; namespace: string }>('settlement_getSchemaVersion')
    },
    async getGcStats() {
      return request<GCStats>('debug_gcStats')
    },
    async getMemStats() {
      return request<MemStats>('debug_memStats')
    },
    async getNodeInfo() {
      return request<NodeInfo>('admin_nodeInfo')
    },
    async setHead({ blockNumber }) {
      await request<null>('debug_setHead', [normalizeBlockTag(blockNumber)])
    },
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeBlockTag(
  blockTag: BlockTag | number | bigint,
): BlockTag {
  if (typeof blockTag === 'number' || typeof blockTag === 'bigint')
    return numberToHex(blockTag)
  return blockTag
}

function parseRpcQuantity(value: Hex): bigint {
  return BigInt(value)
}

type RpcLeaseRecord = {
  address: Hex
  leaseOwner: Hex
  createdAtBlock: Hex
  expireAtBlock: Hex
  graceUntilBlock: Hex
  codeBytes: Hex
  depositTomi?: Hex | null | undefined
  scheduledPruneEpoch: Hex
  scheduledPruneSeq: Hex
  status: string
  tombstoned: boolean
  tombstoneCodeHash: Hex
  tombstoneExpiredAt: Hex
  blockNumber: Hex
}

type RpcCodeObject = {
  codeHash: Hex
  code: Hex
  createdAt: Hex
  expireAt: Hex
  expired: boolean
}

type RpcCodeObjectMeta = {
  codeHash: Hex
  createdAt: Hex
  expireAt: Hex
  expired: boolean
}

type RpcPrivBalanceResult = {
  pubkey: Hex
  commitment: Hex
  handle: Hex
  version: Hex
  nonce: Hex
  blockNumber: Hex
}

type RpcEncryptedBalanceResult = {
  balance: Hex
  handle: Hex
  version: Hex
  nonce: Hex
}

type RpcBuiltTransactionResult = {
  tx: {
    from: Hex
    to: Hex
    nonce: Hex
    gas: Hex
    value: Hex
    input: Hex
  }
  raw: Hex
  contractAddress?: Hex | undefined
}

function serializeRpcTransactionRequest(
  request: RpcTransactionRequest,
): RpcTransactionRequest {
  return {
    ...request,
    ...(request.from ? { from: getAddress(request.from) } : {}),
    to: getAddress(request.to),
  }
}

function serializeOverrideMap(
  overrides: Record<Address, OverrideAccount>,
) {
  const out: Record<string, Record<string, unknown>> = {}
  for (const [address, override] of Object.entries(overrides)) {
    out[getAddress(address as Address)] = {
      ...(typeof override.nonce !== 'undefined'
        ? { nonce: numberToHex(override.nonce) }
        : {}),
      ...(typeof override.code !== 'undefined' ? { code: override.code } : {}),
      ...(typeof override.balance !== 'undefined'
        ? { balance: numberToHex(override.balance) }
        : {}),
      ...(override.state ? { state: override.state } : {}),
      ...(override.stateDiff ? { stateDiff: override.stateDiff } : {}),
    }
  }
  return out
}

function serializeLeaseDeployParameters(parameters: LeaseDeployParameters) {
  return {
    from: getAddress(parameters.from),
    ...(typeof parameters.nonce !== 'undefined'
      ? { nonce: numberToHex(parameters.nonce) }
      : {}),
    ...(typeof parameters.gas !== 'undefined'
      ? { gas: numberToHex(parameters.gas) }
      : {}),
    code: parameters.code,
    leaseBlocks: numberToHex(parameters.leaseBlocks),
    ...(typeof parameters.leaseOwner !== 'undefined'
      ? { leaseOwner: getAddress(parameters.leaseOwner) }
      : {}),
    ...(typeof parameters.value !== 'undefined'
      ? { value: numberToHex(parameters.value) }
      : {}),
  }
}

function serializeLeaseRenewParameters(parameters: LeaseRenewParameters) {
  return {
    from: getAddress(parameters.from),
    ...(typeof parameters.nonce !== 'undefined'
      ? { nonce: numberToHex(parameters.nonce) }
      : {}),
    ...(typeof parameters.gas !== 'undefined'
      ? { gas: numberToHex(parameters.gas) }
      : {}),
    contractAddr: getAddress(parameters.contractAddress),
    deltaBlocks: numberToHex(parameters.deltaBlocks),
  }
}

function serializeLeaseCloseParameters(parameters: LeaseCloseParameters) {
  return {
    from: getAddress(parameters.from),
    ...(typeof parameters.nonce !== 'undefined'
      ? { nonce: numberToHex(parameters.nonce) }
      : {}),
    ...(typeof parameters.gas !== 'undefined'
      ? { gas: numberToHex(parameters.gas) }
      : {}),
    contractAddr: getAddress(parameters.contractAddress),
  }
}

function serializeNewFilterParams(params: NewFilterParams) {
  const address = params.address

  return {
    ...(address
      ? {
          address: Array.isArray(address)
            ? address.map((item) => getAddress(item))
            : getAddress(address as Hex),
        }
      : {}),
    ...(params.topics ? { topics: params.topics } : {}),
    fromBlock: normalizeBlockTag(params.fromBlock ?? 'latest'),
    toBlock: normalizeBlockTag(params.toBlock ?? 'latest'),
  }
}

function serializeLogFilter(filter: LogFilter) {
  if (filter.blockHash && (filter.fromBlock || filter.toBlock)) {
    throw new InvalidLogFilterError()
  }

  const address = filter.address

  return {
    ...(address
      ? {
          address: Array.isArray(address)
            ? address.map((item) => getAddress(item))
            : getAddress(address as Hex),
        }
      : {}),
    ...(filter.topics ? { topics: filter.topics } : {}),
    ...(filter.blockHash
      ? { blockHash: filter.blockHash }
      : {
          fromBlock: normalizeBlockTag(filter.fromBlock ?? 0n),
          toBlock: normalizeBlockTag(filter.toBlock ?? 'latest'),
        }),
  }
}

function parseLeaseRecord(record: RpcLeaseRecord | null): LeaseRecord | null {
  if (!record) return null
  return {
    address: getAddress(record.address),
    leaseOwner: getAddress(record.leaseOwner),
    createdAtBlock: parseRpcQuantity(record.createdAtBlock),
    expireAtBlock: parseRpcQuantity(record.expireAtBlock),
    graceUntilBlock: parseRpcQuantity(record.graceUntilBlock),
    codeBytes: parseRpcQuantity(record.codeBytes),
    depositTomi: record.depositTomi ? parseRpcQuantity(record.depositTomi) : 0n,
    scheduledPruneEpoch: parseRpcQuantity(record.scheduledPruneEpoch),
    scheduledPruneSeq: parseRpcQuantity(record.scheduledPruneSeq),
    status: record.status,
    tombstoned: record.tombstoned,
    tombstoneCodeHash: record.tombstoneCodeHash,
    tombstoneExpiredAt: parseRpcQuantity(record.tombstoneExpiredAt),
    blockNumber: parseRpcQuantity(record.blockNumber),
  }
}

function parseCodeObject(record: RpcCodeObject | null): CodeObject | null {
  if (!record) return null
  return {
    codeHash: record.codeHash,
    code: record.code,
    createdAt: parseRpcQuantity(record.createdAt),
    expireAt: parseRpcQuantity(record.expireAt),
    expired: record.expired,
  }
}

function parseCodeObjectMeta(
  record: RpcCodeObjectMeta | null,
): CodeObjectMeta | null {
  if (!record) return null
  return {
    codeHash: record.codeHash,
    createdAt: parseRpcQuantity(record.createdAt),
    expireAt: parseRpcQuantity(record.expireAt),
    expired: record.expired,
  }
}

function parsePrivBalanceResult(result: RpcPrivBalanceResult): PrivBalanceRecord {
  return {
    pubkey: result.pubkey,
    commitment: result.commitment,
    handle: result.handle,
    version: parseRpcQuantity(result.version),
    nonce: parseRpcQuantity(result.nonce),
    blockNumber: parseRpcQuantity(result.blockNumber),
  }
}

function parseBuiltTransactionResult(
  result: RpcBuiltTransactionResult,
): BuiltTransactionResult {
  return {
    tx: {
      from: getAddress(result.tx.from),
      to: getAddress(result.tx.to),
      nonce: parseRpcQuantity(result.tx.nonce),
      gas: parseRpcQuantity(result.tx.gas),
      value: parseRpcQuantity(result.tx.value),
      input: result.tx.input,
    },
    raw: result.raw,
    ...(result.contractAddress
      ? { contractAddress: getAddress(result.contractAddress) }
      : {}),
  }
}

// -- Selective Disclosure RPC types and serializers --

type RpcDisclosureProofResult = {
  proof: Hex
  blockNumber: Hex
}

type RpcDecryptionTokenResult = {
  token: Hex
  dleqProof: Hex
  blockNumber: Hex
}

function serializeDisclosureProofParams(params: DisclosureProofParams) {
  return {
    privkey: params.privkey,
    pubkey: params.pubkey,
    commitment: params.commitment,
    handle: params.handle,
    amount: numberToHex(params.amount),
    blockNumber: numberToHex(params.blockNumber),
  }
}

function serializeVerifyDisclosureParams(params: VerifyDisclosureParams) {
  return {
    pubkey: params.pubkey,
    commitment: params.commitment,
    handle: params.handle,
    amount: numberToHex(params.amount),
    proof: params.proof,
    blockNumber: numberToHex(params.blockNumber),
  }
}

function serializeDecryptionTokenParams(params: DecryptionTokenParams) {
  return {
    privkey: params.privkey,
    pubkey: params.pubkey,
    commitment: params.commitment,
    handle: params.handle,
    blockNumber: numberToHex(params.blockNumber),
  }
}

function parseFeeHistory(response: {
  oldestBlock: Hex
  reward?: Hex[][]
  baseFeePerGas?: Hex[]
  gasUsedRatio: number[]
}): FeeHistory {
  return {
    oldestBlock: parseRpcQuantity(response.oldestBlock),
    ...(response.reward
      ? {
          reward: response.reward.map((rewardRow) =>
            rewardRow.map((value) => parseRpcQuantity(value)),
          ),
        }
      : {}),
    ...(response.baseFeePerGas
      ? {
          baseFeePerGas: response.baseFeePerGas.map((value) =>
            parseRpcQuantity(value),
          ),
        }
      : {}),
    gasUsedRatio: response.gasUsedRatio,
  }
}
