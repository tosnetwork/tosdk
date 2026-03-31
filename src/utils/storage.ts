import type { StorageAnchorSummary, StorageReceipt } from '../types/storage.js'
import type { Hex } from '../types/misc.js'
import { toHex } from './encoding/toHex.js'
import { blake3Hash } from './hash/blake3.js'

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const next = sortValue((value as Record<string, unknown>)[key])
      if (typeof next !== 'undefined') {
        out[key] = next
      }
    }
    return out
  }

  return value
}

export function canonicalizeStorageValue(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

export function hashStorageValue(value: unknown): Hex {
  return blake3Hash(toHex(canonicalizeStorageValue(value)))
}

export function canonicalizeStorageReceipt(receipt: StorageReceipt): string {
  return canonicalizeStorageValue(receipt)
}

export function hashStorageReceipt(receipt: StorageReceipt): Hex {
  return hashStorageValue(receipt)
}

export function canonicalizeStorageAnchorSummary(
  summary: StorageAnchorSummary,
): string {
  return canonicalizeStorageValue(summary)
}

export function hashStorageAnchorSummary(summary: StorageAnchorSummary): Hex {
  return hashStorageValue(summary)
}
