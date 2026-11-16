# ESP32 Microclimate Monitoring

This project reads temperature and humidity from one DHT11 sensor connected to an ESP32-C3. The firmware samples every five seconds, reports valid readings over Serial, serves a local status page, and sends authenticated readings to a local Node.js API and PostgreSQL database. Public HTTPS deployment is still pending.

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

The local API uses Node.js 22 and PostgreSQL. Copy `.env.example` to `.env`, replace every example secret, then run `docker compose up --build`. The API listens on port 3000; `/health` checks the service and database. The dashboard is served at `/`. During the local integration check, both Compose services were healthy; `/health` returned `ok` with the database connected, the dashboard and demo login returned HTTP 200, and the protected route returned HTTP 401 without a token. The uploaded ESP32-C3 then sent at least 12 DHT11 readings with device ID, sequence, and UTC timestamp; the records were confirmed in PostgreSQL. The preview uses HTTP on the private LAN; deploy behind HTTPS before public exposure.

Before exposing the API publicly, put it behind an HTTPS reverse proxy or a cloud provider's TLS ingress. Do not expose PostgreSQL to the public Internet. Firmware supports HTTPS when configured with a trusted PEM certificate as `API_ROOT_CA`; the current local preview uses the private-LAN endpoint and a device key. Do not commit credentials. Public cloud delivery has not yet been verified on hardware.

API details: [`docs/api.md`](docs/api.md). Architecture: [`docs/architecture.md`](docs/architecture.md).
Test plan and observed F1/F3 results: [`docs/plano_testes.md`](docs/plano_testes.md).

## Repository guide

- `monitoramento.ino` — ESP32-C3 firmware
- `backend/` — REST API and browser dashboard
- `database/init.sql` — PostgreSQL schema
- `docs/` — architecture, API, and security notes
- `docs/diagrama_eletrico.svg` — ESP32-C3 and DHT11 wiring
- `docs/lista_componentes.md` — bill of materials and known quantities
- `docs/plano_testes.md` — preview test cases and evidence
- `REQUISITOS_UC.md` — evidence matrix for the eight course units
- `RESILIENCIA.md` — resilience requirements and test record
- `PLANO_ACAO.md` — open work, owners, and evidence to collect

## Current limitations

The present preview hardware uses one DHT11 module; the team will explain the available hardware during the demonstration. The sensor and reused enclosure are not calibrated or certified for industrial cold rooms. Public cloud hosting, ThingSpeak, mobile app, AI model, user study, duplicate/replay testing, and full security controls remain open work. See the action plan and evidence matrix for current statuses.
