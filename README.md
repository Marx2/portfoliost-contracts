# @marx2/contracts

Portfoliost API contract — OpenAPI 3.0.3 spec shared by frontend and backend.

## Usage

```bash
npm install @marx2/contracts
```

The package exports `openapi.yaml` as the single source of truth for API types.

### Frontend (openapi-typescript)

```bash
npx openapi-typescript node_modules/@marx2/contracts/openapi.yaml -o generated/api-types.d.ts
```

### Backend (hono-zod-openapi)

```ts
import spec from "@marx2/contracts/openapi.yaml" with { type: "yaml" }
```

## Publishing

Push to `main` → GitHub Actions publishes to GitHub Packages automatically.

## Structure

- `openapi.yaml` — source-of-truth spec
- `stoxly-reference/` — original Stoxly API spec (reference only)
