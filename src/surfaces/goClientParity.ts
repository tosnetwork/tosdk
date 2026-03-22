import type {
  BlockTag,
  LogFilter,
  OverrideAccount,
  PublicClient,
  RpcBlock,
  RpcHeader,
  RpcLog,
  RpcSubscription,
  RpcTransaction,
  RpcTransactionReceipt,
  RpcTransactionRequest,
  SyncingStatus,
} from '../types/client.js'
import type { Address } from '../types/address.js'
import type { Hex } from '../types/misc.js'

export async function blockByHash(
  client: PublicClient,
  parameters: { hash: Hex; includeTransactions?: boolean | undefined },
): Promise<RpcBlock | null> {
  return client.getBlockByHash(parameters)
}

export async function blockByNumber(
  client: PublicClient,
  parameters: {
    blockNumber?: BlockTag | number | bigint | undefined
    includeTransactions?: boolean | undefined
  } = {},
): Promise<RpcBlock | null> {
  return client.getBlockByNumber(parameters)
}

export async function headerByHash(
  client: PublicClient,
  parameters: { hash: Hex },
): Promise<RpcHeader | null> {
  return client.getHeaderByHash(parameters)
}

export async function headerByNumber(
  client: PublicClient,
  parameters: { blockNumber?: BlockTag | number | bigint | undefined } = {},
): Promise<RpcHeader | null> {
  return client.getHeaderByNumber(parameters)
}

export async function transactionByHash(
  client: PublicClient,
  parameters: { hash: Hex },
): Promise<RpcTransaction | null> {
  return client.getTransactionByHash(parameters)
}

export async function transactionReceipt(
  client: PublicClient,
  parameters: { hash: Hex },
): Promise<RpcTransactionReceipt | null> {
  return client.getTransactionReceipt(parameters)
}

export async function transactionCount(
  client: PublicClient,
  parameters: { blockHash: Hex },
): Promise<bigint> {
  return client.getBlockTransactionCountByHash({ hash: parameters.blockHash })
}

export async function transactionInBlock(
  client: PublicClient,
  parameters: { blockHash: Hex; index: number | bigint },
): Promise<RpcTransaction | null> {
  return client.getTransactionByBlockHashAndIndex({
    hash: parameters.blockHash,
    index: parameters.index,
  })
}

export async function transactionSender(
  client: PublicClient,
  parameters: {
    blockHash: Hex
    index: number | bigint
    expectedHash?: Hex | undefined
  },
): Promise<Address | null> {
  const tx = await transactionInBlock(client, parameters)
  if (!tx) return null
  if (
    parameters.expectedHash &&
    tx.hash.toLowerCase() !== parameters.expectedHash.toLowerCase()
  ) {
    throw new Error('wrong inclusion block/index')
  }
  return tx.from
}

export async function syncProgress(
  client: PublicClient,
): Promise<SyncingStatus | null> {
  const result = await client.syncing()
  return result === false ? null : result
}

export function subscribeNewHead(
  client: PublicClient,
  parameters: {
    onHeader(header: RpcHeader): void
    onError?(error: Error): void
  },
): Promise<RpcSubscription> {
  return client.watchBlocks({
    onBlock(block) {
      parameters.onHeader(block as RpcHeader)
    },
    ...(parameters.onError ? { onError: parameters.onError } : {}),
  })
}

export function filterLogs(
  client: PublicClient,
  parameters: LogFilter,
): Promise<readonly RpcLog[]> {
  return client.getLogs(parameters)
}

export function subscribeFilterLogs(
  client: PublicClient,
  parameters: {
    filter?: LogFilter | undefined
    onLog(log: RpcLog): void
    onError?(error: Error): void
  },
): Promise<RpcSubscription> {
  return client.watchLogs(parameters)
}

export async function networkId(client: PublicClient): Promise<bigint> {
  return client.getNetworkId()
}

export async function peerCount(client: PublicClient): Promise<bigint> {
  return client.netPeerCount()
}

export async function balanceAt(
  client: PublicClient,
  parameters: { account: Address; blockTag?: BlockTag | undefined },
): Promise<bigint> {
  return client.getBalance({
    address: parameters.account,
    ...(typeof parameters.blockTag !== 'undefined'
      ? { blockTag: parameters.blockTag }
      : {}),
  })
}

export async function storageAt(
  client: PublicClient,
  parameters: { account: Address; key: Hex; blockTag?: BlockTag | undefined },
): Promise<Hex> {
  return client.getStorageAt({
    address: parameters.account,
    slot: parameters.key,
    ...(typeof parameters.blockTag !== 'undefined'
      ? { blockTag: parameters.blockTag }
      : {}),
  })
}

export async function codeAt(
  client: PublicClient,
  parameters: { account: Address; blockTag?: BlockTag | undefined },
): Promise<Hex> {
  return client.getCode({
    address: parameters.account,
    ...(typeof parameters.blockTag !== 'undefined'
      ? { blockTag: parameters.blockTag }
      : {}),
  })
}

export async function nonceAt(
  client: PublicClient,
  parameters: { account: Address; blockTag?: BlockTag | undefined },
): Promise<bigint> {
  return client.getTransactionCount({
    address: parameters.account,
    ...(typeof parameters.blockTag !== 'undefined'
      ? { blockTag: parameters.blockTag }
      : {}),
  })
}

export async function pendingBalanceAt(
  client: PublicClient,
  parameters: { account: Address },
): Promise<bigint> {
  return client.getBalance({ address: parameters.account, blockTag: 'pending' })
}

export async function pendingStorageAt(
  client: PublicClient,
  parameters: { account: Address; key: Hex },
): Promise<Hex> {
  return client.getStorageAt({
    address: parameters.account,
    slot: parameters.key,
    blockTag: 'pending',
  })
}

export async function pendingCodeAt(
  client: PublicClient,
  parameters: { account: Address },
): Promise<Hex> {
  return client.getCode({ address: parameters.account, blockTag: 'pending' })
}

export async function pendingNonceAt(
  client: PublicClient,
  parameters: { account: Address },
): Promise<bigint> {
  return client.getTransactionCount({
    address: parameters.account,
    blockTag: 'pending',
  })
}

export async function pendingTransactionCount(
  client: PublicClient,
): Promise<bigint> {
  return client.getPendingTransactionCount()
}

export async function callContract(
  client: PublicClient,
  parameters: {
    request: RpcTransactionRequest
    blockTag?: BlockTag | undefined
  },
): Promise<Hex> {
  return client.call(parameters)
}

export async function callContractAtHash(
  client: PublicClient,
  parameters: {
    request: RpcTransactionRequest
    blockHash: Hex
  },
): Promise<Hex> {
  return client.callAtHash(parameters)
}

export async function pendingCallContract(
  client: PublicClient,
  parameters: {
    request: RpcTransactionRequest
  },
): Promise<Hex> {
  return client.pendingCall(parameters)
}

export async function callContractWithOverrides(
  client: PublicClient,
  parameters: {
    request: RpcTransactionRequest
    blockTag?: BlockTag | number | bigint | undefined
    overrides?: Record<Address, OverrideAccount> | undefined
  },
): Promise<Hex> {
  return client.callWithOverrides(parameters)
}

export async function suggestGasTipCap(
  client: PublicClient,
): Promise<bigint> {
  return client.maxPriorityFeePerGas()
}
