# Resilience requirements and test record

| ID | Requirement | Current implementation | Evidence / status |
|---|---|---|---|
| R1 | Automatic Wi-Fi reconnection | Wi-Fi event logging and controlled retries with increasing waits up to 30 seconds | Functional F1 recovery confirmed after modem outage; outage/recovery times not measured |
| R2 | Buffer and resend readings | No offline buffer | Pending |
| R3 | Device ID, sequence and UTC timestamp | Firmware sends all three fields with every valid reading; 12 live rows confirmed in PostgreSQL | Confirmed for local ingestion |
| R4 | Watchdog and recovery after power loss | Platform watchdog behavior not configured or tested explicitly | Pending |
| R5 | Invalid sensor reading is not accepted as valid | NaN is reported and not substituted as current data | Physical F3 failure detection and recovery passed; recovery latency not measured |
| R6 | Remaining components degrade gracefully | Local page can show Wi-Fi state; cloud/mobile degradation not implemented | Partial |
| R7 | Heartbeat and last contact | No cloud heartbeat endpoint connected to the device | Pending |
| R8 | Cloud service restart and tested database restore | Docker Compose API and PostgreSQL started healthy; `/health` confirmed database connection. Backup/restore not configured | Local startup and health passed; restore pending |

## Failure test record

| Test | Procedure | Result | Recovery time / loss |
|---|---|---|---|
| Baseline local monitoring | Request `http://192.168.1.7/` while the board is operating normally | HTTP 200; DHT11 status valid; 29.6 °C, 80.0% RH; page reports Wi-Fi connected | Normal operation observed; no outage |
| F1 network loss | User observed the page/device lose Wi-Fi while the modem was off, then restored the modem; check ESP32 local page after restoration | **Passed functionally (15/11/2026):** user confirmed the disconnection during the modem outage and reconnection after restoration. At 21:36, three consecutive HTTP 200 responses showed valid DHT11 readings (29.8 °C, 82.0–81.0% RH) and Wi-Fi connected. | One loss and one recovery confirmed; outage duration and recovery latency were not timed |
| F2 power loss | Remove board power and reconnect | Not run | Not measured |
| F3 sensor failure | Disconnect sensor DATA wire while board is running | **Passed (15/11/2026):** at 21:27, two HTTP 200 responses showed “Falha na leitura atual; valores exibidos são da última leitura válida”; 29.7 °C and 80.0% RH stayed labeled as the last valid readings, and Wi-Fi remained connected. After reconnecting DATA, three HTTP 200 responses at 21:28 showed valid DHT11 readings (29.8–29.9 °C, 81.0% RH) and Wi-Fi connected. | Fault appeared within the polling window; valid reads resumed by 21:28:09. Exact recovery interval not measured. |
| F4 cloud API outage | Stop API service for 30 seconds | Not run | Not measured |
| F5 duplicate message | Resend same device sequence | API has database uniqueness handling; test not run | Not measured |
| F6 ThingSpeak outage | Block endpoint or use invalid key | ThingSpeak integration not implemented | Not run |

Normal DHT11 monitoring and the local page were observed before the tests. F1 and F3 both passed functionally: Wi-Fi returned after the modem outage, and valid DHT11 reads resumed after restoring the sensor DATA wire. Quantitative outage and recovery times were not collected.

## Local API / database / device integration (15/11/2026)

Docker Compose started the API and PostgreSQL containers; both reported healthy. `GET /health` returned `status: ok` and `database: connected`; the dashboard returned HTTP 200; demo login issued a bearer token; the latest-reading route returned HTTP 200 with the token and HTTP 401 without it. The ESP32-C3 firmware compiled and uploaded on COM5. The device sent at least 12 DHT11 readings to the local API; consecutive sequences were observed at five-second intervals and persisted in PostgreSQL. Latest observed values were 29.6 °C and 78% RH. This was local HTTP over the private LAN; public HTTPS, outage buffering/replay and duplicate replay testing remain open.
