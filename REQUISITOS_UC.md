# UC requirements and evidence matrix

Status reflects evidence currently present in the repository or supplied during this session. “Pending” means implementation or observable proof has not yet been provided.

| ID | UC | Requirement | Implementation / evidence | Status |
|---|---|---|---|---|
| IOT-01 | IoT | ESP32 with physical sensing and units | DHT11 readings observed in Serial Monitor; local page confirmed updating; HTTP 200 at `192.168.1.7`, valid sensor status, Wi-Fi connected | Confirmed for local operation |
| IOT-02 | IoT | At least two physical sensors | Preview prototype uses the one available DHT11; team will explain this scope during the demonstration | One-sensor scope for preview |
| IOT-03 | IoT | Automatic Wi-Fi recovery and invalid-sensor handling | Firmware retries Wi-Fi; user observed loss during modem outage and recovery after restoration; DHT11 failure and recovery were observed, with three successful page requests after reconnection | Functional tests passed; outage and recovery times not measured |
| CLD-01 | Cloud | HTTPS API receives board data | ESP32-C3 sent live DHT11 readings to the local API over private-LAN HTTP; 12 rows with device ID, sequence, UTC timestamp, temperature and humidity were confirmed in PostgreSQL | Local ingestion confirmed; HTTPS/public deployment pending |
| CLD-02 | Cloud | Database, container and health endpoint | Docker API and PostgreSQL containers healthy; `/health` returned `ok` and `database: connected`; physical board readings persisted | Local runtime confirmed; public deployment and backup/restore pending |
| SEG-01 | Security | Device authentication and user JWT | Device-key-protected ingestion persisted live readings; demo login issued a bearer token; latest-reading returned HTTP 200 with token and HTTP 401 without one | Basic local flows confirmed; TLS, object authorization and security tests pending |
| SEG-02 | Security | Object authorization, TLS, rate limit, ZAP, LGPD | Not implemented or evidenced | Pending |
| QUA-01 | Quality | Automated route tests in CI | Local unit tests prepared; CI workflow and coverage report pending | Partial |
| IA-01 | AI | Model, baseline and `/predict` | Not implemented | Pending |
| MOB-01 | UE Mobile | Mobile/PWA login and real readings | No mobile app yet; basic browser dashboard prepared | Pending |
| CCO-01 | Consumer | Research, persona, journey and value proposition | No user research evidence supplied | Pending |
| ENG-01 | Tech English | README, API documentation and English pitch | API reference and architecture notes started; README and pitch remain Portuguese | Partial |
| DOC-01 | All | Architecture diagram and responsibility matrix | Architecture diagram created; assignment matrix pending team input | Partial |
| RES-01 | IoT / Cloud / Quality | F1 network loss and F3 sensor failure at preview | F1 loss/recovery and F3 failure/recovery passed functionally; user observed the outage and three post-recovery HTTP 200 responses were captured | Passed functionally; timing metrics not measured |
