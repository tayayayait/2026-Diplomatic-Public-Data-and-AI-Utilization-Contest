# Development Workflow

This guide defines the local commands for SafeRoute AI development.

## Package Manager

Use `pnpm` for dependency installation.

```powershell
pnpm install
```

## Local Development

```powershell
pnpm dev
```

## Public Data Mode

Real public data calls require a server-only API key:

```powershell
$env:DATA_GO_KR_SERVICE_KEY="..."
pnpm dev
```

Without `DATA_GO_KR_SERVICE_KEY`, the app falls back to demo public data. To force demo mode even when a key is present:

```powershell
$env:PUBLIC_DEMO_MODE="true"
pnpm dev
```

## Server Storage

Trips are persisted on the server in `.data/saferoute-trips.json` by default. To use another directory:

```powershell
$env:SAFEROUTE_STORAGE_DIR="C:\safe-route-data"
pnpm dev
```

## Document Upload

The new trip screen accepts PDF, JPG, PNG, TXT, and DOCX files. Uploads are processed in memory and original files are not persisted. TXT, DOCX, and simple text PDFs are parsed locally; JPG/PNG files are accepted but still require OCR in a later Gemini multimodal phase.

## Gemini Fallback

Gemini briefing output is schema-checked on the server. Invalid JSON is retried once. The briefing prompt receives an `available_evidence` list of successful public-data API fields, and `top_risks` must cite those pairs. If the final response references nonexistent public-data evidence, the server filters unsupported content and reports evidence mismatch; schema failures still return a public-data fallback briefing.

## Verification

Run unit tests:

```powershell
npm test
```

Run the same test suite through pnpm:

```powershell
pnpm test
```

Run lint:

```powershell
pnpm lint
```

Run a production build:

```powershell
pnpm build
```

## End-to-End Tests

Playwright is installed for later UI and accessibility coverage.

```powershell
pnpm test:e2e
```

Browser binaries may need to be installed before the first E2E run:

```powershell
pnpm exec playwright install
```
