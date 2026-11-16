# UC requirements and evidence matrix

This matrix separates the minimum preview requirements for 16/11/2026 from final-delivery requirements for 30/11/2026. Statuses refer only to evidence available in this repository or reported during the hardware session. An item is not complete merely because code exists.

## Preview requirements (16/11)

| ID | UC | Preview requirement | Current implementation / evidence | Status |
|---|---|---|---|---|
| IOT-01 | IoT | Physical device readings with units; traceable data | ESP32-C3 + DHT11 produced temperature/humidity; local device page worked; 12 readings reached the local API/PostgreSQL with device ID, sequence and UTC timestamp | Partial: physical acquisition and local path shown; no end-to-end cloud path |
| IOT-02 | IoT | Sensor scope for this prototype | Team selected one DHT11 as the sole physical sensor for this demonstration | Scope decision recorded by the team |
| IOT-03 | IoT / Quality | R1 Wi-Fi recovery and R5 invalid sensor handling; demonstrate F1 and F3 | User confirmed Wi-Fi loss/recovery; DHT11 failure/recovery was observed; invalid reads do not replace last valid value | F1 and F3 confirmed functionally by the team; F1 duration not timed |
| IOT-04 | IoT | Live ThingSpeak channel; update interval at least 15 s; verify HTTP response | Two HTTPS writes returned HTTP 200 and entry IDs 1 and 2, 20 s apart. Following a later API restart, new attempts returned HTTP 400 | Earlier writes confirmed; current forwarding requires re-verification |
| CLD-01 | Cloud | Public HTTPS API receives physical board data; Dockerfile and environment configuration | `render.yaml` defines web service, managed PostgreSQL, secrets and health check; local end-to-end ingestion is proven | Deployment prepared; public URL and physical HTTPS upload still require Render login/configuration and verification |
| DB-01 | Cloud / IoT | Device, reading (time and sequence), and user tables; live query; ER diagram and schema/sample data | Startup migration creates devices, users, device access and readings, backfills devices and seeds configured demo user/device; ER diagram is in `docs/diagrama_er.md` | Implemented and checked against local PostgreSQL; seed/migration runs at API startup |
| DASH-01 | Cloud / IoT | Dashboard consumes API and shows device last contact | Dashboard displays latest reading and `last_seen_at`; local API returns the value after migration | Implemented and verified locally; public URL awaits Render deployment |
| SEG-01 | Security | STRIDE, JWT, demonstrate 401 and 403 | JWT login and per-device `device_access`; local route smoke checks returned 401 without token and 403 without device permission | Implemented and demonstrated locally; public deployment still pending |
| QUA-01 | Quality | Test plan and automated tests for main routes running in GitHub Actions | GitHub Actions runs `npm test`; five tests now cover token/payload plus HTTP login, ingestion, 401, 403 and authorized readings | Five tests passed locally; GitHub Actions run awaits commit push |
| IA-01 | AI | Define an AI problem and calculate a simple baseline | Next-reading forecast is defined; persistence baseline was calculated on the latest 100 physical readings with a time-ordered 80/20 split; see `docs/ia/baseline_previa.md` | Preview minimum evidenced; final model remains pending |
| MOB-01 | UE Mobile | Navigable Figma prototype and mobile app authenticating and listing real readings | Local browser dashboard exists; no Figma prototype or mobile/PWA app | Not met; a web dashboard is not the required mobile deliverable |
| CCO-01 | Consumer Behaviour | Persona, journey and value proposition based on at least 5 interviews or 20 responses | Interview instrument is prepared in `docs/ux/pesquisa_previa.md`; no responses have been collected | Not met; primary research remains required |
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

- The project scope selected by the team for this preview is one physical DHT11 sensor.
- The orientation contains a timing conflict: section 6 says 15 minutes per team, while the schedule table says 20 minutes. Plan for 15 minutes and confirm with the instructor.
- The orientation says the preview repository must be submitted with tag `v0.9-previa` by 15/11/2026 at 23:59. No tag was found in this repository at the time of review.
- The orientation asks for the minimum requirements plus official requirements from each UC's own syllabus in this matrix. Those separate syllabi were not supplied, so this matrix cannot claim to include those additional rules.
