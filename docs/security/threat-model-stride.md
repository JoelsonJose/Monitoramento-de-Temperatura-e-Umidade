# STRIDE threat model

Scope: DHT11 sensor, ESP32-C3, local Wi-Fi, ingestion API, PostgreSQL and dashboard. This is an initial design exercise, not a completed security assessment.

| STRIDE category | Example threat | Current / planned mitigation | Remaining evidence |
|---|---|---|---|
| Spoofing | Attacker submits fabricated device readings | Device key required by ingestion route | Rotate and store key in deployment secret manager; add TLS on device-to-API path |
| Tampering | Reading altered in transit or database | Input bounds, authenticated ingestion, DB constraints | HTTPS deployment and integrity test |
| Repudiation | Team cannot identify which device sent a reading | Device ID, sequence and timestamp in API schema | Firmware identity/time support and audit logs |
| Information disclosure | Wi-Fi or API secrets published in source | Local `credentials.h` ignored by Git; `.env` ignored | Audit Git history and verify hosted secret handling |
| Denial of service | Repeated requests exhaust API or database | Request body size limited to 16 KiB; health check | Rate limiting, resource quotas and load test |
| Elevation of privilege | User reads another user's device data | No multi-user object model yet | Implement ownership checks before claiming authorization |

The code does not yet meet the final requirements for object-level authorization, public TLS, rate limiting, ZAP, or a documented LGPD data lifecycle.
