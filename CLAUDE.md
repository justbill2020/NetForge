# NetForge Core — CLAUDE.md

## What this is
Zero-install single-file PWA for network architecture design and BOM generation.
Distributed to Comcast SAs as a single HTML file. No server, no IT approval required.

## Stack
- React 18 + TypeScript + Vite
- `vite-plugin-singlefile` for the distributable build (`npm run build:single`)
- Zustand for state
- IndexedDB (via `idb`) for local persistence
- No backend, no auth, no cloud dependency

## Architecture
```
src/
  engine/       BOM resolution, constraint evaluation, price list parsing
  plugins/      Connector loader (jsDelivr in prod, local override in dev)
  canvas/       Design canvas — device placement, connections, topology
  ui/           React components
  types/        Shared TypeScript interfaces (ConnectorData, Product, etc.)
```

## Vendor connectors
Connectors live in **separate repos** (`netforge-connector-*`).
They are pure JSON — no code, no build step.
The plugin loader (`src/plugins/loader.ts`) fetches them at runtime from jsDelivr.

### Local dev override
Set env vars to load connectors from local paths instead of jsDelivr:
```
VITE_DEV_NETFORGE_CONNECTOR_MERAKI=/absolute/path/to/netforge-connector-meraki/connector.json
```
Pattern: `VITE_DEV_` + repo name uppercased with dashes → underscores.

## Key files to know
- `src/types/connector.ts` — canonical connector schema types
- `src/plugins/loader.ts` — connector loading logic
- `src/engine/bom.ts` — SKU resolution, design rule evaluation (stub, wire to canvas next)
- `src/engine/priceList.ts` — CSV parser for partner price list imports

## Current state (as of session end)
- [x] Repo scaffolded, Vite + React + TS running
- [x] Connector types defined
- [x] Plugin loader with dev override
- [x] BOM engine stub (SKU resolution works, constraint evaluation stubbed)
- [x] Price list CSV parser
- [ ] Canvas — device placement not yet wired
- [ ] Connector loading wired into UI
- [ ] Meraki connector integrated end-to-end

## Next session priorities
1. Wire `src/plugins/loader.ts` into a Zustand store that holds loaded connectors
2. Build device palette UI — pulls available products from loaded connectors
3. Wire `src/engine/bom.ts` constraint evaluation to canvas device placements
4. Vendor selection modal — choose which connectors to load (by repo/branch)

## Coding conventions
- Functional React only, no class components
- TypeScript strict mode — no `any`
- Engine logic stays in `src/engine/`, never in components
- Connector data is read-only — never mutated at runtime
