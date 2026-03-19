import { gtomiUnits } from '../../constants/unit.js'

import { type FormatUnitsErrorType, formatUnits } from './formatUnits.js'

export type FormatGtomiErrorType = FormatUnitsErrorType

/** Formats a base-unit amount using gtomi decimals. */
export function formatGtomi(tomi: bigint, unit: 'tomi' = 'tomi') {
  return formatUnits(tomi, gtomiUnits[unit])
}
