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
| `testnet` | on     | on        | Sepolia  |
| `mainnet` | on     | gated*    | Ethereum |

*Mainnet migration stays gated until `NEXT_PUBLIC_MAINNET_MIGRATION_ADDRESS`
is set. The site ships at `content`. See `.env.example` for all variables; no
keys are committed.
