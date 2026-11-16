# Two-minute project opening (English)

**Speaker: Nicollas**

Good morning. We are presenting our IoT temperature and humidity monitoring prototype. It uses one DHT11 sensor connected to an ESP32-C3. The board samples the environment every five seconds, shows local status, and sends authenticated readings to our public Node.js API, which stores them in PostgreSQL. The web dashboard reads the latest measurement and device contact time.

After configuring the device for the public service, we observed the board connect to Wi-Fi and return two HTTP 201 responses from the API. The public health endpoint also reported that the database was connected. During the demonstration, we will refresh the dashboard and show the latest reading received from the sensor.

My contribution focuses on software quality and testing. We checked normal sensor readings, invalid sensor data, Wi-Fi loss and recovery, authentication, and device authorization. The API returns HTTP 401 when a protected request has no valid token and HTTP 403 when an authenticated user is not allowed to access a device. Five automated tests cover the main API routes and security behavior, and the latest recorded GitHub Actions runs passed.

Our prototype currently measures temperature and humidity with a single DHT11 sensor. Some work remains for the final delivery, including an offline buffer, longer reliability measurements, the mobile application, and the final AI model. We will distinguish what is working now from what is still planned.

Thank you. We will now demonstrate the prototype.

## Presenter notes

- The orientation requires a two-minute opening in English. Keep the English slides (up to six) on screen during the pitch.
- The rest of the project interface and supporting documentation is in Portuguese, except the README and API documentation, which the orientation also requires in English.
