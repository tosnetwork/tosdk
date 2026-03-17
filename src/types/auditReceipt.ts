import type { Address } from './address.js'
import type { Hex } from './misc.js'

export type AuditMeta = {
  intentIdHash: string
  planIdHash: string
  terminalClassHash: string
  trustTier: number
}

export type SessionProof = {
  txHash: Hex
  accountAddress: Address
  trustTier: number
  createdAt: number
  expiresAt: number
  proofHash: Hex
}
