# Database ER diagram

```mermaid
erDiagram
  USERS ||--o{ DEVICE_ACCESS : authorized_for
  DEVICES ||--o{ DEVICE_ACCESS : grants
  DEVICES ||--o{ READINGS : records
  USERS {
    varchar username PK
    varchar role
    timestamptz created_at
  }
  DEVICES {
    varchar device_id PK
    varchar name
    timestamptz created_at
    timestamptz last_seen_at
  }
  DEVICE_ACCESS {
    varchar username PK, FK
    varchar device_id PK, FK
    boolean can_read
  }
  READINGS {
    bigint id PK
    varchar device_id FK
    bigint sequence
    timestamptz timestamp
    real temperature_c
    real humidity_percent
    timestamptz received_at
  }
```

The API migration creates these tables on startup, backfills device rows for existing measurements, seeds the configured demo user and device, and updates `devices.last_seen_at` whenever valid device traffic arrives. `readings` has a unique constraint on `(device_id, sequence)` to make duplicate submissions idempotent.
