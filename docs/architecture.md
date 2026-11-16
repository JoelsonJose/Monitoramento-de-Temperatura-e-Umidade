# System architecture

```mermaid
flowchart LR
  DHT11 --> ESP[ESP32-C3]
  ESP -->|Local HTTP, port 80| WEB[Device status page]
  ESP -->|Local HTTP / device key| API[Local API]
  API --> DB[(PostgreSQL)]
  Browser -->|HTTPS after deployment| API
  API --> DASH[Web dashboard]
  API -. planned .-> ML[Prediction service]
  ESP -. planned: ThingSpeak channel .-> TS[ThingSpeak]
```

The demonstrated path now runs from the DHT11 through the ESP32-C3 to the local API and PostgreSQL. Twelve live board readings were confirmed in the database, with device ID, sequence, UTC timestamp, temperature and humidity. This preview uses HTTP on the private LAN; public HTTPS deployment, ThingSpeak and model serving are not yet demonstrated.

The preview prototype uses one DHT11. Its wiring is documented in [`diagrama_eletrico.svg`](diagrama_eletrico.svg), the component inventory is in [`lista_componentes.md`](lista_componentes.md), and the observable test cases/results are in [`plano_testes.md`](plano_testes.md). F1 Wi-Fi recovery and F3 sensor failure/recovery passed functionally; precise outage and recovery durations were not timed.

| Component | Protocol / port | Current state |
|---|---|---|
| ESP32-C3 local page | HTTP / TCP 80 | Implemented; local page, F1 reconnection and F3 handling/recovery observed on hardware |
| API | HTTP / TCP 3000 on the host's private LAN IP | Live ESP32 ingestion tested; public deployment pending |
| PostgreSQL | TCP 5432, private compose network | Live ESP32 readings persisted; backup/restore pending |
| Public edge / TLS | HTTPS / TCP 443 | Pending hosting and domain |
| Mobile application | HTTPS | Not implemented |
