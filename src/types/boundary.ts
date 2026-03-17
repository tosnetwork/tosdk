import type { Address } from './address.js'
import type { Hex } from './misc.js'

export const BOUNDARY_SCHEMA_VERSION = '0.1.0' as const

export type TerminalClass =
  | 'app'
  | 'card'
  | 'pos'
  | 'voice'
  | 'kiosk'
  | 'robot'
  | 'api'

/** @deprecated Use {@link TerminalClass} instead. */
export type TerminalClassName = TerminalClass

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

export type IntentConstraints = {
  maxValue?: string
  allowedRecipients?: string[]
  requiredTrustTier?: TrustTier
  maxGas?: number
  deadline?: number
}

export type IntentEnvelope = {
  intentId: string
  schemaVersion: string
  action: string
  requester: Address
  actorAgentId: Address
  terminalClass: TerminalClass
  trustTier: TrustTier
  params: Record<string, unknown>
  constraints?: IntentConstraints
  createdAt: number
  expiresAt: number
  status: IntentStatus
}

export type RouteStep = {
  target: Address
  action: string
  value?: string
  artifactRef?: string
}

export type PlanRecord = {
  planId: string
  intentId: string
  schemaVersion: string
  provider: Address
  sponsor?: Address
  artifactRef?: string
  abiRef?: string
  policyHash: string
  sponsorPolicyHash?: string
  effectsHash?: string
  estimatedGas: number
  estimatedValue: string
  route?: RouteStep[]
  fallbackPlanId?: string
  createdAt: number
  expiresAt: number
  status: PlanStatus
}

export type ApprovalScope = {
  maxValue?: string
  allowedActions?: string[]
  allowedTargets?: string[]
  terminalClasses?: TerminalClass[]
  minTrustTier?: TrustTier
}

export type ApprovalRecord = {
  approvalId: string
  intentId: string
  planId: string
  schemaVersion: string
  approver: Address
  approverRole: AgentRole
  accountId: Address
  terminalClass: TerminalClass
  trustTier: TrustTier
  policyHash: string
  approvalProofRef?: string
  scope?: ApprovalScope
  createdAt: number
  expiresAt: number
  status: ApprovalStatus
}

export type ExecutionReceipt = {
  receiptId: string
  intentId: string
  planId: string
  approvalId: string
  schemaVersion: string
  txHash: Hex
  blockNumber: number
  blockHash: Hex
  from: Address
  to: Address
  sponsor?: Address
  actorAgentId: Address
  terminalClass: TerminalClass
  trustTier: TrustTier
  policyHash: string
  sponsorPolicyHash?: string
  artifactRef?: string
  effectsHash?: string
  gasUsed: number
  value: string
  receiptStatus: ReceiptStatus
  proofRef?: string
  receiptRef?: string
  settledAt: number
}
