# tosdk — Claude Code Instructions

## Project

TypeScript SDK for TOS Network, published as `@tosnetwork/tosdk` on npm.

## Commands

```bash
# Type-check
pnpm typecheck

# Run tests
pnpm test

# Build (CJS + ESM + types)
pnpm build

# Publish to npm
./publish.sh            # run tests, build, then publish
./publish.sh --dry-run  # same but without actually publishing
```

## Publishing

`publish.sh` is the canonical way to release a new version:

1. Bump `"version"` in `package.json`
2. Commit and push
3. Run `./publish.sh`

The script runs tests + build, then calls:

```bash
npm publish --no-git-checks --provenance=false --access public
```

- `--no-git-checks` — skip git-clean / git-tag checks (we tag manually)
- `--provenance=false` — disable SLSA provenance (not in a supported CI)
- `--access public` — required for scoped packages (`@tosnetwork/*`)

## Structure

- `src/types/` — TypeScript type definitions (interfaces, no runtime code)
- `src/clients/` — `createPublicClient` / `createWalletClient` factories
- `src/transports/` — HTTP and WebSocket RPC transports
- `src/accounts/` — Key generation, signing (secp256k1, bls12381, elgamal)
- `src/surfaces/` — High-level operation helpers
- `src/schema/` — Boundary schema validation
- `src/utils/` — Encoding, hashing, ABI, address utilities

## RPC Coverage

The SDK maintains 100% coverage of gtos public RPC APIs. When adding new
RPC methods to `~/gtos/internal/tosapi/`, also add:

1. TypeScript types in `src/types/`
2. Client method in `src/clients/createPublicClient.ts`
3. Interface declaration in `src/types/client.ts`
4. Re-export in `src/index.ts`
