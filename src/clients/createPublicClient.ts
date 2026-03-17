import type { ErrorType } from '../errors/utils.js'
import {
  TransactionReceiptTimeoutError,
  type TransactionReceiptTimeoutErrorType,
} from '../errors/client.js'
import type {
  AgentCardResponse,
  AgentDirectorySearchParams,
  AgentDiscoveryInfo,
  AgentSearchParams,
  AgentSearchResult,
} from '../types/agent.js'
import type {
  AccessListResult,
  AccountProof,
  AccountState,
  BlockTag,
  CallPackageParameters,
  ChainProfile,
  FeeHistory,
  FilterId,
  FinalizedBlock,
  LogFilter,
  MaliciousVoteEvidenceRecord,
  NewFilterParams,
  PruneWatermark,
  PublicClient,
  PublicClientConfig,
  RetentionPolicy,
  RpcBlock,
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
  GetPrivBalanceParameters,
  GetPrivNonceParameters,
  PrivBalanceRecord,
  PrivShieldParameters,
  PrivTransferParameters,
  PrivUnshieldParameters,
} from '../types/privacy.js'
import type { AuditMeta, SessionProof } from '../types/auditReceipt.js'
import type { GatewayConfig } from '../types/gateway.js'
import type {
  DelegateAuth,
  RecoveryState,
  SpendCaps,
  TerminalPolicy,
} from '../types/policyWallet.js'
import type { AsyncFulfillment, SettlementCallback } from '../types/settlement.js'
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
      return parseRpcQuantity(
        await request<Hex>('tos_getBalance', [
          getAddress(address),
          normalizeBlockTag(blockTag),
        ]),
      )
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
      return parseRpcQuantity(
        await request<Hex>('tos_privGetNonce', [
          pubkey,
          normalizeBlockTag(blockTag),
        ]),
      )
    },
    async privTransfer(parameters: PrivTransferParameters) {
      return request<Hex>('tos_privTransfer', [
        serializePrivTransferParameters(parameters),
      ])
    },
    async privShield(parameters: PrivShieldParameters) {
      return request<Hex>('tos_privShield', [
        serializePrivShieldParameters(parameters),
      ])
    },
    async privUnshield(parameters: PrivUnshieldParameters) {
      return request<Hex>('tos_privUnshield', [
        serializePrivUnshieldParameters(parameters),
      ])
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
    async getBlockByNumber({
      blockNumber = 'latest',
      includeTransactions = false,
    } = {}) {
      return request<RpcBlock | null>('tos_getBlockByNumber', [
        normalizeBlockTag(blockNumber),
        includeTransactions,
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

    // -- Schema --
    async getBoundaryVersion() {
      return request<string>('policyWallet_getBoundaryVersion')
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
  depositWei?: Hex | null | undefined
  scheduledPruneEpoch: Hex
  scheduledPruneSeq: Hex
  status: string
  tombstoned: boolean
  tombstoneCodeHash: Hex
  tombstoneExpiredAt: Hex
  blockNumber: Hex
}

type RpcPrivBalanceResult = {
  pubkey: Hex
  commitment: Hex
  handle: Hex
  version: Hex
  privNonce: Hex
  blockNumber: Hex
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

function serializePrivTransferParameters(parameters: PrivTransferParameters) {
  return {
    from: parameters.from,
    to: parameters.to,
    privNonce: numberToHex(parameters.privNonce),
    fee: numberToHex(parameters.fee),
    feeLimit: numberToHex(parameters.feeLimit),
    commitment: parameters.commitment,
    senderHandle: parameters.senderHandle,
    receiverHandle: parameters.receiverHandle,
    sourceCommitment: parameters.sourceCommitment,
    ctValidityProof: parameters.ctValidityProof,
    commitmentEqProof: parameters.commitmentEqProof,
    rangeProof: parameters.rangeProof,
    ...(typeof parameters.encryptedMemo !== 'undefined'
      ? { encryptedMemo: parameters.encryptedMemo }
      : {}),
    ...(typeof parameters.memoSenderHandle !== 'undefined'
      ? { memoSenderHandle: parameters.memoSenderHandle }
      : {}),
    ...(typeof parameters.memoReceiverHandle !== 'undefined'
      ? { memoReceiverHandle: parameters.memoReceiverHandle }
      : {}),
    s: parameters.s,
    e: parameters.e,
  }
}

function serializePrivShieldParameters(parameters: PrivShieldParameters) {
  return {
    pubkey: parameters.pubkey,
    recipient: parameters.recipient,
    privNonce: numberToHex(parameters.privNonce),
    fee: numberToHex(parameters.fee),
    amount: numberToHex(parameters.amount),
    commitment: parameters.commitment,
    handle: parameters.handle,
    shieldProof: parameters.shieldProof,
    rangeProof: parameters.rangeProof,
    s: parameters.s,
    e: parameters.e,
  }
}

function serializePrivUnshieldParameters(parameters: PrivUnshieldParameters) {
  return {
    pubkey: parameters.pubkey,
    recipient: getAddress(parameters.recipient),
    privNonce: numberToHex(parameters.privNonce),
    fee: numberToHex(parameters.fee),
    amount: numberToHex(parameters.amount),
    sourceCommitment: parameters.sourceCommitment,
    commitmentEqProof: parameters.commitmentEqProof,
    rangeProof: parameters.rangeProof,
    s: parameters.s,
    e: parameters.e,
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
    depositWei: record.depositWei ? parseRpcQuantity(record.depositWei) : 0n,
    scheduledPruneEpoch: parseRpcQuantity(record.scheduledPruneEpoch),
    scheduledPruneSeq: parseRpcQuantity(record.scheduledPruneSeq),
    status: record.status,
    tombstoned: record.tombstoned,
    tombstoneCodeHash: record.tombstoneCodeHash,
    tombstoneExpiredAt: parseRpcQuantity(record.tombstoneExpiredAt),
    blockNumber: parseRpcQuantity(record.blockNumber),
  }
}

function parsePrivBalanceResult(result: RpcPrivBalanceResult): PrivBalanceRecord {
  return {
    pubkey: result.pubkey,
    commitment: result.commitment,
    handle: result.handle,
    version: parseRpcQuantity(result.version),
    privNonce: parseRpcQuantity(result.privNonce),
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
