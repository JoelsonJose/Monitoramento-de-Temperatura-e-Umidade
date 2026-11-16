# ESP32 Microclimate Monitoring

This project reads temperature and humidity from one DHT11 sensor connected to an ESP32-C3. The firmware samples every five seconds, reports valid readings over Serial, serves a local status page, and sends authenticated readings to a Node.js API and PostgreSQL database. The `render.yaml` Blueprint prepares a public HTTPS deployment; the Render service still needs to be created and verified.

## Team

Homero, Joelson, Lucas Ximenes, Nicollas, Thayanne, João César, and Morgana.

Preview responsibilities are recorded in [`PLANO_ACAO.md`](PLANO_ACAO.md).

Preview PDFs: [technical delivery](entregas/Relatorio_Previa_IoT.pdf) and [presentation](entregas/Apresentacao_Previa_IoT.pdf).

## Hardware

- ESP32-C3 development board
- One DHT11 temperature and humidity sensor
- Breadboard and jumper wires
- Reused enclosure

Connect DHT11 VCC to 3V3, DATA to GPIO 5, and GND to ESP32 GND. Check the sensor board labels and board pinout before powering it. A bare sensor may need a pull-up resistor between DATA and 3V3; some modules include one.

See the [electrical connection diagram](docs/diagrama_eletrico.svg) and [component list](docs/lista_componentes.md).

## Firmware setup

1. Install Arduino IDE, the ESP32 board package, Adafruit DHT sensor library, and Adafruit Unified Sensor library.
2. Copy `credentials.example.h` to `credentials.h` beside `monitoramento.ino` and enter the local 2.4 GHz Wi-Fi network name and password. `credentials.h` is ignored by Git.
3. Open `monitoramento.ino` in Arduino IDE and select **ESP32C3 Dev Module** and the port shown for the connected board.
4. Compile and upload. Open Serial Monitor at 115200 baud.
5. Use the IP printed after Wi-Fi connects to open the local status page on the same Wi-Fi network.

The firmware logs Wi-Fi start, association, IP assignment, and disconnect reason. It retries failed connections with increasing waits up to 30 seconds, without changing Wi-Fi configuration during an active attempt. It periodically samples the DHT11 and distinguishes a failed current read from the most recent valid value. The team observed valid sensor readings and IP `192.168.1.7` in Serial Monitor, then confirmed that the local browser page displays and refreshes temperature and humidity. F1 Wi-Fi loss/recovery and F3 DHT11 failure/recovery passed functionally; outage duration and recovery latency were not timed.

## API and dashboard

The local API uses Node.js 22 and PostgreSQL. Copy `.env.example` to `.env`, replace every example secret, then run `docker compose up --build`. The API listens on port 3000; `/health` checks the service and database. The dashboard is served at `http://<API_BIND_ADDRESS>:3000/` (use `localhost` when the bind address is `127.0.0.1`); sign in with the local `DEMO_USER` and `DEMO_PASSWORD` from `.env`. This is a browser dashboard, separate from the ESP32's status page at `http://<ESP32_IP>/`. It now displays the latest device contact time.

## Render deployment

The root `render.yaml` defines a Node web service, managed PostgreSQL, HTTPS health check, and optional secret environment variables. The Blueprint is deployed at [`https://monitoramento-iot-api.onrender.com`](https://monitoramento-iot-api.onrender.com); on 16/11/2026, `/health` returned `{"status":"ok","database":"connected"}`. The dashboard shell is public and displays a login form. At the time of this check, Render had only the generated/database variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `DEMO_DEVICE_ID`); `DEVICE_API_KEY`, `DEMO_USER`, and `DEMO_PASSWORD` still need to be configured before device ingestion and dashboard login can work. Set secrets in Render only; never commit or share their values. The ESP32's ignored `credentials.h` must use the HTTPS ingest URL, the matching device key, and a trusted root CA before the board can send to the cloud. The free database is only suitable for a short preview and expires after 30 days; preserve/export any evidence you need.

To finish the public path, open the Render service `monitoramento-iot-api` → **Environment** → **Edit** and add `DEVICE_API_KEY`, `DEMO_USER`, and `DEMO_PASSWORD`; optionally add `THINGSPEAK_WRITE_API_KEY` if forwarding to a configured channel is needed. Save to restart the service. Do not paste secret values into GitHub or chat. Copy [`credentials.example.h`](credentials.example.h) to a local, ignored `credentials.h`, use the same device key and `API_URL` shown in that template, add the trusted PEM certificate in `API_ROOT_CA`, then upload the sketch to the ESP32. Verify `/health`, sign in at the root page, and confirm a physical reading appears in PostgreSQL/dashboard.

To enable ThingSpeak, create a channel with field 1 for temperature (°C) and field 2 for humidity (%), then set the channel Write API Key in the ignored local `.env` as `THINGSPEAK_WRITE_API_KEY`. The API forwards physical readings over HTTPS at most once per 16 seconds and logs the HTTP result and entry ID without logging the key. Leave it blank to disable forwarding. Two live writes returned HTTP 200 with entry IDs 1 and 2, 20 seconds apart on 16/11/2026. After a later local API restart, new attempts returned HTTP 400 and need re-verification. The free ThingSpeak rate is 15 seconds per channel.

During the local integration check, both Compose services were healthy; the local dashboard/login worked, protected routes returned HTTP 401 without a token and HTTP 403 for a user without device access, and physical DHT11 readings were confirmed in PostgreSQL. On 16/11/2026, the public Render service deployed commit `8798c9e`; `/health` returned `ok` with the managed database connected, the dashboard login shell loaded, and the unauthenticated latest-readings route returned the expected authentication error. Five route/unit tests passed locally, and all five GitHub Actions runs are green. Public device ingestion, public login/403 behavior, and cloud readings remain unverified because the three required secrets are absent from the Render service and the ESP32 still needs HTTPS endpoint/key/CA configuration.

The API is exposed through Render's HTTPS ingress; PostgreSQL is managed privately by Render and is not exposed as a public service. Firmware supports HTTPS when configured with a trusted PEM certificate as `API_ROOT_CA`; the current ESP32 configuration still needs the Render endpoint/key/CA and must be reflashed before cloud delivery can be verified. Do not commit credentials.

API details: [`docs/api.md`](docs/api.md). Architecture: [`docs/architecture.md`](docs/architecture.md).
Test plan and observed F1/F3 results: [`docs/plano_testes.md`](docs/plano_testes.md).

## Repository guide

- `monitoramento.ino` — ESP32-C3 firmware
- `backend/` — REST API and browser dashboard
- `database/init.sql` — PostgreSQL schema
- `docs/` — architecture, API, and security notes
- `docs/diagrama_eletrico.svg` — ESP32-C3 and DHT11 wiring
- `docs/diagrama_er.md` — database entities and relationships
- `render.yaml` — Render web service and PostgreSQL Blueprint
- `docs/lista_componentes.md` — bill of materials and known quantities
- `docs/plano_testes.md` — preview test cases and evidence
- `docs/ia/baseline_previa.md` — preview forecasting problem and measured persistence baseline
- `docs/ux/pesquisa_previa.md` — interview guide; real responses still need to be collected
- `docs/pitch/opening_english.md` — two-minute English opening script assigned to Nicollas
- `REQUISITOS_UC.md` — evidence matrix for the eight course units
- `RESILIENCIA.md` — resilience requirements and test record
- `PLANO_ACAO.md` — open work, owners, and evidence to collect

## Current limitations

The preview hardware uses the team's selected single DHT11 sensor. The sensor and reused enclosure are not calibrated or certified for industrial cold rooms. Public cloud deployment is prepared but not yet verified; mobile app, final AI model, primary user study, duplicate/replay testing, and advanced security controls remain separate work. ThingSpeak returned HTTP 200 with entry IDs 1 and 2 in earlier tests; later attempts after a local API restart returned HTTP 400 and need re-verification. See the action plan and evidence matrix for current statuses.
