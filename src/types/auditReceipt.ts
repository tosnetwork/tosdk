import type { Address } from './address.js'
import type { Hex } from './misc.js'

export type AuditMeta = {
  intentId: string
  planId: string
  terminalClass: string
  trustTier: number
}

export type SessionProof = {
  sessionId: string
  terminalClass: string
  terminalId: string
  trustTier: number
  txHash: Hex
  accountAddress: Address
  createdAt: number
  expiresAt: number
  proofHash: Hex
}
