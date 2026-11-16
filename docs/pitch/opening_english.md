# Two-minute project opening (English)

**Speaker: Nicollas**

Good morning. We are presenting our IoT temperature and humidity monitoring prototype. The system uses one DHT11 sensor connected to an ESP32-C3. The board samples the environment every five seconds and serves a local status page. It also sends timestamped readings to our Node.js API and PostgreSQL database. The API can forward readings to ThingSpeak, where temperature and humidity use separate fields. Two live writes were accepted previously; we are checking a recent HTTP 400 response after a service restart.

My contribution focuses on software quality and testing. We checked normal sensor readings, invalid sensor data, Wi-Fi loss and recovery, authentication, and device authorization. The backend returns HTTP 401 when a protected request has no valid token and HTTP 403 when an authenticated user is not authorized for a device. Five automated tests cover the main API routes and security behavior, and they pass locally. The same test command is configured in GitHub Actions.

Our current results show that physical readings can be collected, stored, and displayed on the local dashboard. We have also prepared a Render deployment configuration. The public service and a physical ESP32 upload over HTTPS still need to be verified after deployment. During this presentation, we will show the working local path, the test evidence, and the remaining deployment step.

Thank you. We will now demonstrate the prototype.

## Presenter notes

- Target length: about two minutes at a measured, clear pace. Rehearse and time before presenting.
- Keep the current title slide on screen while Nicollas delivers this opening; the orientation asks for an English opening, not a separate English deck template.
- Do not describe the Render URL or physical-board HTTPS upload as complete until they have both been tested.
