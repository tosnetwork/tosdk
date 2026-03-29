# TOS Network SDK

`tosdk` is the TypeScript SDK for building applications, agents, and services on TOS Network.

This repository is a native TypeScript SDK for TOS Network. It focuses on native accounts, 32-byte addresses, typed-data signing, and native transaction signing without carrying the old EVM client surface.

## Current Direction

- Native 32-byte account addresses
- TypeScript-first developer experience
- Reusable account, signing, and encoding utilities
- A small surface area that is easy to embed into agents and services

## What Is Working Now

- Private-key based local accounts
- HD and mnemonic account derivation
- Native 32-byte address derivation from secp256k1 keys
- Native transaction and typed-data signing
- Public and wallet clients with privacy RPC helpers (`privGetBalance`, `privGetNonce`, selective disclosure)

## Scope

This SDK is intentionally narrow. It provides the native account/signing path used by the current TOS agent stack and avoids shipping unrelated legacy EVM modules.

## Example

```ts
import { privateKeyToAccount } from 'tosdk/accounts'

const account = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
)

console.log(account.address)
// 0xc1ffd3cfee2d9e5cd67643f8f39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

For a networked privacy example, see `examples/privacy-wallet.ts` in the
repository root.

## License

MIT
