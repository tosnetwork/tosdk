import { HDKey } from '@scure/bip32'
import { describe, expect, test } from 'vitest'

import {
  serializeTransaction,
  toBytes,
  verifyMessage,
} from 'tosdk'
import {
  generateMnemonic,
  generatePrivateKey,
  hdKeyToAccount,
  mnemonicToAccount,
  parseAccount,
  privateKeyToAccount,
  privateKeyToAddress,
  publicKeyToAddress,
  signerPublicKeyToAddress,
  signMessage,
  signTransaction,
  signTypedData,
  toAccount,
  verifyHashSignature,
} from 'tosdk/accounts'

import { accounts } from './src/constants.js'
import {
  nativeAccounts,
  nativeSignerVectors,
  nativeTypedData,
} from './src/nativeFixtures.js'

test('generatePrivateKey returns a 32-byte hex key', () => {
  expect(generatePrivateKey()).toMatch(/^0x[0-9a-f]{64}$/u)
})

test('generateMnemonic returns 12 words by default', () => {
  expect(generateMnemonic().split(' ')).toHaveLength(12)
})

test('privateKeyToAccount uses ed25519 and a 32-byte native address', () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  expect(account.address).toMatch(/^0x[0-9a-f]{64}$/u)
  expect(account.publicKey).toMatch(/^0x[0-9a-f]{64}$/u)
  expect(account.signerType).toBe('ed25519')
})

test('privateKeyToAddress and publicKeyToAddress agree', () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  expect(privateKeyToAddress(accounts[0]!.privateKey)).toBe(account.address)
  expect(publicKeyToAddress(account.publicKey)).toBe(account.address)
})

test('hd and mnemonic derivation produce ed25519 accounts', () => {
  const seed = toBytes(
    '0x9dfc3c64c2f8bede1533b6a79f8570e5943e0b8fd1cf77107adf7b72cef42185d564a3aee24cab43f80e3c4538087d70fc824eabbad596a23c97b6ee8322ccc0',
  )
  const hdAccount = hdKeyToAccount(HDKey.fromMasterSeed(seed))
  const mnemonicAccount = mnemonicToAccount(
    'test test test test test test test test test test test junk',
  )
  expect(hdAccount.address).toMatch(/^0x[0-9a-f]{64}$/u)
  expect(hdAccount.signerType).toBe('ed25519')
  expect(mnemonicAccount.address).toBe(hdAccount.address)
})

describe('account coercion', () => {
  test('toAccount converts a native address into a remote account', () => {
    expect(toAccount(nativeAccounts[0]!.address)).toEqual({
      address: nativeAccounts[0]!.address,
      type: 'remote',
    })
  })

  test('parseAccount preserves a local account', () => {
    const account = privateKeyToAccount(accounts[0]!.privateKey)
    expect(parseAccount(account)).toBe(account)
  })
})

describe('ed25519 signing', () => {
  const privateKey = accounts[0]!.privateKey

  test('signMessage and verifyMessage', async () => {
    const account = privateKeyToAccount(privateKey)
    const signature = await signMessage({
      message: 'hello world',
      privateKey,
      signerType: 'ed25519',
    })
    expect(signature).toMatch(/^0x[0-9a-f]+$/u)
    await expect(
      verifyMessage({
        address: account.address,
        publicKey: account.publicKey,
        message: 'hello world',
        signature,
      }),
    ).resolves.toBe(true)
  })

  test('signTransaction serializes native transactions', async () => {
    const account = privateKeyToAccount(privateKey)
    const serialized = await signTransaction({
      privateKey,
      signerType: 'ed25519',
      transaction: {
        chainId: 1666,
        from: account.address,
        gas: 21000n,
        signerType: 'ed25519',
        to: nativeAccounts[1]!.address,
        type: 'native',
        value: 1_000_000_000_000_000_000n,
      },
    })
    expect(serialized).toMatch(/^0x00/)
  })

  test('serializeTransaction routes sponsored transactions to the sponsored envelope', () => {
    const account0 = privateKeyToAccount(accounts[0]!.privateKey)
    const account1 = privateKeyToAccount(accounts[1]!.privateKey)
    const account2 = privateKeyToAccount(accounts[2]!.privateKey)
    const serialized = serializeTransaction(
      {
        chainId: 1666,
        from: account0.address,
        gas: 21000n,
        nonce: 0n,
        signerType: 'ed25519',
        sponsor: account2.address,
        sponsorSignerType: 'ed25519',
        sponsorExpiry: 1_800_000_000n,
        sponsorNonce: 7n,
        sponsorPolicyHash:
          '0x1111111111111111111111111111111111111111111111111111111111111111',
        to: account1.address,
        value: 123n,
      },
      {
        execution: {
          r: '0x01',
          s: '0x02',
          yParity: 1,
        },
        sponsor: {
          r: '0x03',
          s: '0x04',
          yParity: 0,
        },
      },
    )

    expect(serialized.startsWith('0x00')).toBe(true)
    expect(serialized).toContain(
      account2.address.toLowerCase().slice(2),
    )
  })

  test('serializeTransaction encodes terminalClass and trustTier when set', () => {
    const account0 = privateKeyToAccount(accounts[0]!.privateKey)
    const account1 = privateKeyToAccount(accounts[1]!.privateKey)
    const withFields = serializeTransaction({
      chainId: 1666,
      from: account0.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'ed25519',
      to: account1.address,
      value: 0n,
      terminalClass: 2,
      trustTier: 3,
    })

    const withoutFields = serializeTransaction({
      chainId: 1666,
      from: account0.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'ed25519',
      to: account1.address,
      value: 0n,
    })

    expect(withFields.startsWith('0x00')).toBe(true)
    expect(withoutFields.startsWith('0x00')).toBe(true)
    expect(withFields).not.toBe(withoutFields)
    expect(withFields.length).toBeGreaterThanOrEqual(withoutFields.length)
  })

  test('serializeTransaction omits terminalClass and trustTier when zero', () => {
    const account0 = privateKeyToAccount(accounts[0]!.privateKey)
    const account1 = privateKeyToAccount(accounts[1]!.privateKey)
    const withZero = serializeTransaction({
      chainId: 1666,
      from: account0.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'ed25519',
      to: account1.address,
      value: 0n,
      terminalClass: 0,
      trustTier: 0,
    })

    const withoutFields = serializeTransaction({
      chainId: 1666,
      from: account0.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'ed25519',
      to: account1.address,
      value: 0n,
    })

    expect(withZero).toBe(withoutFields)
  })

  test('signTypedData supports 32-byte addresses', async () => {
    const sig = await signTypedData({
      ...nativeTypedData.basic,
      primaryType: 'Mail',
      privateKey,
      signerType: 'ed25519',
    })
    expect(sig).toMatch(/^0x[0-9a-f]+$/u)
  })
})

describe('native signer parity', () => {
  test('derives elgamal address from the gtos vector', () => {
    const publicKey = nativeSignerVectors.elgamal.publicKey
    const address = signerPublicKeyToAddress(publicKey, 'elgamal')
    expect(address).toBe(nativeSignerVectors.elgamal.address)
  })

  test('verifies gtos elgamal signature vector', async () => {
    await expect(
      verifyHashSignature({
        hash: nativeSignerVectors.hash,
        publicKey: nativeSignerVectors.elgamal.publicKey,
        signerType: 'elgamal',
        signature: nativeSignerVectors.elgamal.signature,
      }),
    ).resolves.toBe(true)
  })

  test('ed25519 sign and verify round-trip', async () => {
    const account = privateKeyToAccount(accounts[0]!.privateKey)
    await expect(
      verifyHashSignature({
        hash: nativeSignerVectors.hash,
        publicKey: account.publicKey,
        signerType: 'ed25519',
        signature: await signMessage({
          message: 'test',
          privateKey: accounts[0]!.privateKey,
          signerType: 'ed25519',
        }),
      }),
    ).resolves.toBe(false) // different hash vs message hash, so false is expected

    // Proper round-trip with same hash
    const { sign } = await import('tosdk/accounts')
    const sig = await sign({
      hash: nativeSignerVectors.hash,
      privateKey: accounts[0]!.privateKey,
      signerType: 'ed25519',
      to: 'hex',
    })
    await expect(
      verifyHashSignature({
        hash: nativeSignerVectors.hash,
        publicKey: account.publicKey,
        signerType: 'ed25519',
        signature: sig,
      }),
    ).resolves.toBe(true)
  })
})
