# Fernway Parcel Status API — v1 (fictional)

The current API documentation for the endpoint the demo will call. **This
API does not exist on any network.** A rehearsal implements it as a local
stub behind the template's operation-runner seam — in the spirit of the
harness's own fake slow integration — using the deterministic sample data
below, so every rehearsal builds against identical inputs.

- Base URL: `https://api.fernway-parcel.example/v1`
- Auth: `authorization: Bearer <temporary token>` on every request. Tokens
  come from the sponsor booth — see `../credentials/temporary-credentials.md`.
  The local stub accepts any non-empty token.
- Content type: `application/json` responses only.

## GET /v1/parcels/{parcelId}

Returns the parcel's current status and its **latest** scan event.

### Response — 200

```json
{
  "parcelId": "FW-2417-DEMO",
  "status": "in_transit",
  "lastScan": {
    "location": "Rotterdam sort hub",
    "scannedAt": "2026-03-14T09:12:40Z",
    "event": "line_haul_departed"
  },
  "checksum": "<hex sha-256, see rule below>"
}
```

- `status` vocabulary: `accepted` · `in_transit` · `out_for_delivery` ·
  `delivered` · `exception`.
- **Checksum rule**: `checksum` is the lowercase hex SHA-256 of the UTF-8
  string `parcelId + ":" + lastScan.scannedAt + ":" + lastScan.event`.
  Verify it client-side; a response whose checksum does not recompute is
  corrupt and must be treated as a failure, not shown to the audience.

### Errors

| Status | Body `error` | When |
|---|---|---|
| 401 | `missing_token` | `authorization` header absent or blank |
| 404 | `unknown_parcel` | parcel ID not in the network |
| 503 | `scan_network_busy` | transient; retry after the `retry-after` header (seconds) |

Error bodies: `{ "error": "<code>", "detail": "<human sentence>" }`. No
other fields; tokens never echo back in any response.

### Latency

p50 ≈ 250 ms, p95 ≈ 800 ms. The sandbox occasionally holds a request for
several seconds during scan-network sync — callers are expected to enforce
their own time budget rather than wait indefinitely. (This is the behavior
the operation-runner seam's bounded wait exists to absorb; a faithful stub
should make the slow case reproducible.)

## Deterministic sample data (sandbox)

The sandbox — and therefore the rehearsal stub — knows exactly these
parcels, frozen in time:

### `FW-2417-DEMO` — the demo parcel, `in_transit`

| # | location | scannedAt | event |
|---|---|---|---|
| 1 | Alkmaar pickup point | 2026-03-13T16:05:11Z | accepted_from_sender |
| 2 | Rotterdam sort hub | 2026-03-14T07:48:02Z | arrived_at_hub |
| 3 | Rotterdam sort hub | 2026-03-14T09:12:40Z | line_haul_departed |

`lastScan` is row 3. Its checksum input string is
`FW-2417-DEMO:2026-03-14T09:12:40Z:line_haul_departed`.

### `FW-0000-VOID` — always 404

Reserved so the unknown-parcel path can be demonstrated on purpose.

Any other parcel ID: also 404. The sandbox never invents data.
