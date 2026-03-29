import type { ErrorType } from '../errors/utils.js'
import type {
  AgentDiscoveryInfo,
  AgentPublishParams,
} from '../types/agent.js'
import type {
  BlockTag,
  DeployPackageParameters,
  SendPackageTransactionParameters,
  SetSignerMetadataParameters,
  SendSystemActionParameters,
  SetSignerRpcParameters,
  SignTransactionParameters,
  SubmitMaliciousVoteEvidenceParameters,
  ValidatorMaintenanceParameters,
  WalletClient,
  WalletClientConfig,
} from '../types/client.js'
import type {
  BuiltTransactionResult,
  LeaseDeployResult,
  WalletLeaseCloseParameters,
  WalletLeaseDeployParameters,
  WalletLeaseRenewParameters,
} from '../types/lease.js'
import type { Address } from '../types/address.js'
import type { Hex, Signature } from '../types/misc.js'
import type { TransactionSerializableNative } from '../types/transaction.js'
import type { LocalAccount } from '../accounts/types.js'
import { toHex, numberToHex, type ToHexErrorType } from '../utils/encoding/toHex.js'
import { encodePackageCallData } from '../utils/contract/encodePackageCallData.js'
import { encodePackageDeployData } from '../utils/contract/encodePackageDeployData.js'
import { serializeTransaction } from '../utils/transaction/serializeTransaction.js'
import { createPublicClient, type CreatePublicClientErrorType } from './createPublicClient.js'
import { getAddress, type GetAddressErrorType } from '../utils/address/getAddress.js'

export type CreateWalletClientErrorType =
  | CreatePublicClientErrorType
  | GetAddressErrorType
  | ToHexErrorType
  | ErrorType

export const systemActionAddress =
  '0x0000000000000000000000000000000000000000000000000000000000000001' as Address

export function createWalletClient(config: WalletClientConfig): WalletClient {
  const publicClient = createPublicClient(config)

  const sendRawTransaction = ({ serializedTransaction }: { serializedTransaction: Hex }) =>
    publicClient.request<Hex>('tos_sendRawTransaction', [serializedTransaction])

  const resolveAccount = (
    account: LocalAccount | undefined,
  ): LocalAccount => account ?? config.account

  const buildTransaction = async ({
    account = config.account,
    chainId,
    nonce,
    gas = 21_000n,
    to,
    value = 0n,
    data = '0x',
    from,
    signerType,
    sponsor,
    sponsorSignerType,
    sponsorNonce,
    sponsorExpiry,
    sponsorPolicyHash,
    // Phase 0.3: encrypted transfer fields
    commitment,
    senderHandle,
    receiverHandle,
    sourceCommitment,
    ctValidityProof,
    commitmentEqProof,
    rangeProof,
    auditorHandle,
    encryptedMemo,
  }: SignTransactionParameters): Promise<TransactionSerializableNative> => {
    const resolvedAccount = resolveAccount(account)
    const resolvedSignerType = signerType ?? resolvedAccount.signerType ?? 'secp256k1'
    const resolvedFrom = getAddress(from ?? resolvedAccount.address)
    const needsSponsorNonce = typeof sponsor !== 'undefined' && typeof sponsorNonce === 'undefined'
    const [resolvedChainId, resolvedNonce, resolvedSponsorNonce] = await Promise.all([
      typeof chainId === 'undefined' ? publicClient.getChainId() : BigInt(chainId),
      typeof nonce === 'undefined'
        ? publicClient.getTransactionCount({
            address: resolvedFrom,
            blockTag: 'pending',
          })
        : BigInt(nonce),
      needsSponsorNonce
        ? publicClient.getSponsorNonce({
            address: getAddress(sponsor!),
            blockTag: 'pending',
          })
        : typeof sponsorNonce === 'undefined'
          ? Promise.resolve(undefined)
          : Promise.resolve(BigInt(sponsorNonce)),
    ])

    return {
      chainId: resolvedChainId,
      data,
      from: resolvedFrom,
      gas: BigInt(gas),
      nonce: resolvedNonce,
      signerType: resolvedSignerType,
      ...(typeof sponsor !== 'undefined'
        ? {
            sponsor: getAddress(sponsor),
            sponsorSignerType: sponsorSignerType ?? 'secp256k1',
            sponsorNonce: resolvedSponsorNonce!,
            sponsorExpiry: BigInt(sponsorExpiry!),
            sponsorPolicyHash: sponsorPolicyHash!,
          }
        : {}),
      ...(typeof to !== 'undefined' && to !== null ? { to: getAddress(to) } : {}),
      value: BigInt(value),
      // Phase 0.3: pass through encrypted transfer fields
      ...(commitment ? { commitment } : {}),
      ...(senderHandle ? { senderHandle } : {}),
      ...(receiverHandle ? { receiverHandle } : {}),
      ...(sourceCommitment ? { sourceCommitment } : {}),
      ...(ctValidityProof ? { ctValidityProof } : {}),
      ...(commitmentEqProof ? { commitmentEqProof } : {}),
      ...(rangeProof ? { rangeProof } : {}),
      ...(auditorHandle ? { auditorHandle } : {}),
      ...(encryptedMemo ? { encryptedMemo } : {}),
    }
  }

  const signAuthorization = async (
    parameters: SignTransactionParameters,
  ): Promise<Signature> => {
    const account = resolveAccount(parameters.account)
    return account.signAuthorization(await buildTransaction(parameters))
  }

  const assembleTransaction = async ({
    executionSignature,
    sponsorSignature,
    ...parameters
  }: SignTransactionParameters & {
    executionSignature: Signature
    sponsorSignature?: Signature | undefined
  }): Promise<Hex> => {
    const transaction = await buildTransaction(parameters)
    return serializeTransaction(transaction, {
      execution: executionSignature,
      sponsor: sponsorSignature,
    })
  }

  const signTransaction = async (
    parameters: SignTransactionParameters,
  ): Promise<Hex> => {
    const transaction = await buildTransaction(parameters)
    const executionSignature = await resolveAccount(parameters.account)
      .signAuthorization(transaction)
    if (transaction.sponsor && !parameters.sponsorSignature) {
      throw new Error(
        'Sponsored native transactions require `sponsorSignature` to assemble the final envelope.',
      )
    }
    return serializeTransaction(transaction, {
      execution: executionSignature,
      sponsor: parameters.sponsorSignature,
    })
  }

  const sendTransaction = async (parameters: SignTransactionParameters) => {
    const serializedTransaction = await signTransaction(parameters)
    return sendRawTransaction({ serializedTransaction })
  }

  const sendBuiltTransaction = async ({
    account = config.account,
    built,
  }: {
    account?: LocalAccount | undefined
    built: BuiltTransactionResult
  }) =>
    sendTransaction({
      account,
      data: built.tx.input,
      from: built.tx.from,
      gas: built.tx.gas,
      nonce: built.tx.nonce,
      to: built.tx.to,
      value: built.tx.value,
    })

  const sendPackageTransaction = async ({
    packageName,
    functionSignature,
    args = [],
    ...rest
  }: SendPackageTransactionParameters) =>
    sendTransaction({
      ...rest,
      data: encodePackageCallData({
        packageName,
        functionSignature,
        args,
      }),
    })

  const deployPackage = async ({
    packageBinary,
    constructorArgs = [],
    ...rest
  }: DeployPackageParameters) =>
    sendTransaction({
      ...rest,
      to: undefined,
      data: encodePackageDeployData({
        packageBinary,
        constructorArgs,
      }),
    })

  const leaseDeploy = async ({
    account = config.account,
    from,
    ...rest
  }: WalletLeaseDeployParameters): Promise<LeaseDeployResult> => {
    const resolvedAccount = resolveAccount(account)
    const built = await publicClient.buildLeaseDeployTx({
      from: getAddress(from ?? resolvedAccount.address),
      ...rest,
    })
    const txHash = await sendBuiltTransaction({ account: resolvedAccount, built })
    if (!built.contractAddress) {
      throw new Error('Lease deploy builder did not return a contract address.')
    }
    return {
      txHash,
      contractAddress: built.contractAddress,
    }
  }

  const leaseRenew = async ({
    account = config.account,
    from,
    ...rest
  }: WalletLeaseRenewParameters) => {
    const resolvedAccount = resolveAccount(account)
    const built = await publicClient.buildLeaseRenewTx({
      from: getAddress(from ?? resolvedAccount.address),
      ...rest,
    })
    return sendBuiltTransaction({ account: resolvedAccount, built })
  }

  const leaseClose = async ({
    account = config.account,
    from,
    ...rest
  }: WalletLeaseCloseParameters) => {
    const resolvedAccount = resolveAccount(account)
    const built = await publicClient.buildLeaseCloseTx({
      from: getAddress(from ?? resolvedAccount.address),
      ...rest,
    })
    return sendBuiltTransaction({ account: resolvedAccount, built })
  }

  const sendSystemAction = async ({
    account = config.account,
    action,
    payload,
    gas = 120_000n,
    value = 0n,
  }: SendSystemActionParameters) =>
    sendTransaction({
      account,
      data: encodeSystemActionData({ action, payload }),
      gas,
      to: systemActionAddress,
      value,
    })

  const setSignerMetadata = async ({
    account = config.account,
    signerType,
    signerValue,
    gas = 120_000n,
  }: SetSignerMetadataParameters) =>
    sendSystemAction({
      account,
      action: 'ACCOUNT_SET_SIGNER',
      payload: {
        signerType,
        signerValue,
      },
      gas,
      value: 0n,
    })

  const agentDiscoveryPublish = async ({
    primaryIdentity,
    capabilities,
    connectionModes,
    cardJson,
    cardSequence,
  }: AgentPublishParams): Promise<AgentDiscoveryInfo> =>
    publicClient.request<AgentDiscoveryInfo>('tos_agentDiscoveryPublish', [
      {
        primaryIdentity: getAddress(primaryIdentity),
        capabilities: [...capabilities],
        ...(typeof connectionModes !== 'undefined'
          ? { connectionModes: [...connectionModes] }
          : {}),
        ...(typeof cardJson !== 'undefined' ? { cardJson } : {}),
        ...(typeof cardSequence !== 'undefined' ? { cardSequence } : {}),
      },
    ])

  const agentDiscoveryClear = async (): Promise<AgentDiscoveryInfo> =>
    publicClient.request<AgentDiscoveryInfo>('tos_agentDiscoveryClear')

  const agentDiscoveryPublishSuggested = async ({
    address,
    primaryIdentity,
    connectionModes,
    cardSequence,
    blockTag,
  }: {
    address: Address
    primaryIdentity: Address
    connectionModes?: readonly string[] | undefined
    cardSequence?: number | undefined
    blockTag?: BlockTag | number | bigint | undefined
  }): Promise<AgentDiscoveryInfo> =>
    publicClient.request<AgentDiscoveryInfo>('tos_agentDiscoveryPublishSuggested', [
      {
        address: getAddress(address),
        primaryIdentity: getAddress(primaryIdentity),
        ...(typeof connectionModes !== 'undefined'
          ? { connectionModes: [...connectionModes] }
          : {}),
        ...(typeof cardSequence !== 'undefined' ? { cardSequence } : {}),
        ...(typeof blockTag !== 'undefined'
          ? { block: typeof blockTag === 'number' || typeof blockTag === 'bigint' ? numberToHex(blockTag) : blockTag }
          : {}),
      },
    ])

  const serializeMaintenanceArgs = (parameters: ValidatorMaintenanceParameters) => ({
    from: getAddress(parameters.from),
    ...(typeof parameters.nonce !== 'undefined'
      ? { nonce: numberToHex(parameters.nonce) }
      : {}),
    ...(typeof parameters.gas !== 'undefined'
      ? { gas: numberToHex(parameters.gas) }
      : {}),
  })

  const enterMaintenance = async (parameters: ValidatorMaintenanceParameters): Promise<Hex> =>
    publicClient.request<Hex>('tos_enterMaintenance', [
      serializeMaintenanceArgs(parameters),
    ])

  const buildEnterMaintenanceTx = async (
    parameters: ValidatorMaintenanceParameters,
  ): Promise<BuiltTransactionResult> =>
    parseBuiltTxResult(
      await publicClient.request<RpcBuiltTxResult>('tos_buildEnterMaintenanceTx', [
        serializeMaintenanceArgs(parameters),
      ]),
    )

  const exitMaintenance = async (parameters: ValidatorMaintenanceParameters): Promise<Hex> =>
    publicClient.request<Hex>('tos_exitMaintenance', [
      serializeMaintenanceArgs(parameters),
    ])

  const buildExitMaintenanceTx = async (
    parameters: ValidatorMaintenanceParameters,
  ): Promise<BuiltTransactionResult> =>
    parseBuiltTxResult(
      await publicClient.request<RpcBuiltTxResult>('tos_buildExitMaintenanceTx', [
        serializeMaintenanceArgs(parameters),
      ]),
    )

  const serializeEvidenceArgs = (parameters: SubmitMaliciousVoteEvidenceParameters) => ({
    from: getAddress(parameters.from),
    ...(typeof parameters.nonce !== 'undefined'
      ? { nonce: numberToHex(parameters.nonce) }
      : {}),
    ...(typeof parameters.gas !== 'undefined'
      ? { gas: numberToHex(parameters.gas) }
      : {}),
    evidence: parameters.evidence,
  })

  const submitMaliciousVoteEvidence = async (
    parameters: SubmitMaliciousVoteEvidenceParameters,
  ): Promise<Hex> =>
    publicClient.request<Hex>('tos_submitMaliciousVoteEvidence', [
      serializeEvidenceArgs(parameters),
    ])

  const buildSubmitMaliciousVoteEvidenceTx = async (
    parameters: SubmitMaliciousVoteEvidenceParameters,
  ): Promise<BuiltTransactionResult> =>
    parseBuiltTxResult(
      await publicClient.request<RpcBuiltTxResult>('tos_buildSubmitMaliciousVoteEvidenceTx', [
        serializeEvidenceArgs(parameters),
      ]),
    )

  const serializeSetSignerArgs = (parameters: SetSignerRpcParameters) => ({
    from: getAddress(parameters.from),
    ...(typeof parameters.nonce !== 'undefined'
      ? { nonce: numberToHex(parameters.nonce) }
      : {}),
    ...(typeof parameters.gas !== 'undefined'
      ? { gas: numberToHex(parameters.gas) }
      : {}),
    signerType: parameters.signerType,
    signerValue: parameters.signerValue,
  })

  const setSigner = async (parameters: SetSignerRpcParameters): Promise<Hex> =>
    publicClient.request<Hex>('tos_setSigner', [
      serializeSetSignerArgs(parameters),
    ])

  const buildSetSignerTx = async (
    parameters: SetSignerRpcParameters,
  ): Promise<BuiltTransactionResult> =>
    parseBuiltTxResult(
      await publicClient.request<RpcBuiltTxResult>('tos_buildSetSignerTx', [
        serializeSetSignerArgs(parameters),
      ]),
    )

  return {
    ...publicClient,
    account: config.account,
    assembleTransaction,
    signAuthorization,
    signTransaction,
    sendRawTransaction,
    sendTransaction,
    sendPackageTransaction,
    deployPackage,
    leaseDeploy,
    leaseRenew,
    leaseClose,
    sendSystemAction,
    setSignerMetadata,
    agentDiscoveryPublish,
    agentDiscoveryPublishSuggested,
    agentDiscoveryClear,
    enterMaintenance,
    buildEnterMaintenanceTx,
    exitMaintenance,
    buildExitMaintenanceTx,
    submitMaliciousVoteEvidence,
    buildSubmitMaliciousVoteEvidenceTx,
    setSigner,
    buildSetSignerTx,
  }
}

type RpcBuiltTxResult = {
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

function parseBuiltTxResult(result: RpcBuiltTxResult): BuiltTransactionResult {
  return {
    tx: {
      from: getAddress(result.tx.from),
      to: getAddress(result.tx.to),
      nonce: BigInt(result.tx.nonce),
      gas: BigInt(result.tx.gas),
      value: BigInt(result.tx.value),
      input: result.tx.input,
    },
    raw: result.raw,
    ...(result.contractAddress
      ? { contractAddress: getAddress(result.contractAddress) }
      : {}),
  }
}

export function encodeSystemActionData({
  action,
  payload,
}: {
  action: string
  payload?: Record<string, unknown> | undefined
}): Hex {
  return toHex(
    JSON.stringify({
      action,
      ...(payload ? { payload } : {}),
    }),
  )
}
