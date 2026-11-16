CREATE TABLE IF NOT EXISTS devices (
  device_id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(120) NOT NULL DEFAULT 'DHT11 ESP32-C3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(80) PRIMARY KEY,
  role VARCHAR(30) NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(80) NOT NULL,
  sequence BIGINT NOT NULL CHECK (sequence >= 0),
  timestamp TIMESTAMPTZ NOT NULL,
  temperature_c REAL NOT NULL CHECK (temperature_c BETWEEN -40 AND 80),
  humidity_percent REAL NOT NULL CHECK (humidity_percent BETWEEN 0 AND 100),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT readings_device_fk FOREIGN KEY(device_id) REFERENCES devices(device_id),
  UNIQUE(device_id, sequence)
);

CREATE TABLE IF NOT EXISTS device_access (
  username VARCHAR(80) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  device_id VARCHAR(80) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY(username, device_id)
);

CREATE INDEX IF NOT EXISTS readings_device_timestamp_idx ON readings(device_id, timestamp DESC);
