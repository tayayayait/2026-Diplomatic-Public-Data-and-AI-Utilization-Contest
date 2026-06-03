# Server Storage

Phase 3 adds server-side trip persistence through TanStack server functions.

## Storage File

By default, trips are stored in:

```text
.data/saferoute-trips.json
```

Override the storage directory with:

```powershell
$env:SAFEROUTE_STORAGE_DIR="C:\safe-route-data"
pnpm dev
```

The storage file is intentionally ignored by Git because it can contain itinerary and safety briefing data.

## API Surface

Client code uses `tripStore` as before. The store now syncs through these server functions:

- `listTripsServer`
- `getTripServer`
- `saveTripServer`
- `deleteTripServer`

The server implementation normalizes every trip through the Phase 1 contract before writing it.
