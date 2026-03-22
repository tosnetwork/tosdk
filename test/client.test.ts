import { expect, test, vi } from 'vitest'

import {
  createPublicClient,
  createWalletClient,
  encodeSystemActionData,
  http,
  systemActionAddress,
  toHex,
  webSocket,
} from 'tosdk'
import type { RpcBlock, RpcLog } from 'tosdk'
import { privateKeyToAccount } from 'tosdk/accounts'
import { tosTestnet } from 'tosdk/chains'

import { accounts } from './src/constants.js'
import { nativeAccounts, nativeSignerVectors } from './src/nativeFixtures.js'

type RpcRequestPayload = {
  id: number
  jsonrpc: '2.0'
  method: string
  params: readonly unknown[]
}

class FakeWebSocket {
  readyState = 0
  sent: RpcRequestPayload[] = []
  private listeners = new Map<string, Set<(event: any) => void>>()

  constructor(readonly url: string) {}

  addEventListener(type: string, listener: (event: any) => void) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    this.listeners.get(type)?.delete(listener)
  }

  send(data: string) {
    this.sent.push(JSON.parse(data) as RpcRequestPayload)
  }

  close() {
    this.readyState = 3
    this.emit('close', {})
  }

  open() {
    this.readyState = 1
    this.emit('open', {})
  }

  emitResult(id: number, result: unknown) {
    this.emit('message', {
      data: JSON.stringify({
        id,
        jsonrpc: '2.0',
        result,
      }),
    })
  }

  emitSubscription(subscription: string, result: unknown) {
    this.emit('message', {
      data: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tos_subscription',
        params: {
          subscription,
          result,
        },
      }),
    })
  }

  private emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
}

function createJsonRpcFetch(
  handler: (
    request: RpcRequestPayload,
    callIndex: number,
  ) => Promise<unknown> | unknown,
) {
  const calls: Array<{ url: string; request: RpcRequestPayload }> = []

  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as RpcRequestPayload
    calls.push({ request, url: String(input) })
    const callIndex = calls.length - 1
    const response = await handler(request, callIndex)

    return new Response(
      JSON.stringify({
        id: request.id,
        jsonrpc: '2.0',
        result: response,
      }),
      {
        headers: { 'content-type': 'application/json' },
        status: 200,
      },
    )
  })

  return { calls, fetchFn }
}

function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function hexBytes(byte: string, length: number): `0x${string}` {
  return `0x${byte.repeat(length)}` as `0x${string}`
}

test('public client uses the chain default RPC URL and returns native quantities', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_chainId':
        return toHex(tosTestnet.id)
      case 'tos_getBalance':
        return toHex(42n)
      case 'tos_getTransactionCount':
        return toHex(7n)
      case 'tos_getSponsorNonce':
        return toHex(9n)
      case 'tos_getSigner':
        return {
          address: nativeAccounts[0]!.address,
          signer: {
            type: 'secp256k1',
            value: nativeAccounts[0]!.address,
            defaulted: true,
          },
          blockNumber: toHex(99n),
        }
      case 'tos_blockNumber':
        return toHex(99n)
      case 'tos_getBlockByNumber':
        return {
          hash: '0x1234',
          number: toHex(99n),
          transactions: [],
        }
      case 'tos_call':
        return '0xdeadbeef'
      case 'tos_getCode':
        return '0x60016001'
      case 'tos_getStorageAt':
        return '0x01'
      case 'tos_getTransactionByHash':
        return {
          hash: '0xaaaa',
          from: nativeAccounts[0]!.address,
          to: nativeAccounts[1]!.address,
          value: toHex(42n),
        }
      case 'tos_getLogs':
        return [
          {
            address: nativeAccounts[1]!.address,
            data: '0xdeadbeef',
            topics: ['0x1111'],
          },
        ]
      case 'tos_estimateGas':
        return toHex(55_555n)
      case 'tos_maxPriorityFeePerGas':
        return toHex(1_500_000_000n)
      case 'tos_feeHistory':
        return {
          oldestBlock: toHex(90n),
          reward: [[toHex(1n), toHex(2n)]],
          baseFeePerGas: [toHex(10n), toHex(11n)],
          gasUsedRatio: [0.5, 0.75],
        }
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.getChainId()).resolves.toBe(BigInt(tosTestnet.id))
  await expect(
    client.getBalance({ address: nativeAccounts[0]!.address }),
  ).resolves.toBe(42n)
  await expect(
    client.getTransactionCount({ address: nativeAccounts[0]!.address }),
  ).resolves.toBe(7n)
  await expect(
    client.getSponsorNonce({ address: nativeAccounts[0]!.address }),
  ).resolves.toBe(9n)
  await expect(
    client.getSigner({ address: nativeAccounts[0]!.address }),
  ).resolves.toEqual({
    address: nativeAccounts[0]!.address,
    signer: {
      type: 'secp256k1',
      value: nativeAccounts[0]!.address,
      defaulted: true,
    },
    blockNumber: toHex(99n),
  })
  await expect(client.getBlockNumber()).resolves.toBe(99n)
  await expect(
    client.getBlockByNumber({ blockNumber: 99n, includeTransactions: true }),
  ).resolves.toEqual({
    hash: '0x1234',
    number: toHex(99n),
    transactions: [],
  })
  await expect(
    client.call({
      request: {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
        data: '0xdeadbeef',
      },
    }),
  ).resolves.toBe('0xdeadbeef')
  await expect(
    client.getCode({ address: nativeAccounts[1]!.address }),
  ).resolves.toBe('0x60016001')
  await expect(
    client.getStorageAt({
      address: nativeAccounts[1]!.address,
      slot: '0x01',
    }),
  ).resolves.toBe('0x01')
  await expect(
    client.getTransactionByHash({ hash: '0xaaaa' }),
  ).resolves.toMatchObject({
    from: nativeAccounts[0]!.address,
    hash: '0xaaaa',
    to: nativeAccounts[1]!.address,
  })
  await expect(
    client.getLogs({
      address: nativeAccounts[1]!.address,
      fromBlock: 1n,
      toBlock: 5n,
      topics: ['0x1111'],
    }),
  ).resolves.toEqual([
    {
      address: nativeAccounts[1]!.address,
      data: '0xdeadbeef',
      topics: ['0x1111'],
    },
  ])
  await expect(
    client.estimateGas({
      request: {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
      },
    }),
  ).resolves.toBe(55_555n)
  await expect(client.maxPriorityFeePerGas()).resolves.toBe(1_500_000_000n)
  await expect(
    client.feeHistory({
      blockCount: 2,
      lastBlock: 100n,
      rewardPercentiles: [25, 75],
    }),
  ).resolves.toEqual({
    oldestBlock: 90n,
    reward: [[1n, 2n]],
    baseFeePerGas: [10n, 11n],
    gasUsedRatio: [0.5, 0.75],
  })

  expect(calls[0]!.url).toBe(tosTestnet.rpcUrls.default.http[0])
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_getBalance',
    params: [nativeAccounts[0]!.address, 'latest'],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_getTransactionCount',
    params: [nativeAccounts[0]!.address, 'pending'],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_getSponsorNonce',
    params: [nativeAccounts[0]!.address, 'latest'],
  })
  expect(calls[4]!.request).toMatchObject({
    method: 'tos_getSigner',
    params: [nativeAccounts[0]!.address, 'latest'],
  })
  expect(calls[5]!.request).toMatchObject({
    method: 'tos_blockNumber',
    params: [],
  })
  expect(calls[6]!.request).toMatchObject({
    method: 'tos_getBlockByNumber',
    params: [toHex(99n), true],
  })
  expect(calls[7]!.request).toMatchObject({
    method: 'tos_call',
    params: [
      {
        data: '0xdeadbeef',
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
      },
      'latest',
    ],
  })
  expect(calls[8]!.request).toMatchObject({
    method: 'tos_getCode',
    params: [nativeAccounts[1]!.address, 'latest'],
  })
  expect(calls[9]!.request).toMatchObject({
    method: 'tos_getStorageAt',
    params: [nativeAccounts[1]!.address, '0x01', 'latest'],
  })
  expect(calls[11]!.request).toMatchObject({
    method: 'tos_getLogs',
    params: [
      {
        address: nativeAccounts[1]!.address,
        fromBlock: '0x1',
        toBlock: '0x5',
        topics: ['0x1111'],
      },
    ],
  })
  expect(calls[12]!.request).toMatchObject({
    method: 'tos_estimateGas',
    params: [
      {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
      },
      'latest',
    ],
  })
  expect(calls[14]!.request).toMatchObject({
    method: 'tos_feeHistory',
    params: ['0x2', '0x64', [25, 75]],
  })
})

test('public client exposes lease getters and transaction builders', async () => {
  const leaseRecord = {
    address: nativeAccounts[1]!.address,
    leaseOwner: nativeAccounts[2]!.address,
    createdAtBlock: toHex(10n),
    expireAtBlock: toHex(210n),
    graceUntilBlock: toHex(250n),
    codeBytes: toHex(1024n),
    depositTomi: toHex(123_456_789n),
    scheduledPruneEpoch: toHex(3n),
    scheduledPruneSeq: toHex(5n),
    status: 'active',
    tombstoned: false,
    tombstoneCodeHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    tombstoneExpiredAt: toHex(0n),
    blockNumber: toHex(99n),
  }
  const buildLeaseDeployTx = {
    tx: {
      from: nativeAccounts[0]!.address,
      to: systemActionAddress,
      nonce: toHex(7n),
      gas: toHex(150_000n),
      value: toHex(3n),
      input: '0xaaa1',
    },
    raw: '0xdeadbeef',
    contractAddress: nativeAccounts[3]!.address,
  }
  const buildLeaseRenewTx = {
    tx: {
      from: nativeAccounts[0]!.address,
      to: systemActionAddress,
      nonce: toHex(8n),
      gas: toHex(88_000n),
      value: toHex(0n),
      input: '0xbbb2',
    },
    raw: '0xbeefcafe',
  }
  const buildLeaseCloseTx = {
    tx: {
      from: nativeAccounts[0]!.address,
      to: systemActionAddress,
      nonce: toHex(9n),
      gas: toHex(77_000n),
      value: toHex(0n),
      input: '0xccc3',
    },
    raw: '0xcafebeef',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getLease':
        return leaseRecord
      case 'tos_buildLeaseDeployTx':
        return buildLeaseDeployTx
      case 'tos_buildLeaseRenewTx':
        return buildLeaseRenewTx
      case 'tos_buildLeaseCloseTx':
        return buildLeaseCloseTx
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getLease({
      address: nativeAccounts[1]!.address,
      blockTag: 99n,
    }),
  ).resolves.toEqual({
    address: nativeAccounts[1]!.address,
    leaseOwner: nativeAccounts[2]!.address,
    createdAtBlock: 10n,
    expireAtBlock: 210n,
    graceUntilBlock: 250n,
    codeBytes: 1024n,
    depositTomi: 123_456_789n,
    scheduledPruneEpoch: 3n,
    scheduledPruneSeq: 5n,
    status: 'active',
    tombstoned: false,
    tombstoneCodeHash:
      '0x1111111111111111111111111111111111111111111111111111111111111111',
    tombstoneExpiredAt: 0n,
    blockNumber: 99n,
  })
  await expect(
    client.buildLeaseDeployTx({
      from: nativeAccounts[0]!.address,
      nonce: 7n,
      gas: 150_000n,
      code: '0x6001600155',
      leaseBlocks: 12n,
      leaseOwner: nativeAccounts[2]!.address,
      value: 3n,
    }),
  ).resolves.toEqual({
    tx: {
      from: nativeAccounts[0]!.address,
      to: systemActionAddress,
      nonce: 7n,
      gas: 150_000n,
      value: 3n,
      input: '0xaaa1',
    },
    raw: '0xdeadbeef',
    contractAddress: nativeAccounts[3]!.address,
  })
  await expect(
    client.buildLeaseRenewTx({
      from: nativeAccounts[0]!.address,
      nonce: 8n,
      gas: 88_000n,
      contractAddress: nativeAccounts[3]!.address,
      deltaBlocks: 20n,
    }),
  ).resolves.toEqual({
    tx: {
      from: nativeAccounts[0]!.address,
      to: systemActionAddress,
      nonce: 8n,
      gas: 88_000n,
      value: 0n,
      input: '0xbbb2',
    },
    raw: '0xbeefcafe',
  })
  await expect(
    client.buildLeaseCloseTx({
      from: nativeAccounts[0]!.address,
      nonce: 9n,
      gas: 77_000n,
      contractAddress: nativeAccounts[3]!.address,
    }),
  ).resolves.toEqual({
    tx: {
      from: nativeAccounts[0]!.address,
      to: systemActionAddress,
      nonce: 9n,
      gas: 77_000n,
      value: 0n,
      input: '0xccc3',
    },
    raw: '0xcafebeef',
  })

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getLease',
    params: [nativeAccounts[1]!.address, toHex(99n)],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_buildLeaseDeployTx',
    params: [{
      from: nativeAccounts[0]!.address,
      nonce: toHex(7n),
      gas: toHex(150_000n),
      code: '0x6001600155',
      leaseBlocks: toHex(12n),
      leaseOwner: nativeAccounts[2]!.address,
      value: toHex(3n),
    }],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_buildLeaseRenewTx',
    params: [{
      from: nativeAccounts[0]!.address,
      nonce: toHex(8n),
      gas: toHex(88_000n),
      contractAddr: nativeAccounts[3]!.address,
      deltaBlocks: toHex(20n),
    }],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_buildLeaseCloseTx',
    params: [{
      from: nativeAccounts[0]!.address,
      nonce: toHex(9n),
      gas: toHex(77_000n),
      contractAddr: nativeAccounts[3]!.address,
    }],
  })
})

test('public client exposes privacy RPC helpers', async () => {
  const transferRequest = {
    from: nativeSignerVectors.elgamal.publicKey,
    to: hexBytes('11', 32),
    privNonce: 7n,
    fee: 3n,
    feeLimit: 5n,
    commitment: hexBytes('22', 32),
    senderHandle: hexBytes('33', 32),
    receiverHandle: hexBytes('44', 32),
    sourceCommitment: hexBytes('55', 32),
    ctValidityProof: hexBytes('66', 160),
    commitmentEqProof: hexBytes('77', 192),
    rangeProof: hexBytes('88', 736),
    encryptedMemo: hexBytes('99', 48),
    memoSenderHandle: hexBytes('aa', 32),
    memoReceiverHandle: hexBytes('bb', 32),
    s: hexBytes('cc', 32),
    e: hexBytes('dd', 32),
  } as const
  const shieldRequest = {
    pubkey: nativeSignerVectors.elgamal.publicKey,
    recipient: hexBytes('12', 32),
    privNonce: 8n,
    fee: 2n,
    amount: 50n,
    commitment: hexBytes('23', 32),
    handle: hexBytes('34', 32),
    shieldProof: hexBytes('45', 96),
    rangeProof: hexBytes('56', 672),
    s: hexBytes('67', 32),
    e: hexBytes('78', 32),
  } as const
  const unshieldRequest = {
    pubkey: nativeSignerVectors.elgamal.publicKey,
    recipient: nativeAccounts[1]!.address,
    privNonce: 9n,
    fee: 4n,
    amount: 75n,
    sourceCommitment: hexBytes('89', 32),
    commitmentEqProof: hexBytes('9a', 192),
    rangeProof: hexBytes('ab', 672),
    s: hexBytes('bc', 32),
    e: hexBytes('cd', 32),
  } as const

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_privGetBalance':
        return {
          pubkey: nativeSignerVectors.elgamal.publicKey,
          commitment: hexBytes('01', 32),
          handle: hexBytes('02', 32),
          version: toHex(4n),
          privNonce: toHex(7n),
          blockNumber: toHex(99n),
        }
      case 'tos_privGetNonce':
        return toHex(8n)
      case 'tos_privTransfer':
        return '0xaaaa'
      case 'tos_privShield':
        return '0xbbbb'
      case 'tos_privUnshield':
        return '0xcccc'
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.privGetBalance({
      pubkey: nativeSignerVectors.elgamal.publicKey,
      blockTag: 99n,
    }),
  ).resolves.toEqual({
    pubkey: nativeSignerVectors.elgamal.publicKey,
    commitment: hexBytes('01', 32),
    handle: hexBytes('02', 32),
    version: 4n,
    privNonce: 7n,
    blockNumber: 99n,
  })
  await expect(
    client.privGetNonce({
      pubkey: nativeSignerVectors.elgamal.publicKey,
      blockTag: 'pending',
    }),
  ).resolves.toBe(8n)
  await expect(client.privTransfer(transferRequest)).resolves.toBe('0xaaaa')
  await expect(client.privShield(shieldRequest)).resolves.toBe('0xbbbb')
  await expect(client.privUnshield(unshieldRequest)).resolves.toBe('0xcccc')

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_privGetBalance',
    params: [nativeSignerVectors.elgamal.publicKey, toHex(99n)],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_privGetNonce',
    params: [nativeSignerVectors.elgamal.publicKey, 'pending'],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_privTransfer',
    params: [{
      from: transferRequest.from,
      to: transferRequest.to,
      privNonce: toHex(7n),
      fee: toHex(3n),
      feeLimit: toHex(5n),
      commitment: transferRequest.commitment,
      senderHandle: transferRequest.senderHandle,
      receiverHandle: transferRequest.receiverHandle,
      sourceCommitment: transferRequest.sourceCommitment,
      ctValidityProof: transferRequest.ctValidityProof,
      commitmentEqProof: transferRequest.commitmentEqProof,
      rangeProof: transferRequest.rangeProof,
      encryptedMemo: transferRequest.encryptedMemo,
      memoSenderHandle: transferRequest.memoSenderHandle,
      memoReceiverHandle: transferRequest.memoReceiverHandle,
      s: transferRequest.s,
      e: transferRequest.e,
    }],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_privShield',
    params: [{
      pubkey: shieldRequest.pubkey,
      recipient: shieldRequest.recipient,
      privNonce: toHex(8n),
      fee: toHex(2n),
      amount: toHex(50n),
      commitment: shieldRequest.commitment,
      handle: shieldRequest.handle,
      shieldProof: shieldRequest.shieldProof,
      rangeProof: shieldRequest.rangeProof,
      s: shieldRequest.s,
      e: shieldRequest.e,
    }],
  })
  expect(calls[4]!.request).toMatchObject({
    method: 'tos_privUnshield',
    params: [{
      pubkey: unshieldRequest.pubkey,
      recipient: nativeAccounts[1]!.address,
      privNonce: toHex(9n),
      fee: toHex(4n),
      amount: toHex(75n),
      sourceCommitment: unshieldRequest.sourceCommitment,
      commitmentEqProof: unshieldRequest.commitmentEqProof,
      rangeProof: unshieldRequest.rangeProof,
      s: unshieldRequest.s,
      e: unshieldRequest.e,
    }],
  })
})

test('waitForTransactionReceipt polls until a receipt becomes available', async () => {
  const receipt = {
    blockHash: '0xbeef',
    blockNumber: toHex(12n),
    cumulativeGasUsed: toHex(21_000n),
    from: nativeAccounts[0]!.address,
    gasUsed: toHex(21_000n),
    logs: [],
    to: nativeAccounts[1]!.address,
    transactionHash: '0xabcd',
  }

  const { fetchFn } = createJsonRpcFetch((_request, index) =>
    index === 0 ? null : receipt,
  )

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.waitForTransactionReceipt({
      hash: '0xabcd',
      pollIntervalMs: 1,
      timeoutMs: 50,
    }),
  ).resolves.toEqual(receipt)
})

test('wallet client signs and broadcasts native transactions', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const expectedSerialized = await account.signTransaction({
    chainId: BigInt(tosTestnet.id),
    data: '0x',
    from: account.address,
    gas: 21_000n,
    nonce: 7n,
    signerType: 'secp256k1',
    to: nativeAccounts[1]!.address,
    type: 'native',
    value: 1_000_000_000_000_000n,
  })

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_chainId':
        return toHex(tosTestnet.id)
      case 'tos_getTransactionCount':
        return toHex(7n)
      case 'tos_sendRawTransaction':
        return '0xfeed'
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.sendTransaction({
      to: nativeAccounts[1]!.address,
      value: 1_000_000_000_000_000n,
    }),
  ).resolves.toBe('0xfeed')

  expect(calls.map((call) => call.request.method)).toEqual([
    'tos_chainId',
    'tos_getTransactionCount',
    'tos_sendRawTransaction',
  ])
  expect(calls[2]!.request.params[0]).toBe(expectedSerialized)
})

test('wallet client inherits privacy RPC helpers', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_privGetNonce':
        return toHex(12n)
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.privGetNonce({
      pubkey: nativeSignerVectors.elgamal.publicKey,
      blockTag: 'latest',
    }),
  ).resolves.toBe(12n)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_privGetNonce',
    params: [nativeSignerVectors.elgamal.publicKey, 'latest'],
  })
})

test('wallet client uses the local account signerType when none is passed explicitly', async () => {
  const baseAccount = privateKeyToAccount(accounts[0]!.privateKey)
  const customAccount = {
    ...baseAccount,
    signerType: 'ed25519',
    signAuthorization: vi.fn(baseAccount.signAuthorization),
  }

  const client = createWalletClient({
    account: customAccount,
    chain: tosTestnet,
    transport: http(tosTestnet.rpcUrls.default.http[0], {
      fetchFn: vi.fn(async (_input, init) => {
        const request = JSON.parse(String(init?.body)) as RpcRequestPayload
        switch (request.method) {
          case 'tos_chainId':
            return new Response(
              JSON.stringify({
                id: request.id,
                jsonrpc: '2.0',
                result: toHex(tosTestnet.id),
              }),
              { headers: { 'content-type': 'application/json' }, status: 200 },
            )
          case 'tos_getTransactionCount':
            return new Response(
              JSON.stringify({
                id: request.id,
                jsonrpc: '2.0',
                result: toHex(1n),
              }),
              { headers: { 'content-type': 'application/json' }, status: 200 },
            )
          default:
            throw new Error(`Unexpected method: ${request.method}`)
        }
      }),
    }),
  })

  await client.signAuthorization({
    to: nativeAccounts[1]!.address,
    value: 1n,
  })

  expect(customAccount.signAuthorization).toHaveBeenCalledTimes(1)
  expect(customAccount.signAuthorization.mock.calls[0]![0]).toMatchObject({
    from: customAccount.address,
    nonce: 1n,
    signerType: 'ed25519',
    to: nativeAccounts[1]!.address,
    value: 1n,
  })
})

test('wallet client sends system actions through the system action address', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const payload = {
    action: 'REPUTATION_RECORD_SCORE',
    payload: {
      agent: nativeAccounts[1]!.address,
      delta: 10,
    },
  }

  const expectedSerialized = await account.signTransaction({
    chainId: BigInt(tosTestnet.id),
    data: encodeSystemActionData(payload),
    from: account.address,
    gas: 120_000n,
    nonce: 3n,
    signerType: 'secp256k1',
    to: systemActionAddress,
    type: 'native',
    value: 0n,
  })

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_chainId':
        return toHex(tosTestnet.id)
      case 'tos_getTransactionCount':
        return toHex(3n)
      case 'tos_sendRawTransaction':
        return '0xcafe'
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.sendSystemAction(payload)).resolves.toBe('0xcafe')

  expect(calls[2]!.request).toMatchObject({
    method: 'tos_sendRawTransaction',
    params: [expectedSerialized],
  })
})

test('wallet client bootstraps signer metadata through ACCOUNT_SET_SIGNER', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const expectedSerialized = await account.signTransaction({
    chainId: BigInt(tosTestnet.id),
    data: encodeSystemActionData({
      action: 'ACCOUNT_SET_SIGNER',
      payload: {
        signerType: 'ed25519',
        signerValue:
          '0x1111111111111111111111111111111111111111111111111111111111111111',
      },
    }),
    from: account.address,
    gas: 120_000n,
    nonce: 4n,
    signerType: 'secp256k1',
    to: systemActionAddress,
    type: 'native',
    value: 0n,
  })

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_chainId':
        return toHex(tosTestnet.id)
      case 'tos_getTransactionCount':
        return toHex(4n)
      case 'tos_sendRawTransaction':
        return '0xbead'
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.setSignerMetadata({
      signerType: 'ed25519',
      signerValue:
        '0x1111111111111111111111111111111111111111111111111111111111111111',
    }),
  ).resolves.toBe('0xbead')

  expect(calls[2]!.request).toMatchObject({
    method: 'tos_sendRawTransaction',
    params: [expectedSerialized],
  })
})

test('wallet client signs and broadcasts lease lifecycle transactions from builder RPCs', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const builtLeaseDeployTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(11n),
      gas: toHex(140_000n),
      value: toHex(4n),
      input: '0xddd4' as const,
    },
    raw: '0x1111' as const,
    contractAddress: nativeAccounts[3]!.address,
  }
  const builtLeaseRenewTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(12n),
      gas: toHex(90_000n),
      value: toHex(0n),
      input: '0xeee5' as const,
    },
    raw: '0x2222' as const,
  }
  const builtLeaseCloseTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(13n),
      gas: toHex(70_000n),
      value: toHex(0n),
      input: '0xfff6' as const,
    },
    raw: '0x3333' as const,
  }
  const expectedDeploySerialized = await account.signTransaction({
    chainId: BigInt(tosTestnet.id),
    data: builtLeaseDeployTx.tx.input,
    from: account.address,
    gas: 140_000n,
    nonce: 11n,
    signerType: 'secp256k1',
    to: systemActionAddress,
    type: 'native',
    value: 4n,
  })
  const expectedRenewSerialized = await account.signTransaction({
    chainId: BigInt(tosTestnet.id),
    data: builtLeaseRenewTx.tx.input,
    from: account.address,
    gas: 90_000n,
    nonce: 12n,
    signerType: 'secp256k1',
    to: systemActionAddress,
    type: 'native',
    value: 0n,
  })
  const expectedCloseSerialized = await account.signTransaction({
    chainId: BigInt(tosTestnet.id),
    data: builtLeaseCloseTx.tx.input,
    from: account.address,
    gas: 70_000n,
    nonce: 13n,
    signerType: 'secp256k1',
    to: systemActionAddress,
    type: 'native',
    value: 0n,
  })

  let sendIndex = 0
  const sendResults = ['0xfeed', '0xbead', '0xcafe']
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_buildLeaseDeployTx':
        return builtLeaseDeployTx
      case 'tos_buildLeaseRenewTx':
        return builtLeaseRenewTx
      case 'tos_buildLeaseCloseTx':
        return builtLeaseCloseTx
      case 'tos_chainId':
        return toHex(tosTestnet.id)
      case 'tos_sendRawTransaction':
        return sendResults[sendIndex++]
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.leaseDeploy({
      code: '0x6001600155',
      leaseBlocks: 30n,
      leaseOwner: nativeAccounts[2]!.address,
      value: 4n,
    }),
  ).resolves.toEqual({
    txHash: '0xfeed',
    contractAddress: nativeAccounts[3]!.address,
  })
  await expect(
    client.leaseRenew({
      contractAddress: nativeAccounts[3]!.address,
      deltaBlocks: 15n,
    }),
  ).resolves.toBe('0xbead')
  await expect(
    client.leaseClose({
      contractAddress: nativeAccounts[3]!.address,
    }),
  ).resolves.toBe('0xcafe')

  expect(calls.map((call) => call.request.method)).toEqual([
    'tos_buildLeaseDeployTx',
    'tos_chainId',
    'tos_sendRawTransaction',
    'tos_buildLeaseRenewTx',
    'tos_chainId',
    'tos_sendRawTransaction',
    'tos_buildLeaseCloseTx',
    'tos_chainId',
    'tos_sendRawTransaction',
  ])
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_buildLeaseDeployTx',
    params: [{
      from: account.address,
      code: '0x6001600155',
      leaseBlocks: toHex(30n),
      leaseOwner: nativeAccounts[2]!.address,
      value: toHex(4n),
    }],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_sendRawTransaction',
    params: [expectedDeploySerialized],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_buildLeaseRenewTx',
    params: [{
      from: account.address,
      contractAddr: nativeAccounts[3]!.address,
      deltaBlocks: toHex(15n),
    }],
  })
  expect(calls[5]!.request).toMatchObject({
    method: 'tos_sendRawTransaction',
    params: [expectedRenewSerialized],
  })
  expect(calls[6]!.request).toMatchObject({
    method: 'tos_buildLeaseCloseTx',
    params: [{
      from: account.address,
      contractAddr: nativeAccounts[3]!.address,
    }],
  })
  expect(calls[8]!.request).toMatchObject({
    method: 'tos_sendRawTransaction',
    params: [expectedCloseSerialized],
  })
})

test('getLogs rejects blockHash mixed with block range parameters', async () => {
  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(tosTestnet.rpcUrls.default.http[0], {
      fetchFn: vi.fn(),
    }),
  })

  await expect(
    client.getLogs({
      blockHash: '0xabcd',
      fromBlock: 1n,
    }),
  ).rejects.toMatchObject({
    name: 'InvalidLogFilterError',
  })
})

test('webSocket transport supports RPC requests and subscriptions', async () => {
  let socket!: FakeWebSocket
  const client = createPublicClient({
    chain: tosTestnet,
    transport: webSocket(undefined, {
      webSocketFactory: (url) => {
        socket = new FakeWebSocket(url)
        queueMicrotask(() => socket.open())
        return socket
      },
    }),
  })

  const blockPromise = client.getBlockByHash({ hash: '0xbeef' })
  await flushAsync()
  expect(socket.url).toBe(
    `wss://${tosTestnet.rpcUrls.default.http[0]!.slice('https://'.length)}`,
  )
  expect(socket.sent[0]).toMatchObject({
    method: 'tos_getBlockByHash',
    params: ['0xbeef', false],
  })
  socket.emitResult(socket.sent[0]!.id, {
    hash: '0xbeef',
    number: toHex(7n),
    transactions: [],
  })
  await expect(blockPromise).resolves.toMatchObject({ hash: '0xbeef' })

  const seenBlocks: RpcBlock[] = []
  const blockSubPromise = client.watchBlocks({
    onBlock: (block) => seenBlocks.push(block),
  })
  await flushAsync()
  expect(socket.sent[1]).toMatchObject({
    method: 'tos_subscribe',
    params: ['newHeads'],
  })
  socket.emitResult(socket.sent[1]!.id, '0xsub-blocks')
  const blockSub = await blockSubPromise
  socket.emitSubscription('0xsub-blocks', {
    number: toHex(8n),
    hash: '0xcafe',
    transactions: [],
  })
  expect(seenBlocks).toEqual([{ hash: '0xcafe', number: '0x8', transactions: [] }])

  const seenLogs: RpcLog[] = []
  const logSubPromise = client.watchLogs({
    filter: {
      address: nativeAccounts[1]!.address,
      topics: ['0x1111'],
    },
    onLog: (log) => seenLogs.push(log),
  })
  await flushAsync()
  expect(socket.sent[2]).toMatchObject({
    method: 'tos_subscribe',
    params: [
      'logs',
      {
        address: nativeAccounts[1]!.address,
        fromBlock: '0x0',
        toBlock: 'latest',
        topics: ['0x1111'],
      },
    ],
  })
  socket.emitResult(socket.sent[2]!.id, '0xsub-logs')
  const logSub = await logSubPromise
  socket.emitSubscription('0xsub-logs', {
    address: nativeAccounts[1]!.address,
    data: '0xdeadbeef',
    topics: ['0x1111'],
  })
  expect(seenLogs).toEqual([
    {
      address: nativeAccounts[1]!.address,
      data: '0xdeadbeef',
      topics: ['0x1111'],
    },
  ])

  const unsubscribeBlockPromise = blockSub.unsubscribe()
  await flushAsync()
  expect(socket.sent[3]).toMatchObject({
    method: 'tos_unsubscribe',
    params: ['0xsub-blocks'],
  })
  socket.emitResult(socket.sent[3]!.id, true)
  await unsubscribeBlockPromise

  const unsubscribeLogPromise = logSub.unsubscribe()
  await flushAsync()
  expect(socket.sent[4]).toMatchObject({
    method: 'tos_unsubscribe',
    params: ['0xsub-logs'],
  })
  socket.emitResult(socket.sent[4]!.id, true)
  await unsubscribeLogPromise
})

test('gasPrice returns the current gas price as bigint', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_gasPrice':
        return toHex(20_000_000_000n)
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.gasPrice()).resolves.toBe(20_000_000_000n)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_gasPrice',
    params: [],
  })
})

test('syncing returns false when not syncing', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_syncing':
        return false
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.syncing()).resolves.toBe(false)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_syncing',
    params: [],
  })
})

test('syncing returns SyncingStatus when node is syncing', async () => {
  const syncingStatus = {
    startingBlock: '0x0',
    currentBlock: '0x100',
    highestBlock: '0x200',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_syncing':
        return syncingStatus
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.syncing()).resolves.toEqual(syncingStatus)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_syncing',
    params: [],
  })
})

test('estimateGas accepts a blockTag parameter and sends it in RPC params', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_estimateGas':
        return toHex(42_000n)
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.estimateGas({
      request: {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
      },
      blockTag: 'pending',
    }),
  ).resolves.toBe(42_000n)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_estimateGas',
    params: [
      {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
      },
      'pending',
    ],
  })
})

test('getBlockTransactionCountByNumber returns tx count for a block number', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getBlockTransactionCountByNumber':
        return toHex(5n)
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getBlockTransactionCountByNumber({ blockNumber: 100n }),
  ).resolves.toBe(5n)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getBlockTransactionCountByNumber',
    params: [toHex(100n)],
  })
})

test('getBlockTransactionCountByHash returns tx count for a block hash', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getBlockTransactionCountByHash':
        return toHex(3n)
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getBlockTransactionCountByHash({ hash: '0xabcd' }),
  ).resolves.toBe(3n)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getBlockTransactionCountByHash',
    params: ['0xabcd'],
  })
})

test('getTransactionByBlockNumberAndIndex returns a transaction', async () => {
  const mockTx = {
    hash: '0xdddd',
    from: nativeAccounts[0]!.address,
    to: nativeAccounts[1]!.address,
    value: toHex(100n),
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getTransactionByBlockNumberAndIndex':
        return mockTx
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getTransactionByBlockNumberAndIndex({ blockNumber: 50n, index: 2 }),
  ).resolves.toEqual(mockTx)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getTransactionByBlockNumberAndIndex',
    params: [toHex(50n), toHex(2)],
  })
})

test('getTransactionByBlockHashAndIndex returns a transaction', async () => {
  const mockTx = {
    hash: '0xeeee',
    from: nativeAccounts[0]!.address,
    to: nativeAccounts[1]!.address,
    value: toHex(200n),
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getTransactionByBlockHashAndIndex':
        return mockTx
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getTransactionByBlockHashAndIndex({ hash: '0xbeef', index: 0 }),
  ).resolves.toEqual(mockTx)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getTransactionByBlockHashAndIndex',
    params: ['0xbeef', toHex(0)],
  })
})

test('pendingTransactions returns a list of pending transactions', async () => {
  const mockPending = [
    {
      hash: '0xaaaa',
      from: nativeAccounts[0]!.address,
      to: nativeAccounts[1]!.address,
      value: toHex(10n),
    },
    {
      hash: '0xbbbb',
      from: nativeAccounts[1]!.address,
      to: nativeAccounts[0]!.address,
      value: toHex(20n),
    },
  ]

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_pendingTransactions':
        return mockPending
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.pendingTransactions()).resolves.toEqual(mockPending)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_pendingTransactions',
    params: [],
  })
})

test('getProof returns account proof with storage proofs', async () => {
  const mockProof = {
    address: nativeAccounts[0]!.address,
    accountProof: ['0x1111', '0x2222'],
    balance: toHex(1000n),
    codeHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    nonce: toHex(5n),
    storageHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
    storageProof: [
      {
        key: '0x01',
        value: toHex(99n),
        proof: ['0x5555', '0x6666'],
      },
    ],
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getProof':
        return mockProof
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getProof({
      address: nativeAccounts[0]!.address,
      storageKeys: ['0x01'],
      blockTag: '0x32',
    }),
  ).resolves.toEqual(mockProof)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getProof',
    params: [nativeAccounts[0]!.address, ['0x01'], '0x32'],
  })
})

test('getProof uses latest as default blockTag', async () => {
  const mockProof = {
    address: nativeAccounts[0]!.address,
    accountProof: [],
    balance: toHex(0n),
    codeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    nonce: toHex(0n),
    storageHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    storageProof: [],
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getProof':
        return mockProof
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getProof({
      address: nativeAccounts[0]!.address,
      storageKeys: [],
    }),
  ).resolves.toEqual(mockProof)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getProof',
    params: [nativeAccounts[0]!.address, [], 'latest'],
  })
})

test('createAccessList returns access list and gas used', async () => {
  const mockResult = {
    accessList: [
      {
        address: nativeAccounts[1]!.address,
        storageKeys: ['0x01', '0x02'],
      },
    ],
    gasUsed: toHex(30_000n),
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_createAccessList':
        return mockResult
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.createAccessList({
      request: {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
        data: '0xdeadbeef',
      },
      blockTag: 'pending',
    }),
  ).resolves.toEqual(mockResult)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_createAccessList',
    params: [
      {
        from: nativeAccounts[0]!.address,
        to: nativeAccounts[1]!.address,
        data: '0xdeadbeef',
      },
      'pending',
    ],
  })
})

test('netVersion returns the network version string', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'net_version':
        return '1001'
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.netVersion()).resolves.toBe('1001')

  expect(calls[0]!.request).toMatchObject({
    method: 'net_version',
    params: [],
  })
})

test('netPeerCount returns the peer count as bigint', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'net_peerCount':
        return toHex(25n)
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.netPeerCount()).resolves.toBe(25n)

  expect(calls[0]!.request).toMatchObject({
    method: 'net_peerCount',
    params: [],
  })
})

test('netListening returns whether the node is listening', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'net_listening':
        return true
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.netListening()).resolves.toBe(true)

  expect(calls[0]!.request).toMatchObject({
    method: 'net_listening',
    params: [],
  })
})

test('clientVersion returns the client version string', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'web3_clientVersion':
        return 'TosNode/v1.2.3/linux-amd64'
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.clientVersion()).resolves.toBe('TosNode/v1.2.3/linux-amd64')

  expect(calls[0]!.request).toMatchObject({
    method: 'web3_clientVersion',
    params: [],
  })
})

test('public client exposes agent discovery read-only methods', async () => {
  const discoveryInfo = {
    enabled: true,
    profileVersion: 2,
    talkProtocol: 'a2a/1.0',
    nodeId: '0xnode1234',
    nodeRecord: 'enr:-abc123',
    primaryIdentity: nativeAccounts[0]!.address,
    cardSequence: 5,
    connectionModes: 3,
    capabilities: ['llm-chat', 'tool-use'],
    hasPublishedCard: true,
  }
  const searchResults = [
    {
      nodeId: '0xnode5678',
      nodeRecord: 'enr:-def456',
      primaryIdentity: nativeAccounts[1]!.address,
      connectionModes: 1,
      cardSequence: 2,
      capabilities: ['llm-chat'],
    },
    {
      nodeId: '0xnode9abc',
      nodeRecord: 'enr:-ghi789',
      primaryIdentity: nativeAccounts[2]!.address,
      connectionModes: 2,
      cardSequence: 3,
      capabilities: ['tool-use'],
      trust: {
        registered: true,
        suspended: false,
        stake: '1000000',
        reputation: '95',
        ratingCount: '42',
        capabilityRegistered: true,
        hasOnchainCapability: true,
      },
    },
  ]
  const cardResponse = {
    nodeId: '0xnode5678',
    nodeRecord: 'enr:-def456',
    cardJson: '{"name":"TestAgent","version":"1.0"}',
    parsedCard: {
      agent_id: 'test-agent',
      package_name: 'tolang.openlib.settlement',
      capabilities: [{ name: 'llm-chat' }],
    },
  }
  const directorySearchResults = [
    {
      nodeId: '0xnodeDIR1',
      nodeRecord: 'enr:-dir001',
      primaryIdentity: nativeAccounts[3]!.address,
      capabilities: ['llm-chat', 'code-gen'],
    },
  ]

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_agentDiscoveryInfo':
        return discoveryInfo
      case 'tos_agentDiscoverySearch':
        return searchResults
      case 'tos_agentDiscoveryGetCard':
        return cardResponse
      case 'tos_agentDiscoveryDirectorySearch':
        return directorySearchResults
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // agentDiscoveryInfo
  await expect(client.agentDiscoveryInfo()).resolves.toEqual(discoveryInfo)

  // agentDiscoverySearch with limit
  await expect(
    client.agentDiscoverySearch({ capability: 'llm-chat', limit: 10 }),
  ).resolves.toEqual(searchResults)

  // agentDiscoveryGetCard
  await expect(
    client.agentDiscoveryGetCard({ nodeRecord: 'enr:-def456' }),
  ).resolves.toEqual(cardResponse)

  // agentDiscoveryDirectorySearch with limit
  await expect(
    client.agentDiscoveryDirectorySearch({
      nodeRecord: 'enr:-dir-root',
      capability: 'code-gen',
      limit: 5,
    }),
  ).resolves.toEqual(directorySearchResults)

  // Verify RPC payloads
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_agentDiscoveryInfo',
    params: [],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_agentDiscoverySearch',
    params: ['llm-chat', 10],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_agentDiscoveryGetCard',
    params: ['enr:-def456'],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_agentDiscoveryDirectorySearch',
    params: ['enr:-dir-root', 'code-gen', 5],
  })
})

test('public client agentDiscoverySearch omits limit when not provided', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_agentDiscoverySearch':
        return []
      case 'tos_agentDiscoveryDirectorySearch':
        return []
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.agentDiscoverySearch({ capability: 'tool-use' }),
  ).resolves.toEqual([])

  await expect(
    client.agentDiscoveryDirectorySearch({
      nodeRecord: 'enr:-abc',
      capability: 'llm-chat',
    }),
  ).resolves.toEqual([])

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_agentDiscoverySearch',
    params: ['tool-use'],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_agentDiscoveryDirectorySearch',
    params: ['enr:-abc', 'llm-chat'],
  })
})

test('wallet client exposes agentDiscoveryPublish and agentDiscoveryClear', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const publishedInfo = {
    enabled: true,
    profileVersion: 3,
    talkProtocol: 'a2a/1.0',
    nodeId: '0xnodeWALLET',
    nodeRecord: 'enr:-wallet123',
    primaryIdentity: account.address,
    cardSequence: 1,
    connectionModes: 2,
    capabilities: ['llm-chat', 'tool-use'],
    hasPublishedCard: true,
  }
  const clearedInfo = {
    enabled: true,
    profileVersion: 4,
    talkProtocol: 'a2a/1.0',
    nodeId: '0xnodeWALLET',
    nodeRecord: 'enr:-wallet123',
    hasPublishedCard: false,
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_agentDiscoveryPublish':
        return publishedInfo
      case 'tos_agentDiscoveryClear':
        return clearedInfo
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // agentDiscoveryPublish
  await expect(
    client.agentDiscoveryPublish({
      primaryIdentity: account.address,
      capabilities: ['llm-chat', 'tool-use'],
      connectionModes: ['http', 'ws'],
      cardJson: '{"name":"MyAgent"}',
      cardSequence: 1,
    }),
  ).resolves.toEqual(publishedInfo)

  // agentDiscoveryClear
  await expect(client.agentDiscoveryClear()).resolves.toEqual(clearedInfo)

  // Verify RPC payloads
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_agentDiscoveryPublish',
    params: [
      {
        primaryIdentity: account.address,
        capabilities: ['llm-chat', 'tool-use'],
        connectionModes: ['http', 'ws'],
        cardJson: '{"name":"MyAgent"}',
        cardSequence: 1,
      },
    ],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_agentDiscoveryClear',
    params: [],
  })
})

test('wallet client agentDiscoveryPublish omits optional fields when not provided', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const publishedInfo = {
    enabled: true,
    profileVersion: 1,
    talkProtocol: 'a2a/1.0',
    hasPublishedCard: true,
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_agentDiscoveryPublish':
        return publishedInfo
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.agentDiscoveryPublish({
      primaryIdentity: account.address,
      capabilities: ['llm-chat'],
    }),
  ).resolves.toEqual(publishedInfo)

  const publishParams = calls[0]!.request.params[0] as Record<string, unknown>
  expect(publishParams).toMatchObject({
    primaryIdentity: account.address,
    capabilities: ['llm-chat'],
  })
  expect(publishParams).not.toHaveProperty('connectionModes')
  expect(publishParams).not.toHaveProperty('cardJson')
  expect(publishParams).not.toHaveProperty('cardSequence')
})

test('public client exposes contract metadata, protocol registries, and suggested-card wrappers', async () => {
  const publisherId = hexBytes('11', 32)
  const packageHash = hexBytes('22', 32)
  const scopeRef = hexBytes('33', 32)
  const capability = {
    owner: nativeAccounts[0]!.address,
    name: 'settlement.execute',
    bit_index: 9,
    category: 2,
    version: 1,
    status: 'active',
    manifest_ref: 'ipfs://cap-manifest',
  }
  const delegation = {
    principal: nativeAccounts[0]!.address,
    delegate: nativeAccounts[1]!.address,
    scope_ref: scopeRef,
    capability_ref: 'cap:settlement.execute',
    policy_ref: 'policy:settlement',
    not_before_ms: 100,
    expiry_ms: 200,
    status: 'active',
  }
  const publisher = {
    publisher_id: publisherId,
    controller: nativeAccounts[0]!.address,
    metadata_ref: 'ipfs://publisher-meta',
    namespace: 'tolang.openlib',
    status: 'active',
    effective_status: 'active',
  }
  const pkg = {
    name: 'tolang.openlib.settlement',
    namespace: 'tolang.openlib',
    version: '1.0.0',
    package_hash: packageHash,
    publisher_id: publisherId,
    channel: 'stable',
    status: 'active',
    effective_status: 'active',
    trusted: true,
    contract_count: 2,
    published_at: 1234,
  }
  const verifier = {
    name: 'uno.disclosure',
    verifier_type: 1,
    verifier_class: 'disclosure_exact',
    controller: nativeAccounts[0]!.address,
    verifier_addr: nativeAccounts[2]!.address,
    version: 1,
    status: 'active',
  }
  const verification = {
    subject: nativeAccounts[1]!.address,
    proof_type: 'uno.disclosure',
    proof_class: 'exact_disclosure',
    verifier_class: 'disclosure_exact',
    verified_at: 999,
    expiry_ms: 1999,
    status: 'active',
  }
  const settlementPolicy = {
    policy_id: 'policy-1',
    kind: 2,
    policy_class: 'sponsored_allowance',
    owner: nativeAccounts[0]!.address,
    asset: 'tos',
    max_amount: '1000000',
    status: 'active',
  }
  const agentIdentity = {
    agent_address: nativeAccounts[2]!.address,
    registered: true,
    suspended: false,
    status: 1,
    stake: '5000',
    binding_active: true,
    binding_verified: true,
    binding_expiry: 99999,
  }
  const metadata = {
    address: nativeAccounts[2]!.address,
    code_hash: hexBytes('44', 32),
    code_kind: 'toc',
    artifact: {
      contract_name: 'TaskSettlement',
      bytecode_hash: hexBytes('55', 32),
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
        capability_kind: 'managed_execution',
      },
      suggested_card: {
        agent_id: 'task-settlement',
        agent_address: nativeAccounts[2]!.address,
      },
    },
  }
  const suggestedCard = {
    agent_id: 'task-settlement',
    agent_address: nativeAccounts[2]!.address,
    package_name: 'tolang.openlib.settlement',
  }
  const namespaceClaim = {
    namespace: 'tolang.openlib',
    publisher_id: publisherId,
    status: 'active',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getContractMetadata':
        return metadata
      case 'tos_tolGetCapability':
        return capability
      case 'tos_tolGetDelegation':
        return delegation
      case 'tos_tolGetPackage':
      case 'tos_tolGetPackageByHash':
      case 'tos_tolGetLatestPackage':
        return pkg
      case 'tos_tolGetPublisher':
      case 'tos_tolGetPublisherByNamespace':
        return publisher
      case 'tos_tolGetNamespaceClaim':
        return namespaceClaim
      case 'tos_tolGetVerifier':
        return verifier
      case 'tos_tolGetVerification':
        return verification
      case 'tos_tolGetSettlementPolicy':
        return settlementPolicy
      case 'tos_tolGetAgentIdentity':
        return agentIdentity
      case 'tos_agentDiscoveryGetSuggestedCard':
        return suggestedCard
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getContractMetadata({ address: nativeAccounts[2]!.address, blockTag: 8n }),
  ).resolves.toEqual(metadata)
  await expect(
    client.getCapability({ name: 'settlement.execute' }),
  ).resolves.toEqual(capability)
  await expect(
    client.getDelegation({
      principal: nativeAccounts[0]!.address,
      delegate: nativeAccounts[1]!.address,
      scopeRef,
    }),
  ).resolves.toEqual(delegation)
  await expect(
    client.getPackage({ name: 'tolang.openlib.settlement', version: '1.0.0' }),
  ).resolves.toEqual(pkg)
  await expect(
    client.getPackageByHash({ packageHash }),
  ).resolves.toEqual(pkg)
  await expect(
    client.getLatestPackage({ name: 'tolang.openlib.settlement', channel: 'stable' }),
  ).resolves.toEqual(pkg)
  await expect(
    client.getPublisher({ publisherId }),
  ).resolves.toEqual(publisher)
  await expect(
    client.getPublisherByNamespace({ namespace: 'tolang.openlib' }),
  ).resolves.toEqual(publisher)
  await expect(
    client.getNamespaceClaim({ namespace: 'tolang.openlib' }),
  ).resolves.toEqual(namespaceClaim)
  await expect(
    client.getVerifier({ name: 'uno.disclosure' }),
  ).resolves.toEqual(verifier)
  await expect(
    client.getVerification({
      subject: nativeAccounts[1]!.address,
      proofType: 'uno.disclosure',
    }),
  ).resolves.toEqual(verification)
  await expect(
    client.getSettlementPolicy({ owner: nativeAccounts[0]!.address, asset: 'tos' }),
  ).resolves.toEqual(settlementPolicy)
  await expect(
    client.getAgentIdentity({ agent: nativeAccounts[2]!.address }),
  ).resolves.toEqual(agentIdentity)
  await expect(
    client.agentDiscoveryGetSuggestedCard({
      address: nativeAccounts[2]!.address,
      blockTag: 9n,
    }),
  ).resolves.toEqual(suggestedCard)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getContractMetadata',
    params: [nativeAccounts[2]!.address, toHex(8n)],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_tolGetCapability',
    params: ['settlement.execute'],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_tolGetDelegation',
    params: [nativeAccounts[0]!.address, nativeAccounts[1]!.address, scopeRef],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_tolGetPackage',
    params: ['tolang.openlib.settlement', '1.0.0'],
  })
  expect(calls[4]!.request).toMatchObject({
    method: 'tos_tolGetPackageByHash',
    params: [packageHash],
  })
  expect(calls[5]!.request).toMatchObject({
    method: 'tos_tolGetLatestPackage',
    params: ['tolang.openlib.settlement', 'stable'],
  })
  expect(calls[6]!.request).toMatchObject({
    method: 'tos_tolGetPublisher',
    params: [publisherId],
  })
  expect(calls[7]!.request).toMatchObject({
    method: 'tos_tolGetPublisherByNamespace',
    params: ['tolang.openlib'],
  })
  expect(calls[8]!.request).toMatchObject({
    method: 'tos_tolGetNamespaceClaim',
    params: ['tolang.openlib'],
  })
  expect(calls[9]!.request).toMatchObject({
    method: 'tos_tolGetVerifier',
    params: ['uno.disclosure'],
  })
  expect(calls[10]!.request).toMatchObject({
    method: 'tos_tolGetVerification',
    params: [nativeAccounts[1]!.address, 'uno.disclosure'],
  })
  expect(calls[11]!.request).toMatchObject({
    method: 'tos_tolGetSettlementPolicy',
    params: [nativeAccounts[0]!.address, 'tos'],
  })
  expect(calls[12]!.request).toMatchObject({
    method: 'tos_tolGetAgentIdentity',
    params: [nativeAccounts[2]!.address],
  })
  expect(calls[13]!.request).toMatchObject({
    method: 'tos_agentDiscoveryGetSuggestedCard',
    params: [{ address: nativeAccounts[2]!.address, block: toHex(9n) }],
  })
})

test('wallet client exposes agentDiscoveryPublishSuggested', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const publishedInfo = {
    enabled: true,
    profileVersion: 7,
    talkProtocol: 'a2a/1.0',
    primaryIdentity: account.address,
    hasPublishedCard: true,
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_agentDiscoveryPublishSuggested':
        return publishedInfo
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.agentDiscoveryPublishSuggested({
      address: nativeAccounts[1]!.address,
      primaryIdentity: account.address,
      connectionModes: ['https', 'stream'],
      cardSequence: 3,
      blockTag: 11n,
    }),
  ).resolves.toEqual(publishedInfo)

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_agentDiscoveryPublishSuggested',
    params: [
      {
        address: nativeAccounts[1]!.address,
        primaryIdentity: account.address,
        connectionModes: ['https', 'stream'],
        cardSequence: 3,
        block: toHex(11n),
      },
    ],
  })
})

test('public client exposes low-level parity wrappers for headers, code objects, debug, and advanced calls', async () => {
  const codeObject = {
    codeHash: hexBytes('66', 32),
    code: '0x60016001',
    createdAt: toHex(101n),
    expireAt: toHex(202n),
    expired: false,
  }
  const codeObjectMeta = {
    codeHash: hexBytes('66', 32),
    createdAt: toHex(101n),
    expireAt: toHex(202n),
    expired: false,
  }
  const header = {
    hash: hexBytes('77', 32),
    number: toHex(9n),
    parentHash: hexBytes('78', 32),
  }
  const nodeInfo = {
    id: 'node-1',
    name: 'gtos/test',
    enode: 'enode://abc@127.0.0.1:30303',
  }
  const memStats = {
    Alloc: 1234,
    TotalAlloc: 5678,
  }
  const gcStats = {
    NumGC: 9,
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getCodeObject':
        return codeObject
      case 'tos_getCodeObjectMeta':
        return codeObjectMeta
      case 'tos_getHeaderByHash':
      case 'tos_getHeaderByNumber':
        return header
      case 'net_version':
        return '1666'
      case 'tos_getBlockTransactionCountByNumber':
        return toHex(17n)
      case 'tos_call':
        return '0xdeadbeef'
      case 'debug_gcStats':
        return gcStats
      case 'debug_memStats':
        return memStats
      case 'admin_nodeInfo':
        return nodeInfo
      case 'debug_setHead':
        return null
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getCodeObject({ codeHash: hexBytes('66', 32), blockTag: 7n }),
  ).resolves.toEqual({
    codeHash: hexBytes('66', 32),
    code: '0x60016001',
    createdAt: 101n,
    expireAt: 202n,
    expired: false,
  })
  await expect(
    client.getCodeObjectMeta({ codeHash: hexBytes('66', 32), blockTag: 8n }),
  ).resolves.toEqual({
    codeHash: hexBytes('66', 32),
    createdAt: 101n,
    expireAt: 202n,
    expired: false,
  })
  await expect(
    client.getHeaderByHash({ hash: hexBytes('77', 32) }),
  ).resolves.toEqual(header)
  await expect(
    client.getHeaderByNumber({ blockNumber: 9n }),
  ).resolves.toEqual(header)
  await expect(client.getNetworkId()).resolves.toBe(1666n)
  await expect(client.getPendingTransactionCount()).resolves.toBe(17n)
  await expect(
    client.callAtHash({
      request: {
        to: nativeAccounts[1]!.address,
        data: '0x1234',
      },
      blockHash: hexBytes('88', 32),
    }),
  ).resolves.toBe('0xdeadbeef')
  await expect(
    client.pendingCall({
      request: {
        to: nativeAccounts[1]!.address,
        data: '0x5678',
      },
    }),
  ).resolves.toBe('0xdeadbeef')
  await expect(
    client.callWithOverrides({
      request: {
        to: nativeAccounts[1]!.address,
      },
      blockTag: 12n,
      overrides: {
        [nativeAccounts[1]!.address]: {
          nonce: 3n,
          code: '0x6000',
          balance: 99n,
          state: {
            [hexBytes('99', 32)]: hexBytes('aa', 32),
          },
        },
      },
    }),
  ).resolves.toBe('0xdeadbeef')
  await expect(client.getGcStats()).resolves.toEqual(gcStats)
  await expect(client.getMemStats()).resolves.toEqual(memStats)
  await expect(client.getNodeInfo()).resolves.toEqual(nodeInfo)
  await expect(client.setHead({ blockNumber: 15n })).resolves.toBeUndefined()

  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getCodeObject',
    params: [hexBytes('66', 32), toHex(7n)],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_getCodeObjectMeta',
    params: [hexBytes('66', 32), toHex(8n)],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_getHeaderByHash',
    params: [hexBytes('77', 32)],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_getHeaderByNumber',
    params: [toHex(9n)],
  })
  expect(calls[4]!.request).toMatchObject({
    method: 'net_version',
    params: [],
  })
  expect(calls[5]!.request).toMatchObject({
    method: 'tos_getBlockTransactionCountByNumber',
    params: ['pending'],
  })
  expect(calls[6]!.request).toMatchObject({
    method: 'tos_call',
    params: [
      { to: nativeAccounts[1]!.address, data: '0x1234' },
      { blockHash: hexBytes('88', 32), requireCanonical: false },
    ],
  })
  expect(calls[7]!.request).toMatchObject({
    method: 'tos_call',
    params: [{ to: nativeAccounts[1]!.address, data: '0x5678' }, 'pending'],
  })
  expect(calls[8]!.request).toMatchObject({
    method: 'tos_call',
  })
  expect(calls[8]!.request.params[1]).toBe(toHex(12n))
  expect(calls[8]!.request.params[2]).toMatchObject({
    [nativeAccounts[1]!.address]: {
      nonce: toHex(3n),
      code: '0x6000',
      balance: toHex(99n),
      state: {
        [hexBytes('99', 32)]: hexBytes('aa', 32),
      },
    },
  })
  expect(calls[9]!.request).toMatchObject({ method: 'debug_gcStats', params: [] })
  expect(calls[10]!.request).toMatchObject({ method: 'debug_memStats', params: [] })
  expect(calls[11]!.request).toMatchObject({ method: 'admin_nodeInfo', params: [] })
  expect(calls[12]!.request).toMatchObject({
    method: 'debug_setHead',
    params: [toHex(15n)],
  })
})

test('public client exposes DPoS methods: getSnapshot, getValidators, getValidator, getEpochInfo', async () => {
  const snapshotResponse = {
    number: toHex(100n),
    hash: '0xaabbccdd',
    validators: [nativeAccounts[0]!.address, nativeAccounts[1]!.address],
    validatorsMap: {
      [nativeAccounts[0]!.address]: {},
      [nativeAccounts[1]!.address]: {},
    },
    recents: { '99': nativeAccounts[0]!.address },
    genesisTime: toHex(1700000000n),
    periodMs: toHex(3000n),
    finalizedNumber: toHex(95n),
    finalizedHash: '0x11223344',
  }
  const validatorsResponse = [
    nativeAccounts[0]!.address,
    nativeAccounts[1]!.address,
  ]
  const validatorInfoResponse = {
    address: nativeAccounts[0]!.address,
    active: true,
    index: 0,
    snapshotBlock: toHex(100n),
    snapshotHash: '0xaabbccdd',
    recentSignedSlots: [toHex(98n), toHex(99n)],
  }
  const epochInfoResponse = {
    blockNumber: toHex(100n),
    epochLength: toHex(200n),
    epochIndex: toHex(5n),
    epochStart: toHex(1000n),
    nextEpochStart: toHex(1200n),
    blocksUntilEpoch: toHex(100n),
    targetBlockPeriodMs: toHex(3000n),
    turnLength: toHex(3n),
    turnGroupDurationMs: toHex(9000n),
    recentSignerWindow: toHex(21n),
    maxValidators: toHex(21n),
    validatorCount: toHex(2n),
    snapshotHash: '0xaabbccdd',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'dpos_getSnapshot':
        return snapshotResponse
      case 'dpos_getValidators':
        return validatorsResponse
      case 'dpos_getValidator':
        return validatorInfoResponse
      case 'dpos_getEpochInfo':
        return epochInfoResponse
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // getSnapshot with explicit block number
  await expect(
    client.getSnapshot({ blockTag: 100n }),
  ).resolves.toEqual(snapshotResponse)

  // getValidators with default blockTag
  await expect(
    client.getValidators(),
  ).resolves.toEqual(validatorsResponse)

  // getValidator with address and explicit block number
  await expect(
    client.getValidator({
      address: nativeAccounts[0]!.address,
      blockTag: 100n,
    }),
  ).resolves.toEqual(validatorInfoResponse)

  // getEpochInfo with explicit block number
  await expect(
    client.getEpochInfo({ blockTag: 100n }),
  ).resolves.toEqual(epochInfoResponse)

  // Verify RPC payloads
  expect(calls[0]!.request).toMatchObject({
    method: 'dpos_getSnapshot',
    params: [toHex(100n)],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'dpos_getValidators',
    params: ['latest'],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'dpos_getValidator',
    params: [nativeAccounts[0]!.address, toHex(100n)],
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'dpos_getEpochInfo',
    params: [toHex(100n)],
  })
})

test('DPoS methods use default blockTag when called with no arguments', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'dpos_getSnapshot':
        return {
          number: toHex(50n),
          hash: '0x1111',
          validators: [],
          validatorsMap: {},
          recents: {},
          genesisTime: toHex(0n),
          periodMs: toHex(3000n),
        }
      case 'dpos_getValidators':
        return []
      case 'dpos_getEpochInfo':
        return {
          blockNumber: toHex(50n),
          epochLength: toHex(200n),
          epochIndex: toHex(0n),
          epochStart: toHex(0n),
          nextEpochStart: toHex(200n),
          blocksUntilEpoch: toHex(150n),
          targetBlockPeriodMs: toHex(3000n),
          turnLength: toHex(3n),
          turnGroupDurationMs: toHex(9000n),
          recentSignerWindow: toHex(21n),
          maxValidators: toHex(21n),
          validatorCount: toHex(0n),
          snapshotHash: '0x1111',
        }
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await client.getSnapshot()
  await client.getValidators()
  await client.getEpochInfo()

  expect(calls[0]!.request).toMatchObject({
    method: 'dpos_getSnapshot',
    params: ['latest'],
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'dpos_getValidators',
    params: ['latest'],
  })
  expect(calls[2]!.request).toMatchObject({
    method: 'dpos_getEpochInfo',
    params: ['latest'],
  })
})

// ---------------------------------------------------------------------------
// Filter System
// ---------------------------------------------------------------------------

test('public client filter system: newBlockFilter, newPendingTransactionFilter, newFilter, getFilterChanges, getFilterLogs, uninstallFilter', async () => {
  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_newBlockFilter':
        return '0xf1'
      case 'tos_newPendingTransactionFilter':
        return '0xf2'
      case 'tos_newFilter':
        return '0xf3'
      case 'tos_getFilterChanges': {
        const id = (request.params as string[])[0]
        if (id === '0xf1') return ['0xblockhash1', '0xblockhash2']
        if (id === '0xf3')
          return [
            {
              address: nativeAccounts[1]!.address,
              data: '0xaa',
              topics: ['0x2222'],
            },
          ]
        return []
      }
      case 'tos_getFilterLogs':
        return [
          {
            address: nativeAccounts[1]!.address,
            data: '0xbb',
            topics: ['0x3333'],
          },
        ]
      case 'tos_uninstallFilter':
        return true
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // newBlockFilter
  await expect(client.newBlockFilter()).resolves.toBe('0xf1')
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_newBlockFilter',
    params: [],
  })

  // newPendingTransactionFilter
  await expect(client.newPendingTransactionFilter()).resolves.toBe('0xf2')
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_newPendingTransactionFilter',
    params: [],
  })

  // newFilter with address, topics, and block range
  await expect(
    client.newFilter({
      address: nativeAccounts[1]!.address,
      topics: ['0x2222'],
      fromBlock: 10n,
      toBlock: 50n,
    }),
  ).resolves.toBe('0xf3')
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_newFilter',
    params: [
      {
        address: nativeAccounts[1]!.address,
        topics: ['0x2222'],
        fromBlock: '0xa',
        toBlock: '0x32',
      },
    ],
  })

  // getFilterChanges for block filter returns hex hashes
  await expect(
    client.getFilterChanges({ filterId: '0xf1' }),
  ).resolves.toEqual(['0xblockhash1', '0xblockhash2'])
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_getFilterChanges',
    params: ['0xf1'],
  })

  // getFilterChanges for log filter returns logs
  await expect(
    client.getFilterChanges({ filterId: '0xf3' }),
  ).resolves.toEqual([
    {
      address: nativeAccounts[1]!.address,
      data: '0xaa',
      topics: ['0x2222'],
    },
  ])

  // getFilterLogs
  await expect(
    client.getFilterLogs({ filterId: '0xf3' }),
  ).resolves.toEqual([
    {
      address: nativeAccounts[1]!.address,
      data: '0xbb',
      topics: ['0x3333'],
    },
  ])
  expect(calls[5]!.request).toMatchObject({
    method: 'tos_getFilterLogs',
    params: ['0xf3'],
  })

  // uninstallFilter
  await expect(
    client.uninstallFilter({ filterId: '0xf1' }),
  ).resolves.toBe(true)
  expect(calls[6]!.request).toMatchObject({
    method: 'tos_uninstallFilter',
    params: ['0xf1'],
  })
})

// ---------------------------------------------------------------------------
// Chain State queries
// ---------------------------------------------------------------------------

test('public client chain state: getChainProfile, getFinalizedBlock, getRetentionPolicy, getPruneWatermark, getAccount', async () => {
  const chainProfile = {
    chainId: toHex(999n),
    networkId: toHex(999n),
    targetBlockIntervalMs: toHex(3000n),
    retainBlocks: toHex(1000n),
    snapshotInterval: toHex(128n),
  }
  const finalizedBlock = {
    number: toHex(50n),
    hash: '0xfinalized',
    timestamp: toHex(1700000000n),
    validatorSetHash: '0xvshash',
  }
  const retentionPolicy = {
    retainBlocks: toHex(1000n),
    snapshotInterval: toHex(128n),
    headBlock: toHex(100n),
    oldestAvailableBlock: toHex(1n),
  }
  const pruneWatermark = {
    headBlock: toHex(100n),
    oldestAvailableBlock: toHex(1n),
    retainBlocks: toHex(1000n),
  }
  const accountState = {
    address: nativeAccounts[0]!.address,
    nonce: toHex(7n),
    balance: toHex(42n),
    signer: {
      type: 'secp256k1',
      value: nativeAccounts[0]!.address,
      defaulted: true,
    },
    blockNumber: toHex(99n),
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getChainProfile':
        return chainProfile
      case 'tos_getFinalizedBlock':
        return finalizedBlock
      case 'tos_getRetentionPolicy':
        return retentionPolicy
      case 'tos_getPruneWatermark':
        return pruneWatermark
      case 'tos_getAccount':
        return accountState
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // getChainProfile
  await expect(client.getChainProfile()).resolves.toEqual(chainProfile)
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getChainProfile',
    params: [],
  })

  // getFinalizedBlock
  await expect(client.getFinalizedBlock()).resolves.toEqual(finalizedBlock)
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_getFinalizedBlock',
    params: [],
  })

  // getRetentionPolicy
  await expect(client.getRetentionPolicy()).resolves.toEqual(retentionPolicy)
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_getRetentionPolicy',
    params: [],
  })

  // getPruneWatermark
  await expect(client.getPruneWatermark()).resolves.toEqual(pruneWatermark)
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_getPruneWatermark',
    params: [],
  })

  // getAccount
  await expect(
    client.getAccount({ address: nativeAccounts[0]!.address }),
  ).resolves.toEqual(accountState)
  expect(calls[4]!.request).toMatchObject({
    method: 'tos_getAccount',
    params: [nativeAccounts[0]!.address, 'latest'],
  })
})

test('public client getFinalizedBlock returns null when no finalized block', async () => {
  const { fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getFinalizedBlock':
        return null
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(client.getFinalizedBlock()).resolves.toBeNull()
})

// ---------------------------------------------------------------------------
// Malicious Vote Evidence (PublicClient)
// ---------------------------------------------------------------------------

test('public client malicious vote evidence: getMaliciousVoteEvidence, listMaliciousVoteEvidence', async () => {
  const evidenceRecord = {
    evidenceHash: '0xevhash1',
    offenseKey: '0xoffense1',
    number: toHex(42n),
    signer: nativeAccounts[1]!.address,
    submittedBy: nativeAccounts[0]!.address,
    submittedAt: toHex(1700000000n),
    status: 'confirmed',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getMaliciousVoteEvidence':
        return evidenceRecord
      case 'tos_listMaliciousVoteEvidence':
        return [evidenceRecord]
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // getMaliciousVoteEvidence
  await expect(
    client.getMaliciousVoteEvidence({ hash: '0xevhash1' }),
  ).resolves.toEqual(evidenceRecord)
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_getMaliciousVoteEvidence',
    params: ['0xevhash1', 'latest'],
  })

  // listMaliciousVoteEvidence with defaults
  await expect(
    client.listMaliciousVoteEvidence(),
  ).resolves.toEqual([evidenceRecord])
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_listMaliciousVoteEvidence',
    params: [toHex(100n), 'latest'],
  })

  // listMaliciousVoteEvidence with explicit count and blockTag
  await expect(
    client.listMaliciousVoteEvidence({ count: 10, blockTag: '0x32' }),
  ).resolves.toEqual([evidenceRecord])
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_listMaliciousVoteEvidence',
    params: [toHex(10n), '0x32'],
  })
})

test('public client getMaliciousVoteEvidence returns null for unknown hash', async () => {
  const { fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_getMaliciousVoteEvidence':
        return null
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  await expect(
    client.getMaliciousVoteEvidence({ hash: '0xunknown' }),
  ).resolves.toBeNull()
})

// ---------------------------------------------------------------------------
// Validator Maintenance (WalletClient)
// ---------------------------------------------------------------------------

test('wallet client validator maintenance: enterMaintenance, buildEnterMaintenanceTx, exitMaintenance, buildExitMaintenanceTx', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const builtEnterTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(5n),
      gas: toHex(100_000n),
      value: toHex(0n),
      input: '0xenter1',
    },
    raw: '0xrawenter',
  }
  const builtExitTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(6n),
      gas: toHex(100_000n),
      value: toHex(0n),
      input: '0xexit1',
    },
    raw: '0xrawexit',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_enterMaintenance':
        return '0xtxhash_enter'
      case 'tos_buildEnterMaintenanceTx':
        return builtEnterTx
      case 'tos_exitMaintenance':
        return '0xtxhash_exit'
      case 'tos_buildExitMaintenanceTx':
        return builtExitTx
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // enterMaintenance
  await expect(
    client.enterMaintenance({ from: account.address, nonce: 5n, gas: 100_000n }),
  ).resolves.toBe('0xtxhash_enter')
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_enterMaintenance',
    params: [{
      from: account.address,
      nonce: toHex(5n),
      gas: toHex(100_000n),
    }],
  })

  // buildEnterMaintenanceTx
  await expect(
    client.buildEnterMaintenanceTx({ from: account.address, nonce: 5n, gas: 100_000n }),
  ).resolves.toEqual({
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: 5n,
      gas: 100_000n,
      value: 0n,
      input: '0xenter1',
    },
    raw: '0xrawenter',
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_buildEnterMaintenanceTx',
    params: [{
      from: account.address,
      nonce: toHex(5n),
      gas: toHex(100_000n),
    }],
  })

  // exitMaintenance
  await expect(
    client.exitMaintenance({ from: account.address, nonce: 6n, gas: 100_000n }),
  ).resolves.toBe('0xtxhash_exit')
  expect(calls[2]!.request).toMatchObject({
    method: 'tos_exitMaintenance',
    params: [{
      from: account.address,
      nonce: toHex(6n),
      gas: toHex(100_000n),
    }],
  })

  // buildExitMaintenanceTx
  await expect(
    client.buildExitMaintenanceTx({ from: account.address, nonce: 6n, gas: 100_000n }),
  ).resolves.toEqual({
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: 6n,
      gas: 100_000n,
      value: 0n,
      input: '0xexit1',
    },
    raw: '0xrawexit',
  })
  expect(calls[3]!.request).toMatchObject({
    method: 'tos_buildExitMaintenanceTx',
    params: [{
      from: account.address,
      nonce: toHex(6n),
      gas: toHex(100_000n),
    }],
  })
})

test('wallet client submitMaliciousVoteEvidence and buildSubmitMaliciousVoteEvidenceTx', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const evidence = {
    version: '1',
    kind: 'equivocation',
    chainId: toHex(999n),
    number: toHex(42n),
    signer: nativeAccounts[1]!.address,
    signerType: 'secp256k1',
    signerPubKey: '0xpubkey1',
    first: { hash: '0xvote1' },
    second: { hash: '0xvote2' },
  } as const
  const builtTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(7n),
      gas: toHex(200_000n),
      value: toHex(0n),
      input: '0xevidence1',
    },
    raw: '0xrawevidence',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_submitMaliciousVoteEvidence':
        return '0xtxhash_evidence'
      case 'tos_buildSubmitMaliciousVoteEvidenceTx':
        return builtTx
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // submitMaliciousVoteEvidence
  await expect(
    client.submitMaliciousVoteEvidence({
      from: account.address,
      nonce: 7n,
      gas: 200_000n,
      evidence,
    }),
  ).resolves.toBe('0xtxhash_evidence')
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_submitMaliciousVoteEvidence',
    params: [{
      from: account.address,
      nonce: toHex(7n),
      gas: toHex(200_000n),
      evidence,
    }],
  })

  // buildSubmitMaliciousVoteEvidenceTx
  await expect(
    client.buildSubmitMaliciousVoteEvidenceTx({
      from: account.address,
      nonce: 7n,
      gas: 200_000n,
      evidence,
    }),
  ).resolves.toEqual({
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: 7n,
      gas: 200_000n,
      value: 0n,
      input: '0xevidence1',
    },
    raw: '0xrawevidence',
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_buildSubmitMaliciousVoteEvidenceTx',
    params: [{
      from: account.address,
      nonce: toHex(7n),
      gas: toHex(200_000n),
      evidence,
    }],
  })
})

// ---------------------------------------------------------------------------
// Signer Management (WalletClient)
// ---------------------------------------------------------------------------

test('wallet client signer management: setSigner, buildSetSignerTx', async () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  const builtTx = {
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: toHex(10n),
      gas: toHex(80_000n),
      value: toHex(0n),
      input: '0xsetsigner1',
    },
    raw: '0xrawsetsigner',
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'tos_setSigner':
        return '0xtxhash_setsigner'
      case 'tos_buildSetSignerTx':
        return builtTx
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createWalletClient({
    account,
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // setSigner
  await expect(
    client.setSigner({
      from: account.address,
      nonce: 10n,
      gas: 80_000n,
      signerType: 'ed25519',
      signerValue: '0x1111111111111111111111111111111111111111111111111111111111111111',
    }),
  ).resolves.toBe('0xtxhash_setsigner')
  expect(calls[0]!.request).toMatchObject({
    method: 'tos_setSigner',
    params: [{
      from: account.address,
      nonce: toHex(10n),
      gas: toHex(80_000n),
      signerType: 'ed25519',
      signerValue: '0x1111111111111111111111111111111111111111111111111111111111111111',
    }],
  })

  // buildSetSignerTx
  await expect(
    client.buildSetSignerTx({
      from: account.address,
      nonce: 10n,
      gas: 80_000n,
      signerType: 'ed25519',
      signerValue: '0x1111111111111111111111111111111111111111111111111111111111111111',
    }),
  ).resolves.toEqual({
    tx: {
      from: account.address,
      to: systemActionAddress,
      nonce: 10n,
      gas: 80_000n,
      value: 0n,
      input: '0xsetsigner1',
    },
    raw: '0xrawsetsigner',
  })
  expect(calls[1]!.request).toMatchObject({
    method: 'tos_buildSetSignerTx',
    params: [{
      from: account.address,
      nonce: toHex(10n),
      gas: toHex(80_000n),
      signerType: 'ed25519',
      signerValue: '0x1111111111111111111111111111111111111111111111111111111111111111',
    }],
  })
})

// ---------------------------------------------------------------------------
// TxPool
// ---------------------------------------------------------------------------

test('public client txpool: txpoolContent, txpoolContentFrom, txpoolStatus, txpoolInspect', async () => {
  const sampleTx = {
    hash: '0xtxhash1',
    from: nativeAccounts[0]!.address,
    to: nativeAccounts[1]!.address,
    value: toHex(100n),
  }
  const txpoolContentResult = {
    pending: {
      [nativeAccounts[0]!.address]: {
        '0': sampleTx,
      },
    },
    queued: {},
  }
  const txpoolContentFromResult = {
    pending: { '0': sampleTx },
    queued: {},
  }
  const txpoolStatusResult = {
    pending: 5,
    queued: 2,
  }
  const txpoolInspectResult = {
    pending: {
      [nativeAccounts[0]!.address]: {
        '0': `${nativeAccounts[1]!.address}: 100 tomi + 21000 gas`,
      },
    },
    queued: {},
  }

  const { calls, fetchFn } = createJsonRpcFetch((request) => {
    switch (request.method) {
      case 'txpool_content':
        return txpoolContentResult
      case 'txpool_contentFrom':
        return txpoolContentFromResult
      case 'txpool_status':
        return txpoolStatusResult
      case 'txpool_inspect':
        return txpoolInspectResult
      default:
        throw new Error(`Unexpected method: ${request.method}`)
    }
  })

  const client = createPublicClient({
    chain: tosTestnet,
    transport: http(undefined, { fetchFn }),
  })

  // txpoolContent
  await expect(client.txpoolContent()).resolves.toEqual(txpoolContentResult)
  expect(calls[0]!.request).toMatchObject({
    method: 'txpool_content',
    params: [],
  })

  // txpoolContentFrom
  await expect(
    client.txpoolContentFrom({ address: nativeAccounts[0]!.address }),
  ).resolves.toEqual(txpoolContentFromResult)
  expect(calls[1]!.request).toMatchObject({
    method: 'txpool_contentFrom',
    params: [nativeAccounts[0]!.address],
  })

  // txpoolStatus
  await expect(client.txpoolStatus()).resolves.toEqual(txpoolStatusResult)
  expect(calls[2]!.request).toMatchObject({
    method: 'txpool_status',
    params: [],
  })

  // txpoolInspect
  await expect(client.txpoolInspect()).resolves.toEqual(txpoolInspectResult)
  expect(calls[3]!.request).toMatchObject({
    method: 'txpool_inspect',
    params: [],
  })
})
