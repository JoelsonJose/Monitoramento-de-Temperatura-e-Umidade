# UC requirements and evidence matrix

This matrix separates the minimum preview requirements for 16/11/2026 from final-delivery requirements for 30/11/2026. Statuses refer only to evidence available in this repository or reported during the hardware session. An item is not complete merely because code exists.

## Preview requirements (16/11)

| ID | UC | Preview requirement | Current implementation / evidence | Status |
|---|---|---|---|---|
| IOT-01 | IoT | Physical device readings with units; traceable data | ESP32-C3 + DHT11 produced temperature/humidity; local device page worked; 12 readings reached the local API/PostgreSQL with device ID, sequence and UTC timestamp | Partial: physical acquisition and local path shown; no end-to-end cloud path |
| IOT-02 | IoT | At least two physical sensors | Prototype has one available DHT11 | Not met; explain as a scope exception and ask the IoT instructor to accept it |
| IOT-03 | IoT / Quality | R1 Wi-Fi recovery and R5 invalid sensor handling; demonstrate F1 and F3 | User observed Wi-Fi loss/recovery and DHT11 failure/recovery; invalid reads do not replace last valid value | Functionally passed; F1 recovery under 30 s was not timed |
| IOT-04 | IoT | Live ThingSpeak channel; update interval at least 15 s; verify HTTP response | No ThingSpeak integration/channel | Not met |
| CLD-01 | Cloud | Public HTTPS API receives physical board data; Dockerfile and environment configuration | Authenticated ESP32 ingestion and PostgreSQL persistence work over private-LAN HTTP; Dockerfile and `.env.example` exist | Partial; no public URL or HTTPS |
| DB-01 | Cloud / IoT | Device, reading (time and sequence), and user tables; live query; ER diagram and schema/sample data | `database/init.sql` creates only the readings table; live records were queried | Partial; device/user tables, ER diagram and seed data are missing |
| DASH-01 | Cloud / IoT | Dashboard consumes API and shows device last contact | Local browser dashboard authenticates and displays latest temperature, humidity, device, sequence and timestamp | Partial; local-only and no heartbeat/online status; not the public dashboard path |
| SEG-01 | Security | STRIDE, JWT, demonstrate 401 and 403 | STRIDE document exists; demo login issues JWT; protected route returned 401 without a token | Partial; 403/object authorization has not been implemented or demonstrated |
| QUA-01 | Quality | Test plan and automated tests for main routes running in GitHub Actions | Test plan and GitHub Actions workflow exist; three unit tests cover JWT and payload validation | Partial; no automated HTTP route/integration tests are configured |
| IA-01 | AI | Define an AI problem and calculate a simple baseline | No problem statement, dataset or baseline in repository | Not met |
| MOB-01 | UE Mobile | Navigable Figma prototype and mobile app authenticating and listing real readings | Local browser dashboard exists; no Figma prototype or mobile/PWA app | Not met; a web dashboard is not the required mobile deliverable |
| CCO-01 | Consumer Behaviour | Persona, journey and value proposition based on at least 5 interviews or 20 responses | No research evidence or artifacts supplied | Not met |
| ENG-01 | Tech English | English README and API documentation; 2-minute English pitch opening | README, API reference and six-slide deck are in English | Written material present; spoken 2-minute pitch and persona/value proposition are not evidenced |
| DOC-01 | All | Architecture diagram with cloud/apps/protocols/ports; electrical diagram; component list; responsibility matrix with commit links | Electrical SVG, component list and responsibility assignments with assignment-commit links exist. Architecture Mermaid currently shows local services and planned cloud/mobile paths | Partial; diagram must distinguish intended public path from implemented local path |

## Final requirements (30/11)

| ID | UC | Remaining final requirements | Current status |
|---|---|---|---|
| RES-02 | IoT / Cloud / Quality | Buffer and ordered resend (R2); watchdog/power recovery (R4); degraded-mode status (R6); heartbeat/last-contact (R7); service restart and tested backup/restore (R8); F1–F6 | R2, R4, R6–R8 and F2/F4–F6 are pending; F1/F3 passed functionally without timing measurements |
| CLD-02 | Cloud | Public deployment, automatic deploy, centralized logs, restart, managed backup/restore and cost estimate | Only local Docker Compose deployment verified |
| SEC-02 | Security | TLS through device/API, object authorization, rate limits, ZAP, dependency checks and LGPD lifecycle | Pending beyond local JWT/device-key flows and STRIDE draft |
| QUA-02 | Quality | At least 60% backend coverage, static analysis, reviewed PRs, F1–F6 report and ISO/IEC 25010 report | Coverage and final quality report absent |
| IA-02 | AI | Temporal train/test split, model better than baseline, `/predict`, dashboard/mobile display and model card | Pending |
| MOB-02 | UE Mobile | Push alerts, offline state, heuristic review, five-user evaluation and SUS ≥68 | Pending |
| CCO-02 | Consumer Behaviour | Validate with users and connect dashboard indicators to persona decisions | Pending |
| DATA-02 | IoT / AI | At least 48 hours of readings, descriptive statistics, missing/invalid counts and documented cleaning | Pending |
| DOC-02 | All | Final repo structure, all course-specific requirements from each UC plan, video (≤5 minutes), final evidence and tag `v1.0` | Partial; course-specific syllabi were not provided; tag not created |

## Notes

- The supplied orientation explicitly requires at least two physical sensors. The team currently has one DHT11. This is a documented deviation, not a fulfilled requirement, unless the instructor approves an exception.
- The orientation contains a timing conflict: section 6 says 15 minutes per team, while the schedule table says 20 minutes. Plan for 15 minutes and confirm with the instructor.
- The orientation says the preview repository must be submitted with tag `v0.9-previa` by 15/11/2026 at 23:59. No tag was found in this repository at the time of review.
- The orientation asks for the minimum requirements plus official requirements from each UC's own syllabus in this matrix. Those separate syllabi were not supplied, so this matrix cannot claim to include those additional rules.
