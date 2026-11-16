#ifndef CREDENTIALS_H
#define CREDENTIALS_H

// Copie este arquivo para credentials.h e preencha somente a cópia local.
const char* WIFI_SSID = "Sua_Rede_2_4_GHz";
const char* WIFI_PASS = "Sua_Senha_WiFi";

// Public Render API. Keep the matching device key and trusted CA in your local copy only.
#define API_URL "https://monitoramento-iot-api.onrender.com/api/v1/ingest"
#define DEVICE_ID "esp32c3-01"
#define DEVICE_API_KEY ""
// Paste the trusted root/intermediate CA certificate for the API host as PEM before enabling HTTPS.
#define API_ROOT_CA ""

#endif
