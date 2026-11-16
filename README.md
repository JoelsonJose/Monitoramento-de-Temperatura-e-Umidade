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

The root `render.yaml` defines a Node web service, managed PostgreSQL, HTTPS health check, and secret environment variables. Connect this repository to Render and create the Blueprint. Render prompts for `DEVICE_API_KEY`, `DEMO_USER`, `DEMO_PASSWORD`, and `THINGSPEAK_WRITE_API_KEY`; do not commit those values. The service is not considered deployed until Render provides a URL and `/health` plus physical device ingestion are verified. Configure the ESP32's ignored `credentials.h` with that URL, the device key, and trusted root CA before testing board-to-cloud HTTPS. The free database is only suitable for a short preview and expires after 30 days; preserve/export any evidence you need.

To enable ThingSpeak, create a channel with field 1 for temperature (°C) and field 2 for humidity (%), then set the channel Write API Key in the ignored local `.env` as `THINGSPEAK_WRITE_API_KEY`. The API forwards physical readings over HTTPS at most once per 16 seconds and logs the HTTP result and entry ID without logging the key. Leave it blank to disable forwarding. Two live writes returned HTTP 200 with entry IDs 1 and 2, 20 seconds apart on 16/11/2026. After a later local API restart, new attempts returned HTTP 400 and need re-verification. The free ThingSpeak rate is 15 seconds per channel.

During the local integration check, both Compose services were healthy; `/health` returned `ok` with the database connected, the dashboard and demo login returned HTTP 200, the protected route returned HTTP 401 without a token, and an unauthorized device returned HTTP 403. The uploaded ESP32-C3 sent physical DHT11 readings with device ID, sequence, and UTC timestamp; the records were confirmed in PostgreSQL. Five route/unit tests pass locally; the GitHub Actions workflow is configured, but its run for the latest commit has not yet been verified. Public Render deployment and end-to-end device ingestion over HTTPS remain unverified.

Before exposing the API publicly, put it behind an HTTPS reverse proxy or a cloud provider's TLS ingress. Do not expose PostgreSQL to the public Internet. Firmware supports HTTPS when configured with a trusted PEM certificate as `API_ROOT_CA`; the current local preview uses the private-LAN endpoint and a device key. Do not commit credentials. Public cloud delivery has not yet been verified on hardware.

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
- `REQUISITOS_UC.md` — evidence matrix for the eight course units
- `RESILIENCIA.md` — resilience requirements and test record
- `PLANO_ACAO.md` — open work, owners, and evidence to collect

## Current limitations

The preview hardware uses the team's selected single DHT11 sensor. The sensor and reused enclosure are not calibrated or certified for industrial cold rooms. Public cloud deployment is prepared but not yet verified; mobile app, final AI model, primary user study, duplicate/replay testing, and advanced security controls remain separate work. ThingSpeak returned HTTP 200 with entry IDs 1 and 2 in earlier tests; later attempts after a local API restart returned HTTP 400 and need re-verification. See the action plan and evidence matrix for current statuses.
