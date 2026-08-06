# ExpansionPunks Next â€” web

The public website for the fully onchain ExpansionPunks migration. Three
pillars: the story behind the collection, the collection itself, and the
migration that moves it onchain (XIP 24) alongside the DAO wind-down (XIP 25).

This directory is published from a private development repo. Edit it there, not
here; direct changes will be overwritten on the next publish.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Staging

`NEXT_PUBLIC_SITE_STAGE` controls how much of the app is live:

| stage     | wallet | migration | chain    |
|-----------|--------|-----------|----------|
| `content` | off    | off       | â€”        |
| `testnet` | gated* | gated*    | Sepolia  |
| `mainnet` | on     | gated*    | Ethereum |

*Testnet requires every Sepolia contract address and its deployment block.
Mainnet migration requires every mainnet contract address, its deployment
block, a dedicated HTTPS RPC, and the public Merkle URL. The site ships at
`content`. See `.env.example` for all variables; no keys are committed.
