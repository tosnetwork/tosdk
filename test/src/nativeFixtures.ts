import { privateKeyToAddress } from '../../src/accounts/utils/privateKeyToAddress.js'
import { accounts } from './constants.js'

export const nativeAccounts = accounts.map((account) => ({
  ...account,
  address: privateKeyToAddress(account.privateKey),
})) as readonly {
  address: `0x${string}`
  balance: bigint
  privateKey: `0x${string}`
}[]

export const nativeTypedData = {
  basic: {
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: 1,
      verifyingContract: nativeAccounts[2]!.address,
    },
    types: {
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
      ],
    },
    message: {
      from: {
        name: 'Cow',
        wallet: nativeAccounts[0]!.address,
      },
      to: {
        name: 'Bob',
        wallet: nativeAccounts[1]!.address,
      },
      contents: 'Hello, Bob!',
    },
  },
  complex: {
    domain: {
      name: 'Ether Mail',
      version: '1.1.1',
      chainId: 1,
      verifyingContract: nativeAccounts[2]!.address,
    },
    types: {
      Name: [
        { name: 'first', type: 'string' },
        { name: 'last', type: 'string' },
      ],
      Person: [
        { name: 'name', type: 'Name' },
        { name: 'wallet', type: 'address' },
        { name: 'favoriteColors', type: 'string[3]' },
        { name: 'foo', type: 'uint256' },
        { name: 'age', type: 'uint8' },
        { name: 'isCool', type: 'bool' },
      ],
      Mail: [
        { name: 'timestamp', type: 'uint256' },
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
        { name: 'hash', type: 'bytes' },
      ],
    },
    message: {
      timestamp: 1234567890n,
      contents: 'Hello, Bob!',
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      from: {
        name: {
          first: 'Cow',
          last: 'Burns',
        },
        wallet: nativeAccounts[0]!.address,
        age: 69,
        foo: 123123123123123123n,
        favoriteColors: ['red', 'green', 'blue'],
        isCool: false,
      },
      to: {
        name: { first: 'Bob', last: 'Builder' },
        wallet: nativeAccounts[1]!.address,
        age: 70,
        foo: 123123123123123123n,
        favoriteColors: ['orange', 'yellow', 'green'],
        isCool: true,
      },
    },
  },
} as const

export const nativeSignerVectors = {
  hash:
    '0x0000000000000000000000000000000000000000000000000000000000001234',
  elgamal: {
    privateKey:
      '0x0100000000000000000000000000000000000000000000000000000000000000',
    publicKey:
      '0x8c9240b456a9e6dc65c377a1048d745f94a08cdb7f44cbcd7b46f34048871134',
    address:
      '0x068bf56e036ac1261de680eda2611ee30fd0e2c3a89e211d4299f9f75e1d7a85',
    signature:
      '0x4f12a0f9d16f93735fd64c7e5ccbc47bd3d83bd7cfe842ecc54df786a599e0041b4557ec2aa7b7dcfba1938d5ffdd4d90f9915bff8cde47e1434701fc3a20201',
  },
} as const
