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
  maxGas: number
  status: string
  createdAt: number
  expiresAt: number
}

export type AsyncFulfillment = {
  fulfillmentId: string
  originalTxHash: Hex
  fulfillerAddress: Address
  fulfilledAt: number
  receiptRef: string
}
