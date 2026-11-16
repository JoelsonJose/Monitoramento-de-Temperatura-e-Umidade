export async function migrate(db, { demoUser, demoDeviceId }) {
  await db.query(`
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
      UNIQUE(device_id, sequence)
    );
    INSERT INTO devices(device_id, last_seen_at)
      SELECT device_id, MAX(received_at) FROM readings GROUP BY device_id
      ON CONFLICT(device_id) DO UPDATE SET last_seen_at = GREATEST(devices.last_seen_at, EXCLUDED.last_seen_at);
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'readings_device_fk') THEN
        ALTER TABLE readings ADD CONSTRAINT readings_device_fk
          FOREIGN KEY(device_id) REFERENCES devices(device_id);
      END IF;
    END $$;
    CREATE TABLE IF NOT EXISTS device_access (
      username VARCHAR(80) NOT NULL REFERENCES users(username) ON DELETE CASCADE,
      device_id VARCHAR(80) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      can_read BOOLEAN NOT NULL DEFAULT TRUE,
      PRIMARY KEY(username, device_id)
    );
    CREATE INDEX IF NOT EXISTS readings_device_timestamp_idx ON readings(device_id, timestamp DESC);
  `);

  if (demoUser) {
    await db.query(`INSERT INTO users(username, role) VALUES($1, 'admin') ON CONFLICT(username) DO NOTHING`, [demoUser]);
  }
  if (demoUser && demoDeviceId) {
    await db.query(`INSERT INTO devices(device_id) VALUES($1) ON CONFLICT(device_id) DO NOTHING`, [demoDeviceId]);
    await db.query(`INSERT INTO device_access(username, device_id) VALUES($1, $2) ON CONFLICT DO NOTHING`, [demoUser, demoDeviceId]);
  }
}
