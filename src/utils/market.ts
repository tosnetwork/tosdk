import type { MarketBindingReceipt } from '../types/market.js'
import type { Hex } from '../types/misc.js'
import { toHex } from './encoding/toHex.js'
import { blake3Hash } from './hash/blake3.js'

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (typeof value === 'bigint') return value.toString()
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const next = sortValue((value as Record<string, unknown>)[key])
      if (typeof next !== 'undefined') out[key] = next
    }
    return out
  }
  return value
}

export function canonicalizeMarketBindingValue(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

export function hashMarketBindingValue(value: unknown): Hex {
  return blake3Hash(toHex(canonicalizeMarketBindingValue(value)))
}

export function canonicalizeMarketBindingReceipt(
  receipt: MarketBindingReceipt,
): string {
  return canonicalizeMarketBindingValue(receipt)
}

export function hashMarketBindingReceipt(receipt: MarketBindingReceipt): Hex {
  return hashMarketBindingValue(receipt)
}
