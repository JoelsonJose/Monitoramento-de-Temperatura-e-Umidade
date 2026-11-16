# API reference

The API is versioned under `/api/v1`. Local development listens on port 3000. Production must be placed behind a TLS reverse proxy before public use.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/health` | None | API and database health |
| POST | `/api/v1/auth/token` | Username and password | Issue a one-hour HS256 bearer token |
| POST | `/api/v1/ingest` | `X-Device-Key` | Validate and store a device reading |
| GET | `/api/v1/readings/latest` | Bearer JWT | Return the latest reading |
| GET | `/api/v1/readings?limit=50&before=...` | Bearer JWT | Return paginated history |

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

Duplicate `(device_id, sequence)` pairs are idempotent. Payloads outside temperature `-40..80 °C` or humidity `0..100%` return `400`. Missing or invalid authentication returns `401`. Per-user object authorization (`403`), rate limiting, full OpenAPI generation and production TLS configuration remain to be completed before the final delivery.
