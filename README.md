# ARWave Upload MVP

ArDrive-inspired MVP for uploading files to Arweave with ETH funding via Irys, then linking each upload batch to versioned ENS subdomains (`vN.name.eth`).

## Features

- MetaMask-only wallet flow (RainbowKit + wagmi).
- Network support: Ethereum mainnet and Sepolia.
- Multi-file upload with 100 MB batch cap.
- Pre-upload ETH estimate (`irys.getPrice`) with 5% funding buffer.
- Per-file upload progress + manifest creation.
- ENS name discovery via reverse lookup (+ optional subgraph).
- Version scan (`v1` to `v100`) and ENS subdomain linking.
- Resolver contenthash update to Arweave manifest (`ar://manifestTxId`).

## Prerequisites

- Node.js 20+
- npm 10+
- MetaMask browser extension

## Environment

Copy `.env.example` values into a local `.env` and set valid RPC endpoints:

- `VITE_MAINNET_RPC_URL`
- `VITE_SEPOLIA_RPC_URL`
- `VITE_IRYS_MAINNET_NODE`
- `VITE_IRYS_DEVNET_NODE`
- `VITE_ENS_SUBGRAPH_MAINNET_URL` (optional)
- `VITE_ENS_SUBGRAPH_SEPOLIA_URL` (optional)
- `VITE_WALLETCONNECT_PROJECT_ID` (RainbowKit requirement)

## Development

```bash
npm install
npm run dev
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

## GitHub Actions and Pages

- CI workflow: `.github/workflows/ci.yml`
- Pages deploy workflow: `.github/workflows/deploy-pages.yml`
- Deployment target: GitHub Pages from `main` via Actions

## Notes

- ENS linking is restricted to `.eth` parent names in v1.
- Wrapper-first subdomain writes are attempted, then fallback to ENS Registry.
- Sepolia ENS gateway behavior can differ from mainnet; tx hashes are always shown.
