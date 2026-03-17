import type { Address } from './address.js'
import type { Hex } from './misc.js'

export const BOUNDARY_SCHEMA_VERSION = '0.1.0' as const

export type TerminalClassName =
  | 'app'
  | 'card'
  | 'pos'
  | 'voice'
  | 'kiosk'
  | 'robot'
  | 'api'

export type TrustTier = 0 | 1 | 2 | 3 | 4

export type AgentRole =
  | 'requester'
  | 'actor'
  | 'provider'
  | 'sponsor'
  | 'signer'
  | 'gateway'
  | 'oracle'
  | 'counterparty'
  | 'guardian'

export type IntentStatus =
  | 'pending'
  | 'planning'
  | 'approved'
  | 'executing'
  | 'settled'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type PlanStatus =
  | 'draft'
  | 'ready'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'expired'

export type ApprovalStatus =
  | 'pending'
  | 'granted'
  | 'denied'
  | 'revoked'
  | 'expired'

export type ReceiptStatus = 'success' | 'failed' | 'reverted'

export type IntentEnvelope = {
  intentId: string
  kind: string
  requester: Address
  terminalClass: TerminalClassName
  trustTier: TrustTier
  payload: Hex
  maxGas: number
  maxValue: string
  expiry: number
  status: IntentStatus
  createdAt: number
}

export type PlanRecord = {
  planId: string
  intentId: string
  steps: readonly PlanStep[]
  estimatedGas: number
  estimatedValue: string
  status: PlanStatus
  createdAt: number
  expiresAt: number
}

export type PlanStep = {
  stepIndex: number
  action: string
  target: Address
  value: string
  calldata: Hex
  agentRole: AgentRole
}

export type ApprovalRecord = {
  approvalId: string
  planId: string
  intentId: string
  approver: Address
  agentRole: AgentRole
  status: ApprovalStatus
  grantedAt: number
  expiresAt: number
  signature: Hex
}

export type ExecutionReceipt = {
  receiptId: string
  planId: string
  intentId: string
  txHash: Hex
  executor: Address
  status: ReceiptStatus
  gasUsed: number
  blockNumber: number
  settledAt: number
  resultHash: Hex
}
