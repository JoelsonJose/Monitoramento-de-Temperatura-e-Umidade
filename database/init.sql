CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(80) NOT NULL,
  sequence BIGINT NOT NULL CHECK (sequence >= 0),
  timestamp TIMESTAMPTZ NOT NULL,
  temperature_c REAL NOT NULL CHECK (temperature_c BETWEEN -40 AND 80),
  humidity_percent REAL NOT NULL CHECK (humidity_percent BETWEEN 0 AND 100),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, sequence)
);
CREATE INDEX IF NOT EXISTS readings_device_timestamp_idx ON readings(device_id, timestamp DESC);
