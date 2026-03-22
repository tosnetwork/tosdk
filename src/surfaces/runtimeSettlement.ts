import type { PublicClient } from '../types/client.js'
import type { RuntimeReceipt, SettlementEffect } from '../types/settlement.js'

export type RuntimeSettlementSurface = {
  receipt?: RuntimeReceipt | undefined
  effect?: SettlementEffect | undefined
}

export async function inspectRuntimeReceipt(
  client: PublicClient,
  parameters: {
    receiptRef: `0x${string}`
  },
): Promise<RuntimeSettlementSurface> {
  const receipt = await client.getRuntimeReceipt({
    receiptRef: parameters.receiptRef,
  })
  const effect =
    receipt.settlementRef && receipt.settlementRef !== ('0x' as `0x${string}`)
      ? await client.getSettlementEffect({
          settlementRef: receipt.settlementRef,
        })
      : undefined
  return { receipt, effect }
}

export async function inspectSettlementEffect(
  client: PublicClient,
  parameters: {
    settlementRef: `0x${string}`
  },
): Promise<RuntimeSettlementSurface> {
  const effect = await client.getSettlementEffect({
    settlementRef: parameters.settlementRef,
  })
  const receipt =
    effect.receiptRef && effect.receiptRef !== ('0x' as `0x${string}`)
      ? await client.getRuntimeReceipt({
          receiptRef: effect.receiptRef,
        })
      : undefined
  return { receipt, effect }
}
