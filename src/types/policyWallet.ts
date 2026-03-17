import type { Address } from './address.js'

export type SpendCaps = {
  dailyLimit: string
  singleTxLimit: string
  dailySpent: string
  spendDay: number
}

export type TerminalPolicy = {
  maxSingleValue: string
  maxDailyValue: string
  minTrustTier: number
  enabled: boolean
}

export type DelegateAuth = {
  delegate: Address
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
  schemaVersion: string
  namespace: string
}
