import { blake3Hash } from './hash/blake3.js'
import { toHex } from './encoding/toHex.js'
import type {
  ArtifactAnchorSummary,
  ArtifactVerificationReceipt,
} from '../types/artifact.js'
import type { Hex } from '../types/misc.js'

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (typeof value === 'bigint') return value.toString()
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const next = sortValue((value as Record<string, unknown>)[key])
      if (typeof next !== 'undefined') output[key] = next
    }
    return output
  }
  return value
}

export function canonicalizeArtifactValue(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

export function hashArtifactValue(value: unknown): Hex {
  return blake3Hash(toHex(canonicalizeArtifactValue(value)))
}

export function canonicalizeArtifactAnchorSummary(
  summary: ArtifactAnchorSummary,
): string {
  return canonicalizeArtifactValue(summary)
}

export function hashArtifactAnchorSummary(summary: ArtifactAnchorSummary): Hex {
  return hashArtifactValue(summary)
}

export function canonicalizeArtifactVerificationReceipt(
  receipt: ArtifactVerificationReceipt,
): string {
  return canonicalizeArtifactValue(receipt)
}

export function hashArtifactVerificationReceipt(
  receipt: ArtifactVerificationReceipt,
): Hex {
  return hashArtifactValue(receipt)
}
