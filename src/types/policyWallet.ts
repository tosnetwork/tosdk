import type { Address } from './address.js'

export type SpendCaps = {
  dailyLimit: string
  singleTxLimit: string
  dailySpent: string
  spendDay: string
}

export type TerminalPolicy = {
  maxSingleValue: string
  maxDailyValue: string
  minTrustTier: number
  enabled: boolean
}

export type DelegateAuth = {
  allowance: string
  expiry: number
  active: boolean
}

export type RecoveryState = {
  active: boolean
  guardian: Address
  newOwner: Address
  initiatedAt: number
  timelock: number
}

export type PolicyWalletSchemaInfo = {
  boundaryVersion: string
  schemaVersion: string
  features: string[]
}
