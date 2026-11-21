export async function migrate(db, { demoUser, demoDeviceId }) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id VARCHAR(80) PRIMARY KEY,
      name VARCHAR(120) NOT NULL DEFAULT 'ESP32-C3 Manga Trace',
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
      luminosity_lux REAL CHECK (luminosity_lux >= 0),
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(device_id, sequence)
    );
    ALTER TABLE readings ADD COLUMN IF NOT EXISTS luminosity_lux REAL CHECK (luminosity_lux >= 0);

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

    CREATE TABLE IF NOT EXISTS lotes (
      id_lote SERIAL PRIMARY KEY,
      codigo_lote VARCHAR(50) UNIQUE NOT NULL,
      nome VARCHAR(120) NOT NULL,
      variedade VARCHAR(60) NOT NULL DEFAULT 'Tommy Atkins',
      device_id VARCHAR(80) REFERENCES devices(device_id) ON DELETE SET NULL,
      etapa_atual VARCHAR(20) NOT NULL DEFAULT 'pomar' CHECK (etapa_atual IN ('pomar', 'estoque')),
      data_inicio TIMESTAMPTZ NOT NULL,
      data_colheita TIMESTAMPTZ,
      data_fim TIMESTAMPTZ,
      percentual_pomar REAL DEFAULT 0,
      percentual_estoque REAL DEFAULT 0,
      percentual_conformidade REAL DEFAULT 0,
      status_selo VARCHAR(30) NOT NULL DEFAULT 'em_analise' CHECK (status_selo IN ('aprovado', 'reprovado', 'em_analise')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE lotes ADD COLUMN IF NOT EXISTS data_colheita TIMESTAMPTZ;
    ALTER TABLE lotes ADD COLUMN IF NOT EXISTS percentual_pomar REAL DEFAULT 0;
    ALTER TABLE lotes ADD COLUMN IF NOT EXISTS percentual_estoque REAL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS readings_device_timestamp_idx ON readings(device_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS lotes_device_idx ON lotes(device_id);
  `);

  if (demoUser) {
    await db.query(`INSERT INTO users(username, role) VALUES($1, 'admin') ON CONFLICT(username) DO NOTHING`, [demoUser]);
  }
  if (demoUser && demoDeviceId) {
    await db.query(`INSERT INTO devices(device_id) VALUES($1) ON CONFLICT(device_id) DO NOTHING`, [demoDeviceId]);
    await db.query(`INSERT INTO device_access(username, device_id) VALUES($1, $2) ON CONFLICT DO NOTHING`, [demoUser, demoDeviceId]);

    // Seed de lotes com regra das duas etapas
    await db.query(`
      INSERT INTO lotes (id_lote, codigo_lote, nome, variedade, device_id, etapa_atual, data_inicio, data_colheita, data_fim, percentual_pomar, percentual_estoque, percentual_conformidade, status_selo)
      VALUES 
        (1, 'LOTE-MNG-2026-01', 'Safra Vale do São Francisco (Certificação Completa)', 'Tommy Atkins', $1, 'estoque', 
         NOW() - INTERVAL '30 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days', 88.5, 92.0, 90.3, 'aprovado'),
        (2, 'LOTE-MNG-2026-02', 'Câmara Fria Pós-Colheita (Falha Térmica no Estoque)', 'Palmer', $1, 'estoque', 
         NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', 85.0, 48.0, 66.5, 'reprovado'),
        (3, 'LOTE-MNG-2026-03', 'Safra Sertão Central (Estresse Térmico no Pomar)', 'Keitt', $1, 'estoque', 
         NOW() - INTERVAL '20 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', 42.0, 90.0, 66.0, 'reprovado'),
        (4, 'LOTE-MNG-2026-04', 'Safra Petrolina - Exportação Europa', 'Kent', $1, 'estoque', 
         NOW() - INTERVAL '18 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '12 hours', 79.0, 84.5, 81.8, 'aprovado'),
        (5, 'LOTE-MNG-2026-05', 'Lote Atual em Maturação (Pendente Câmara Fria)', 'Tommy Atkins', $1, 'pomar', 
         NOW() - INTERVAL '6 hours', NULL, NULL, 89.0, 0, 89.0, 'em_analise')
      ON CONFLICT(codigo_lote) DO UPDATE SET 
        percentual_pomar = EXCLUDED.percentual_pomar,
        percentual_estoque = EXCLUDED.percentual_estoque,
        percentual_conformidade = EXCLUDED.percentual_conformidade,
        status_selo = EXCLUDED.status_selo
    `, [demoDeviceId]);

    // Seed de leituras
    await db.query(`
      INSERT INTO readings (device_id, sequence, timestamp, temperature_c, humidity_percent, luminosity_lux)
      VALUES
        -- Pomar Lote 1
        ($1, 101, NOW() - INTERVAL '25 days', 26.5, 58.0, 48000),
        ($1, 102, NOW() - INTERVAL '22 days', 27.2, 54.0, 51000),
        ($1, 103, NOW() - INTERVAL '18 days', 26.0, 60.0, 49000),
        ($1, 104, NOW() - INTERVAL '15 days', 27.8, 56.0, 52000),
        -- Estoque Lote 1
        ($1, 105, NOW() - INTERVAL '10 days', 11.5, 88.0, 20),
        ($1, 106, NOW() - INTERVAL '8 days', 12.0, 87.0, 15),
        ($1, 107, NOW() - INTERVAL '5 days', 11.8, 89.0, 25),
        ($1, 108, NOW() - INTERVAL '3 days', 11.2, 88.5, 18),

        -- Pomar Lote 2
        ($1, 201, NOW() - INTERVAL '22 days', 27.0, 58.0, 50000),
        ($1, 202, NOW() - INTERVAL '15 days', 26.5, 60.0, 49000),
        -- Estoque Lote 2
        ($1, 203, NOW() - INTERVAL '8 days', 19.5, 62.0, 40),
        ($1, 204, NOW() - INTERVAL '5 days', 21.0, 58.0, 60),
        ($1, 205, NOW() - INTERVAL '2 days', 22.5, 55.0, 50),

        -- Pomar Lote 3
        ($1, 301, NOW() - INTERVAL '18 days', 37.5, 25.0, 50000),
        ($1, 302, NOW() - INTERVAL '12 days', 38.8, 22.0, 52000),
        -- Estoque Lote 3
        ($1, 303, NOW() - INTERVAL '6 days', 11.5, 88.0, 20),
        ($1, 304, NOW() - INTERVAL '3 days', 12.1, 87.0, 18),

        -- Pomar Lote 4
        ($1, 401, NOW() - INTERVAL '15 days', 26.0, 59.0, 48000),
        ($1, 402, NOW() - INTERVAL '10 days', 27.0, 55.0, 51000),
        -- Estoque Lote 4
        ($1, 403, NOW() - INTERVAL '5 days', 12.0, 87.0, 22),
        ($1, 404, NOW() - INTERVAL '2 days', 11.8, 88.0, 15)
      ON CONFLICT (device_id, sequence) DO NOTHING
    `, [demoDeviceId]);
  }
}
