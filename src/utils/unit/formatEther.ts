import { tosUnits } from '../../constants/unit.js'

import { type FormatUnitsErrorType, formatUnits } from './formatUnits.js'

export type FormatTosErrorType = FormatUnitsErrorType

/** Formats a base-unit amount using TOS decimals. */
export function formatTos(tomi: bigint, unit: 'tomi' | 'gtomi' = 'tomi') {
  return formatUnits(tomi, tosUnits[unit])
}
