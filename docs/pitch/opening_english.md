# Two-minute project opening (English)

**Speaker: Nicollas**

Good morning. Our project explores IoT monitoring of temperature and relative humidity in two mango contexts: an orchard and postharvest handling. These environmental conditions matter in mango production and storage, but this prototype only measures them; it does not diagnose plant disease or control a storage room.

Our documentary research suggests two provisional user profiles: a person responsible for monitoring a mango orchard and a person responsible for a postharvest or storage area. These are hypotheses, not validated personas. We still need interviews with real users. Our value proposition is simple, timestamped readings and a history that let the responsible person check conditions remotely and notice when measurements stop arriving.

The architecture is a DHT11 sensor connected to an ESP32-C3. The board samples every five seconds, adds a device ID, sequence number, and UTC timestamp, then sends an authenticated reading over HTTPS to our Node.js API. The API stores it in PostgreSQL, and the authenticated web dashboard displays the latest reading and history.

During our hardware work, the board connected to Wi-Fi and its Serial Monitor showed two HTTP 201 responses from the public API. We also observed temperature and humidity readings on the local device page. The preview uses one sensor and one monitored point at a time, so orchard and postharvest measurements are alternative use cases, not simultaneous coverage.

My contribution focuses on software quality and testing. Our current next steps include validating the user profiles through interviews and completing the mobile prototype. We will now show the working device and the evidence we have collected.

## Presenter notes

- This is the only spoken section that must be delivered in English for the preview: a two-minute pitch covering the problem, provisional user profiles, value proposition, and architecture.
- The team's requested deck format is an English opening slide followed by Portuguese slides. Note: Table 11 also says “pitch slides (in English, maximum 6),” which may require every slide to be in English; confirm that the mixed-language deck is accepted.
- The two user profiles are based on documentary research only; do not describe them as interview-validated.
