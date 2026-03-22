import type { Address } from './address.js'
import type { Hex } from './misc.js'

export type SettlementKind = 'bounty' | 'observation' | 'oracle'

export type SettlementReceipt = {
  version: 1
  receiptId: string
  kind: SettlementKind
  subjectId: string
  capability?: string | undefined
  publisherAddress: Address
  solverAddress?: Address | null | undefined
  payerAddress?: Address | null | undefined
  resultHash: Hex
  artifactUrl?: string | null | undefined
  paymentTxHash?: Hex | null | undefined
  payoutTxHash?: Hex | null | undefined
  createdAt: string
  metadata?: Record<string, unknown> | undefined
}

export type SettlementCallback = {
  callbackId: string
  txHash: Hex
  callbackType: string
  targetAddress: Address
  callbackData: Hex
  policyHash: Hex
  maxGas: number
  createdAt: number
  expiresAt: number
  executedAt: number
  status: string
  creator: Address
}

export type AsyncFulfillment = {
  fulfillmentId: string
  originalTxHash: Hex
  fulfillerAddress: Address
  resultData: Hex
  policyCheck: boolean
  fulfilledAt: number
  receiptRef: Hex
}

export type RuntimeReceipt = {
  receiptRef: Hex
  receiptKind: number
  status: string
  mode: number
  modeName?: string | undefined
  sender: Address
  recipient: Address
  sponsor?: Address | undefined
  settlementRef?: Hex | undefined
  proofRef?: Hex | undefined
  failureRef?: Hex | undefined
  policyRef?: Hex | undefined
  artifactRef?: Hex | undefined
  amountRef?: Hex | undefined
  openedAt: number
  finalizedAt: number
}

export type SettlementEffect = {
  settlementRef: Hex
  receiptRef?: Hex | undefined
  mode: number
  modeName?: string | undefined
  sender: Address
  recipient: Address
  sponsor?: Address | undefined
  amountRef?: Hex | undefined
  policyRef?: Hex | undefined
  artifactRef?: Hex | undefined
  createdAt: number
}
