# API reference

The API is versioned under `/api/v1`. Local development listens on port 3000. The root `render.yaml` prepares the Render web service and managed PostgreSQL; the service still needs to be deployed and its public URL verified.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/health` | None | API and database health |
| POST | `/api/v1/auth/token` | Username and password | Issue a one-hour HS256 bearer token |
| POST | `/api/v1/ingest` | `X-Device-Key` | Validate and store a device reading |
| GET | `/api/v1/readings/latest` | Bearer JWT | Return the latest reading |
| GET | `/api/v1/readings?limit=50&before=...` | Bearer JWT | Return paginated history |
| GET | `/api/v1/devices/{device_id}` | Bearer JWT with device access | Return device metadata and last contact; `403` if the signed-in user lacks access |
| GET | `/api/v1/devices/{device_id}/readings` | Bearer JWT with device access | Return up to 100 readings for that device; `403` if the signed-in user lacks access |

Ingestion JSON:

```json
{
  "device_id": "esp32c3-01",
  "sequence": 1,
  "timestamp": "2026-11-15T12:00:00Z",
  "temperature_c": 31.3,
  "humidity_percent": 65.0
}
```

Duplicate `(device_id, sequence)` pairs are idempotent. Payloads outside temperature `-40..80 °C` or humidity `0..100%` return `400`. Missing or invalid authentication returns `401`. Device-level access is stored in `device_access`; a valid JWT without access receives `403`. Route behavior is covered by automated HTTP tests in `backend/src/server.test.js` and runs in GitHub Actions. Render TLS and public service reachability still require deployment verification.

On API startup, `backend/src/migrate.js` creates or upgrades `devices`, `users`, `device_access`, and `readings`, backfills existing devices, and seeds the configured demo account/device. Ingest updates `devices.last_seen_at`; the dashboard displays this heartbeat value.

## Optional ThingSpeak forwarding

Set `THINGSPEAK_WRITE_API_KEY` only in the ignored local `.env` after creating a channel with field 1 for temperature (°C) and field 2 for humidity (%). For each new physical reading, the API may forward values to `https://api.thingspeak.com/update` over HTTPS, limited to one write per 16 seconds. Successful responses are logged as `thingspeak_write_ok` with HTTP status and entry ID; the key is never logged. Leave the variable empty to disable forwarding. Live writes were verified on 16/11/2026: HTTP 200 with entry IDs 1 and 2, 20 seconds apart.
