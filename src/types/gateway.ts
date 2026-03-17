import type { Address } from './address.js'

export type GatewayConfig = {
  agentAddress: Address
  endpoint: string
  supportedKinds: string[]
  maxRelayGas: number
  feePolicy: string
  feeAmount: string
  active: boolean
  registeredAt: number
}
