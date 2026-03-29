import { HDKey } from '@scure/bip32'
import { describe, expect, test } from 'vitest'

import {
  serializeTransaction,
  toBytes,
  verifyMessage,
} from 'tosdk'
import {
  bls12381PrivateKeyToAccount,
  elgamalPrivateKeyToAccount,
  generateMnemonic,
  generatePrivateKey,
  hdKeyToAccount,
  mnemonicToAccount,
  parseAccount,
  privateKeyToAccount,
  privateKeyToAddress,
  publicKeyToAddress,
  secp256r1PrivateKeyToAccount,
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

test('privateKeyToAccount uses a 32-byte native address', () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  expect(account.address).toBe(
    '0xc1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  )
  expect(account.publicKey).toMatch(/^0x04[0-9a-f]+$/u)
})

test('privateKeyToAddress and publicKeyToAddress agree', () => {
  const account = privateKeyToAccount(accounts[0]!.privateKey)
  expect(privateKeyToAddress(accounts[0]!.privateKey)).toBe(account.address)
  expect(publicKeyToAddress(account.publicKey)).toBe(account.address)
})

test('hd and mnemonic derivation follow the native path', () => {
  const seed = toBytes(
    '0x9dfc3c64c2f8bede1533b6a79f8570e5943e0b8fd1cf77107adf7b72cef42185d564a3aee24cab43f80e3c4538087d70fc824eabbad596a23c97b6ee8322ccc0',
  )
  const hdAccount = hdKeyToAccount(HDKey.fromMasterSeed(seed))
  const mnemonicAccount = mnemonicToAccount(
    'test test test test test test test test test test test junk',
  )
  expect(hdAccount.address).toBe(
    '0xc1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  )
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

describe('native signing', () => {
  const privateKey = accounts[0]!.privateKey

  test('signMessage and verifyMessage', async () => {
    const signature = await signMessage({
      message: 'hello world',
      privateKey,
    })
    expect(signature).toBe(
      '0xba661cbfe2863d3f577b8cb8a014e4b23f935c164942c2a82c084f5e90e520ff7bd70e2a8a9ffd7161332701ef3d0479113a2cc9a9d0f4be6788f086b734c88a1c',
    )
    await expect(
      verifyMessage({
        address: nativeAccounts[0]!.address,
        message: 'hello world',
        signature,
      }),
    ).resolves.toBe(true)
  })

  test('signTransaction serializes native transactions', async () => {
    await expect(
      signTransaction({
        privateKey,
        transaction: {
          chainId: 1666,
          from: nativeAccounts[0]!.address,
          gas: 21000n,
          signerType: 'secp256k1',
          to: nativeAccounts[1]!.address,
          type: 'native',
          value: 1_000_000_000_000_000_000n,
        },
      }),
    ).resolves.toBe(
      '0x00f8f482068280825208a0482845ef5f7df661eb71148970997970c51812dc3a010c7d01b50e0d17dc79c8880de0b6b3a764000080c0a0c1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb9226689736563703235366b31a00000000000000000000000000000000000000000000000000000000000000000808080a0000000000000000000000000000000000000000000000000000000000000000080808080808080808080801ba00675ff6d194bee012dcd00cc153969387308e96b490cb1f2bccdca9c0862ef04a057ed8bc34ea7a40bd84f9e32aa60873111308577c265335a659fcd594d1aefdc808080',
    )
  })

  test('serializeTransaction routes sponsored transactions to the sponsored envelope', () => {
    const serialized = serializeTransaction(
      {
        chainId: 1666,
        from: nativeAccounts[0]!.address,
        gas: 21000n,
        nonce: 0n,
        signerType: 'secp256k1',
        sponsor: nativeAccounts[2]!.address,
        sponsorSignerType: 'secp256k1',
        sponsorExpiry: 1_800_000_000n,
        sponsorNonce: 7n,
        sponsorPolicyHash:
          '0x1111111111111111111111111111111111111111111111111111111111111111',
        to: nativeAccounts[1]!.address,
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
      nativeAccounts[2]!.address.toLowerCase().slice(2),
    )
  })

  test('serializeTransaction builds a deterministic sponsored envelope', () => {
    expect(
      serializeTransaction(
        {
          chainId: 1666,
          from: nativeAccounts[0]!.address,
          gas: 21000n,
          nonce: 0n,
          signerType: 'secp256k1',
          sponsor: nativeAccounts[2]!.address,
          sponsorSignerType: 'secp256k1',
          sponsorExpiry: 1_800_000_000n,
          sponsorNonce: 7n,
          sponsorPolicyHash:
            '0x1111111111111111111111111111111111111111111111111111111111111111',
          to: nativeAccounts[1]!.address,
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
      ),
    ).toBe(
      '0x00f8b982068200825208a0482845ef5f7df661eb71148970997970c51812dc3a010c7d01b50e0d17dc79c87b80c0a0c1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb9226689736563703235366b31a0f5a7a1de5c98f3df76fc2e153c44cdddb6a900fa2b585dd299e03d12fa4293bc89736563703235366b3107846b49d200a011111111111111111111111111111111111111111111111111111111111111118080808080808080808080010102000304',
    )
  })

  test('serializeTransaction encodes terminalClass and trustTier when set', () => {
    const withFields = serializeTransaction({
      chainId: 1666,
      from: nativeAccounts[0]!.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'secp256k1',
      to: nativeAccounts[1]!.address,
      value: 0n,
      terminalClass: 2,
      trustTier: 3,
    })

    const withoutFields = serializeTransaction({
      chainId: 1666,
      from: nativeAccounts[0]!.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'secp256k1',
      to: nativeAccounts[1]!.address,
      value: 0n,
    })

    // Both should be valid native envelopes
    expect(withFields.startsWith('0x00')).toBe(true)
    expect(withoutFields.startsWith('0x00')).toBe(true)

    // The one with fields set should be different (non-empty encoding)
    expect(withFields).not.toBe(withoutFields)

    // The serialized outputs differ because non-zero values encode differently
    // than the empty 0x80 placeholders used for undefined fields
    expect(withFields.length).toBeGreaterThanOrEqual(withoutFields.length)
  })

  test('serializeTransaction omits terminalClass and trustTier when zero', () => {
    const withZero = serializeTransaction({
      chainId: 1666,
      from: nativeAccounts[0]!.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'secp256k1',
      to: nativeAccounts[1]!.address,
      value: 0n,
      terminalClass: 0,
      trustTier: 0,
    })

    const withoutFields = serializeTransaction({
      chainId: 1666,
      from: nativeAccounts[0]!.address,
      gas: 21000n,
      nonce: 0n,
      signerType: 'secp256k1',
      to: nativeAccounts[1]!.address,
      value: 0n,
    })

    // zero encodes as 0x80 (RLP for empty/zero), same as undefined
    // Both should produce identical output since 0 → '0x' → 0x80
    expect(withZero).toBe(withoutFields)
  })

  test('signTypedData supports 32-byte addresses', async () => {
    await expect(
      signTypedData({
        ...nativeTypedData.basic,
        primaryType: 'Mail',
        privateKey,
      }),
    ).resolves.toBe(
      '0x35c65cdb26d85929ba5aa38c680dd1c038d7351a7ad6a3aee8f1a68606bbcffc3c49937ea645d94705afa42f5000f32cc6b76b6ddeee1762bc0230ce5c2927591b',
    )
  })
})

describe('native signer parity', () => {
  test('derives secp256r1 address from the gtos vector', () => {
    const account = secp256r1PrivateKeyToAccount(nativeSignerVectors.secp256r1.privateKey)
    expect(account.publicKey).toBe(nativeSignerVectors.secp256r1.publicKey)
    expect(account.address).toBe(nativeSignerVectors.secp256r1.address)
    expect(
      signerPublicKeyToAddress(account.publicKey, account.signerType),
    ).toBe(account.address)
  })

  test('derives bls12-381 address from the gtos vector', () => {
    const account = bls12381PrivateKeyToAccount(nativeSignerVectors.bls12381.privateKey)
    expect(account.publicKey).toBe(nativeSignerVectors.bls12381.publicKey)
    expect(account.address).toBe(nativeSignerVectors.bls12381.address)
    expect(
      signerPublicKeyToAddress(account.publicKey, account.signerType),
    ).toBe(account.address)
  })

  test('derives elgamal address from the gtos vector', () => {
    const account = elgamalPrivateKeyToAccount(nativeSignerVectors.elgamal.privateKey)
    expect(account.publicKey).toBe(nativeSignerVectors.elgamal.publicKey)
    expect(account.address).toBe(nativeSignerVectors.elgamal.address)
    expect(
      signerPublicKeyToAddress(account.publicKey, account.signerType),
    ).toBe(account.address)
  })

  test('verifies gtos secp256r1 signature vector', async () => {
    await expect(
      verifyHashSignature({
        hash: nativeSignerVectors.hash,
        publicKey: nativeSignerVectors.secp256r1.publicKey,
        signerType: 'secp256r1',
        signature: nativeSignerVectors.secp256r1.signature,
      }),
    ).resolves.toBe(true)
  })

  test('verifies gtos bls12-381 signature vector', async () => {
    await expect(
      verifyHashSignature({
        hash: nativeSignerVectors.hash,
        publicKey: nativeSignerVectors.bls12381.publicKey,
        signerType: 'bls12-381',
        signature: nativeSignerVectors.bls12381.signature,
      }),
    ).resolves.toBe(true)
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
})
