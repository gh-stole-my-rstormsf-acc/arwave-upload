# PRD: Arweave Upload dApp with ENS Versioning

**Status:** Draft v1
**Author:** ralph
**Date:** 2026-02-10
**Repo:** `arweave-upload-dapp`

---

## Problem Statement

Uploading files to Arweave today requires users to acquire AR tokens, interact with unfamiliar tooling, and manually manage permanent links. There is no streamlined path from "I have ETH in MetaMask" to "my files are permanently stored and addressable via my ENS name." Users who want censorship-resistant, permanent file hosting must context-switch across wallets, bridges, and storage interfaces — friction that kills adoption.

This dApp eliminates that friction: connect wallet, pick files, pay in ETH, get permanent Arweave-backed URLs tied to versioned ENS subdomains.

---

## Goals

1. **Zero AR token handling** — User pays only in ETH. All Arweave storage payment is abstracted via Irys.
2. **< 3 clicks to upload** — File select → confirm tx → done. No intermediate screens.
3. **ENS-native versioning** — Each upload batch is addressable as `v1.yourname.eth`, `v2.yourname.eth`, etc., resolvable via eth.limo gateway.
4. **TDD engineering** — 100% of business logic covered by unit tests; critical paths covered by e2e tests. CI-green before any merge.
5. **Production-ready dist** — Single `npm run build` produces a deployable static bundle (Vite output to `dist/`).

---

## Non-Goals

- **Custom DEX/AMM implementation** — We do not build swap infrastructure. Irys accepts ETH natively; no on-chain swap router needed.
- **AR token wallet support** — Users never hold or manage AR. If they want to pay in AR directly, that's out of scope for v1.
- **ENS name registration** — We detect and use existing ENS names only. No ENS purchase/registration flow.
- **File encryption** — Files are stored as-is on Arweave (public, permanent). Client-side encryption is a v2 concern.
- **Mobile wallet support (WalletConnect)** — v1 targets MetaMask browser extension only. RainbowKit abstraction makes adding wallets trivial later.
- **IPFS pinning** — Arweave-only. No dual-storage strategy.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   React + Vite SPA                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │  Wallet   │  │  Upload  │  │   ENS Manager     │ │
│  │  Connect  │  │  Engine  │  │   (Subdomains)    │ │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘ │
│       │              │                 │            │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────────▼──────────┐ │
│  │  wagmi   │  │   Irys   │  │   @ensdomains/    │ │
│  │  + viem  │  │   SDK    │  │   ensjs           │ │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘ │
│       │              │                 │            │
└───────┼──────────────┼─────────────────┼────────────┘
        │              │                 │
   Ethereum RPC    Irys Bundler     ENS Contracts
   (MetaMask)      (→ Arweave)     (NameWrapper +
                                    PublicResolver)
```

**Key dependency:** Irys (`@irys/upload-ethereum`) accepts ETH directly for Arweave uploads. This eliminates the need for any DEX routing, bridge contracts, or wAR token handling. The "ETH → AR conversion" happens inside Irys's payment layer — opaque to the user.

---

## User Stories

### Persona: Wallet User (has ETH + MetaMask)

**US-1: Connect Wallet**
As a wallet user, I want to connect my MetaMask wallet so that the dApp can identify my account and check for ENS names.

Acceptance criteria:
- RainbowKit connect modal displays on app load (if not connected)
- After connection, UI shows truncated address or ENS name
- Chain must be Ethereum mainnet; prompt switch if on wrong network
- Disconnect button available in header

**US-2: Upload Files**
As a wallet user, I want to select multiple files and upload them to Arweave by paying in ETH so that my files are permanently stored.

Acceptance criteria:
- File picker accepts any file type, multiple selection
- Pre-upload cost estimate displayed in ETH (via Irys `getPrice()`)
- Single MetaMask transaction approval funds the Irys node
- Upload progress shown per-file
- On completion: Arweave transaction IDs displayed with gateway links (`https://gateway.irys.xyz/{txId}`)
- All files in a batch are grouped under one Arweave path manifest

**US-3: ENS Detection**
As a wallet user, I want the dApp to automatically detect my ENS name so that I can link uploads to my identity.

Acceptance criteria:
- On wallet connect, reverse-resolve address → ENS name via `useEnsName`
- If ENS found: display name, enable "Link to ENS" flow
- If no ENS: show info message, skip ENS flow, still allow upload

**US-4: ENS Subdomain Versioning**
As a wallet user with an ENS name, I want each upload batch assigned to a versioned subdomain (v1, v2, v3...) so that I can reference specific versions of my files.

Acceptance criteria:
- After upload completes, detect existing subdomains (v1, v2, ...) under user's ENS name
- Auto-suggest next version number (e.g., if v2 exists, suggest v3)
- User confirms subdomain creation → MetaMask tx to NameWrapper `setSubnodeRecord()`
- Content hash set to `ar://{manifestTxId}` on the subdomain's resolver
- After tx confirms, display resolvable URL: `https://v3.yourname.eth.limo`

**US-5: Upload History**
As a wallet user, I want to see my previous uploads so that I can reference or re-link them.

Acceptance criteria:
- Query Irys for uploads by wallet address
- Display list: timestamp, file count, manifest TX ID, linked ENS subdomain (if any)
- Each entry has copy-link and "Link to ENS" actions

---

## Requirements

### P0 — Must-Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| P0-1 | MetaMask wallet connection via RainbowKit + wagmi | Connect/disconnect, chain validation, address display |
| P0-2 | Multi-file selection and Arweave upload via Irys | Drag-drop or picker, progress UI, manifest creation |
| P0-3 | ETH cost estimation before upload | Call `irys.getPrice(totalBytes)`, display in ETH with USD estimate |
| P0-4 | Irys funding + upload in single flow | Fund Irys node with ETH → upload files → return manifest TX ID |
| P0-5 | Arweave path manifest generation | All files in batch under one manifest with human-readable paths |
| P0-6 | ENS name detection on wallet connect | Reverse lookup via wagmi `useEnsName`, display result |
| P0-7 | ENS subdomain creation with version increment | Detect existing vN subdomains, create next, set content hash to `ar://` |
| P0-8 | Unit tests for all business logic | Vitest, ≥90% coverage on `src/lib/` and `src/hooks/` |
| P0-9 | E2E tests for critical flows | Playwright: connect → upload → verify TX ID returned |
| P0-10 | Production build to `dist/` | `npm run build` outputs static SPA, deployable to any static host |

### P1 — Nice-to-Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|-------------------|
| P1-1 | Upload history from Irys query API | List past uploads by connected wallet |
| P1-2 | `latest.yourname.eth` alias | Auto-update a `latest` subdomain to point to most recent upload |
| P1-3 | File type icons and preview thumbnails | Visual file list with type detection |
| P1-4 | Batch cost breakdown per-file | Show individual file sizes and estimated costs |
| P1-5 | Dark mode | System-preference-aware, toggle in UI |

### P2 — Future Considerations

| ID | Requirement | Notes |
|----|-------------|-------|
| P2-1 | Client-side encryption before upload | AES-256-GCM, key management UX TBD |
| P2-2 | WalletConnect / multi-wallet support | RainbowKit already abstracts this; mainly testing effort |
| P2-3 | L2 payment (Arbitrum/Base ETH) | Irys supports these chains; need chain-switching UX |
| P2-4 | Folder upload with directory structure preservation | Map to nested Arweave manifest paths |
| P2-5 | Custom subdomain labels (not just vN) | e.g., `release-2026-q1.yourname.eth` |

---

## Technical Specifications

### Project Structure

```
arweave-upload-dapp/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── .env.example            # VITE_IRYS_NODE, VITE_WALLETCONNECT_PROJECT_ID
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── WalletConnect.tsx
│   │   ├── FileUploader.tsx
│   │   ├── UploadProgress.tsx
│   │   ├── CostEstimate.tsx
│   │   ├── EnsManager.tsx
│   │   └── UploadHistory.tsx
│   ├── hooks/
│   │   ├── useIrysUpload.ts
│   │   ├── useEnsSubdomain.ts
│   │   ├── useCostEstimate.ts
│   │   └── useUploadHistory.ts
│   ├── lib/
│   │   ├── irys.ts          # Irys client init, fund, upload, manifest
│   │   ├── ens.ts           # Subdomain CRUD, content hash encoding
│   │   ├── manifest.ts      # Arweave path manifest builder
│   │   └── utils.ts         # Formatting, validation
│   ├── types/
│   │   └── index.ts
│   └── __tests__/
│       ├── unit/
│       │   ├── irys.test.ts
│       │   ├── ens.test.ts
│       │   ├── manifest.test.ts
│       │   └── hooks/
│       └── e2e/
│           ├── upload-flow.spec.ts
│           └── ens-link.spec.ts
├── public/
└── dist/                    # Build output (gitignored)
```

### Key Dependencies

```json
{
  "dependencies": {
    "@irys/web-upload-ethereum": "^0.x",
    "@irys/web-upload-ethereum-viem-v2": "^0.x",
    "@rainbow-me/rainbowkit": "^2.x",
    "wagmi": "^2.x",
    "viem": "^2.x",
    "@ensdomains/ensjs": "^4.x",
    "@ensdomains/content-hash": "^3.x",
    "@tanstack/react-query": "^5.x",
    "react": "^19.x",
    "react-dom": "^19.x"
  },
  "devDependencies": {
    "vite": "^6.x",
    "vitest": "^3.x",
    "playwright": "^1.x",
    "typescript": "^5.x",
    "tailwindcss": "^4.x"
  }
}
```

### ENS Contract Interaction

```
NameWrapper (0xD4416b13d2b3a9abae7AcD5D6C2BbDBE25686401)
  └─ setSubnodeRecord(parentNode, label, owner, resolver, ttl, fuses, expiry)

PublicResolver (0xF29100983E058B709F3D539b0c765937B804AC15)
  └─ setContenthash(node, ar://{manifestTxId})
```

Content hash encoding for Arweave uses codec `0xb29910` (arweave-ns) via `@ensdomains/content-hash`.

### Upload Flow (Sequence)

1. User selects files → `FileUploader` component
2. `useCostEstimate` calls `irys.getPrice(totalBytes)` → displays ETH cost
3. User confirms → `useIrysUpload` executes:
   - `irys.fund(amount)` → MetaMask tx (ETH to Irys node)
   - Wait for funding confirmation
   - `irys.upload()` each file → collect TX IDs
   - Build path manifest JSON → `irys.upload(manifest)` with content-type `application/x.arweave-manifest+json`
4. Return manifest TX ID → display gateway URL
5. If ENS detected → prompt ENS subdomain flow:
   - Query existing `vN` subdomains under user's ENS name
   - Suggest next version
   - User confirms → MetaMask tx for `setSubnodeRecord` + `setContenthash`
6. Display final URL: `https://vN.name.eth.limo`

---

## Testing Strategy (TDD)

### Unit Tests (Vitest)

| Module | What's tested |
|--------|--------------|
| `lib/irys.ts` | Client init, price calculation, fund amount computation, upload call params, manifest construction |
| `lib/ens.ts` | Subdomain label generation, version increment logic, content hash encoding, node hash computation |
| `lib/manifest.ts` | Manifest JSON structure, path normalization, index file selection |
| `hooks/useIrysUpload` | State transitions (idle → funding → uploading → done → error), error handling |
| `hooks/useEnsSubdomain` | Version detection, subdomain availability check, tx parameter construction |

Mock strategy: Mock `viem` transport and Irys client. No real network calls in unit tests.

### E2E Tests (Playwright)

| Flow | What's tested |
|------|--------------|
| Upload flow | Connect wallet (mock provider) → select files → see cost estimate → confirm → verify TX ID displayed |
| ENS link flow | Connect wallet with ENS → upload → verify subdomain suggestion → confirm → verify final URL |
| Error handling | Reject MetaMask tx → verify graceful error state → retry works |
| No ENS flow | Connect wallet without ENS → upload completes → ENS section shows "no ENS detected" |

E2E uses a local Hardhat node + mock Irys endpoint for deterministic testing.

---

## Success Metrics

### Leading Indicators (measurable within 2 weeks of launch)

- **Upload success rate** ≥ 95% (uploads initiated → manifest TX confirmed)
- **Mean time to upload** < 30s for files under 10MB (excluding MetaMask confirmation time)
- **ENS link adoption** ≥ 40% of uploaders with ENS names opt to create a subdomain

### Lagging Indicators (4-8 weeks)

- **Repeat usage** ≥ 30% of wallets that complete one upload return for a second
- **Unique wallets** per week trending upward after launch
- **ENS subdomain version depth** — average max version number per ENS name (indicates continued use)

---

## Open Questions

| # | Question | Owner |
|---|----------|-------|
| 1 | **Irys node selection** — Use default Irys node or self-hosted? Self-hosted gives upload guarantees but adds infra cost. | Engineering |
| 2 | **ENS content hash codec support** — `arweave-ns` codec (`0xb29910`) is supported for `setContenthash` but some resolvers may not decode it on read. Need to verify eth.limo gateway handles `ar://` resolution. | Engineering |
| 3 | **NameWrapper fuse configuration** — What fuses (if any) should be burned on created subdomains? Burning `CANNOT_UNWRAP` prevents subdomain theft but makes them permanently locked. | Engineering / Product |
| 4 | **Gas sponsorship** — Should we offer gasless ENS subdomain creation via a relayer for better UX? Adds backend complexity. | Product |
| 5 | **Max upload size** — Irys has practical limits per-upload. What's our UI-enforced max? 100MB? 1GB? | Product / Engineering |
| 6 | **Mainnet vs testnet launch** — Ship to Sepolia + Irys devnet first? Or straight to mainnet? | Product |

---

## Timeline Considerations

- **Hard dependency:** Irys SDK browser support must be stable for the target chain (Ethereum mainnet). Currently documented as supported.
- **ENS contract interaction** requires mainnet ETH for gas — testnet (Sepolia) ENS exists but has different contract addresses.
- **Phasing suggestion:**
  - **Phase 1 (2-3 weeks):** Core upload flow (P0-1 through P0-5) + unit tests
  - **Phase 2 (1-2 weeks):** ENS integration (P0-6, P0-7) + e2e tests
  - **Phase 3 (1 week):** Polish, P1 items, production build hardening
- **Risk:** ENS `ar://` content hash resolution via eth.limo is not battle-tested. Needs early spike to validate.

