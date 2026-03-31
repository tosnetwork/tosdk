import type { AbiParameter } from 'abitype'

import type { PackageArgument } from '../../types/contract.js'
import type { Hex } from '../../types/misc.js'
import { encodeAbiParameters } from '../abi/encodeAbiParameters.js'
import { toHex } from '../encoding/toHex.js'
import { blake3Hash } from '../hash/blake3.js'

function concatHexParts(parts: readonly Hex[]): Hex {
  return `0x${parts.map((part) => part.slice(2)).join('')}` as Hex
}

function toSelector(prefix: string, value: string): Hex {
  return `0x${blake3Hash(toHex(`${prefix}${value}`)).slice(2, 10)}` as Hex
}

function toAbiParameters(args: readonly PackageArgument[]): readonly AbiParameter[] {
  return args.map((arg) => ({ type: arg.type }))
}

export function encodePackageCallData(parameters: {
  packageName: string
  functionSignature: string
  args?: readonly PackageArgument[] | undefined
}): Hex {
  const dispatchTag = toSelector('pkg:', parameters.packageName)
  const selector = toSelector('', parameters.functionSignature)
  const args = parameters.args ?? []
  const encodedArgs =
    args.length > 0
      ? encodeAbiParameters(
          toAbiParameters(args),
          args.map((arg) => arg.value) as readonly unknown[],
        )
      : '0x'

  return concatHexParts([dispatchTag, selector, encodedArgs])
}
