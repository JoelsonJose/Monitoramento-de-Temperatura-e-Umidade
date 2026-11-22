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
  CONSTRAINT readings_device_fk FOREIGN KEY(device_id) REFERENCES devices(device_id),
  UNIQUE(device_id, sequence)
);

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

CREATE INDEX IF NOT EXISTS readings_device_timestamp_idx ON readings(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS lotes_device_idx ON lotes(device_id);

-- SEED DE DEMONSTRAÇÃO DO SELO DE QUALIDADE DA MANGA (REGRA DAS DUAS ETAPAS >= 70%)
INSERT INTO devices(device_id, name, last_seen_at)
VALUES ('esp32c3-01', 'ESP32-C3 Manga Trace', NOW())
ON CONFLICT(device_id) DO UPDATE SET last_seen_at = NOW();

-- Lotes cadastrados
INSERT INTO lotes (id_lote, codigo_lote, nome, variedade, device_id, etapa_atual, data_inicio, data_colheita, data_fim, percentual_pomar, percentual_estoque, percentual_conformidade, status_selo)
VALUES 
  -- LOTE 1: COM SELO (Aprovado em AMBAS as etapas: Pomar 100% e Estoque 100%)
  (1, 'LOTE-MNG-2026-01', 'Safra Vale do São Francisco', 'Tommy Atkins', 'esp32c3-01', 'estoque', 
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '2 days', 100.0, 100.0, 100.0, 'aprovado'),

  -- LOTE 2: SEM SELO (Aprovado no Pomar, mas REPROVADO no Estoque por quebra de refrigeração)
  (2, 'LOTE-MNG-2026-02', 'Safra Petrolina', 'Palmer', 'esp32c3-01', 'estoque', 
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', 100.0, 33.3, 66.7, 'reprovado'),

  -- LOTE 3: SEM SELO (REPROVADO no Pomar por estresse térmico, apesar do Estoque estar bom)
  (3, 'LOTE-MNG-2026-03', 'Safra Sertão Central', 'Keitt', 'esp32c3-01', 'estoque', 
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', 33.3, 100.0, 66.7, 'reprovado'),

  -- LOTE 4: COM SELO (Aprovado em AMBAS as etapas)
  (4, 'LOTE-MNG-2026-04', 'Safra Juazeiro', 'Kent', 'esp32c3-01', 'estoque', 
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '12 hours', 100.0, 100.0, 100.0, 'aprovado'),

  -- LOTE 5: EM ANÁLISE (Pomar Ativo, ainda não foi colhido para a câmara fria)
  (5, 'LOTE-MNG-2026-05', 'Safra Maturação no Pé', 'Tommy Atkins', 'esp32c3-01', 'pomar', 
   NOW() - INTERVAL '6 hours', NULL, NULL, 100.0, 0, 100.0, 'em_analise')
ON CONFLICT(codigo_lote) DO UPDATE SET 
  percentual_pomar = EXCLUDED.percentual_pomar,
  percentual_estoque = EXCLUDED.percentual_estoque,
  percentual_conformidade = EXCLUDED.percentual_conformidade,
  status_selo = EXCLUDED.status_selo;

-- Leituras do Lote 1 (Pomar: dias -30 a -12 | Estoque: dias -12 a -2)
INSERT INTO readings (device_id, sequence, timestamp, temperature_c, humidity_percent, luminosity_lux)
VALUES
  -- Pomar Lote 1 (Temp 26-28°C, Umid 54-60%, Lux 48k-52k)
  ('esp32c3-01', 101, NOW() - INTERVAL '25 days', 26.5, 58.0, 48000),
  ('esp32c3-01', 102, NOW() - INTERVAL '22 days', 27.2, 54.0, 51000),
  ('esp32c3-01', 103, NOW() - INTERVAL '18 days', 26.0, 60.0, 49000),
  ('esp32c3-01', 104, NOW() - INTERVAL '15 days', 27.8, 56.0, 52000),
  -- Estoque Lote 1 (Temp 11-12°C, Umid 87-89%, Lux 15-25)
  ('esp32c3-01', 105, NOW() - INTERVAL '10 days', 11.5, 88.0, 20),
  ('esp32c3-01', 106, NOW() - INTERVAL '8 days', 12.0, 87.0, 15),
  ('esp32c3-01', 107, NOW() - INTERVAL '5 days', 11.8, 89.0, 25),
  ('esp32c3-01', 108, NOW() - INTERVAL '3 days', 11.2, 88.5, 18),

  -- Pomar Lote 2 (Bom: Temp 27°C, Umid 58%, Lux 50k)
  ('esp32c3-01', 201, NOW() - INTERVAL '22 days', 27.0, 58.0, 50000),
  ('esp32c3-01', 202, NOW() - INTERVAL '15 days', 26.5, 60.0, 49000),
  -- Estoque Lote 2 (Falha: Temp 19-23°C alta, Umid 60% baixa)
  ('esp32c3-01', 203, NOW() - INTERVAL '8 days', 19.5, 62.0, 40),
  ('esp32c3-01', 204, NOW() - INTERVAL '5 days', 21.0, 58.0, 60),
  ('esp32c3-01', 205, NOW() - INTERVAL '2 days', 22.5, 55.0, 50),

  -- Pomar Lote 3 (Falha: Temp 37-39°C alta, Umid 22-26% seca)
  ('esp32c3-01', 301, NOW() - INTERVAL '18 days', 37.5, 25.0, 50000),
  ('esp32c3-01', 302, NOW() - INTERVAL '12 days', 38.8, 22.0, 52000),
  -- Estoque Lote 3 (Bom: Temp 11.5°C, Umid 88%, Lux 20)
  ('esp32c3-01', 303, NOW() - INTERVAL '6 days', 11.5, 88.0, 20),
  ('esp32c3-01', 304, NOW() - INTERVAL '3 days', 12.1, 87.0, 18),

  -- Pomar Lote 4 (Bom: Temp 26°C, Umid 59%, Lux 48k)
  ('esp32c3-01', 401, NOW() - INTERVAL '15 days', 26.0, 59.0, 48000),
  ('esp32c3-01', 402, NOW() - INTERVAL '10 days', 27.0, 55.0, 51000),
  -- Estoque Lote 4 (Bom: Temp 12°C, Umid 87%, Lux 22)
  ('esp32c3-01', 403, NOW() - INTERVAL '5 days', 12.0, 87.0, 22),
  ('esp32c3-01', 404, NOW() - INTERVAL '2 days', 11.8, 88.0, 15)
ON CONFLICT (device_id, sequence) DO NOTHING;
