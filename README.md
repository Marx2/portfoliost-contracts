# portfoliost-contracts

Monorepo containing two independently-published `@marx2` packages:

| Package | Description | Workflow |
|---------|-------------|----------|
| `contracts/` | `@marx2/contracts` — OpenAPI spec, FX helpers, currencies | `release-contracts.yml` |
| `otel/` | `@marx2/otel` — shared OpenTelemetry bootstrap helpers for Hono services | `release-otel.yml` |

Each subfolder has its own `package.json`, `tsconfig.json`, semver version, and CI workflow.

## Development

```bash
# contracts
cd contracts && npm install && npm run build && npm test

# otel
cd otel && npm install && npm run build
```

## Publishing

Push to `main` — CI auto-bumps the patch version, commits, tags, and publishes to GitHub Packages.

- `contracts/**` changes → `@marx2/contracts` (tagged `v*`)
- `otel/**` changes → `@marx2/otel` (tagged `otel-v*`)

## Structure

- `.npmrc` — shared GitHub Packages registry config (both packages use `@marx2` scope)
- `.gitignore` — shared ignore rules
- `stoxly-reference/` — original Stoxly API spec (reference only)
