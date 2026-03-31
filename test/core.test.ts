import { expect, test } from 'vitest'

import { defineChain, blake3Hash, parseUnits, toBytes, toHex } from 'tosdk'
import { tos, tosTestnet } from 'tosdk/chains'

test('toHex and toBytes encode basic values', () => {
  expect(toHex('hello')).toBe('0x68656c6c6f')
  expect(Array.from(toBytes('hello'))).toEqual([104, 101, 108, 108, 111])
  expect(toHex(true, { size: 1 })).toBe('0x01')
})

test('blake3Hash hashes byte-compatible values', () => {
  expect(blake3Hash('0x68656c6c6f')).toBe(
    '0xea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f',
  )
})

test('parseUnits expands decimal strings', () => {
  expect(parseUnits('420', 9)).toBe(420000000000n)
  expect(parseUnits('1.5', 18)).toBe(1500000000000000000n)
})

test('chains export native TOS definitions', () => {
  expect(tos.name).toBe('TOS Mainnet')
  expect(tos.testnet).toBe(false)
  expect(tosTestnet.name).toBe('TOS Testnet')
  expect(tosTestnet.testnet).toBe(true)
})

test('defineChain creates custom native chain definitions', () => {
  const local = defineChain({
    id: 70000,
    name: 'Local TOS',
    nativeCurrency: {
      decimals: 18,
      name: 'TOS',
      symbol: 'TOS',
    },
    rpcUrls: {
      default: {
        http: ['http://127.0.0.1:8545'],
      },
    },
    testnet: true,
  })

  expect(local.id).toBe(70000)
  expect(local.rpcUrls.default.http[0]).toBe('http://127.0.0.1:8545')
})
