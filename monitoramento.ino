#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <time.h>
#include "DHT.h"
#include "credentials.h"

// These optional settings keep older local credentials.h files buildable.
#ifndef API_URL
#define API_URL ""
#endif
#ifndef DEVICE_ID
#define DEVICE_ID "esp32c3-01"
#endif
#ifndef DEVICE_API_KEY
#define DEVICE_API_KEY ""
#endif
#ifndef API_ROOT_CA
#define API_ROOT_CA ""
#endif
#ifndef WIFI_USE_STORED_CONFIG
#define WIFI_USE_STORED_CONFIG 0
#endif

// Configuração do único sensor do projeto.
#define DHTPIN 5
#define DHTTYPE DHT11

constexpr unsigned long READ_INTERVAL_MS = 5000;
constexpr unsigned long INITIAL_WIFI_RETRY_MS = 5000;
constexpr unsigned long MAX_WIFI_RETRY_MS = 30000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

float temperatureC = NAN;
float humidityPercent = NAN;
bool hasValidReading = false;
bool latestReadingValid = false;
unsigned long lastSampleAt = 0;
unsigned long lastValidReadingAt = 0;
volatile bool wifiRetryRequested = false;
volatile unsigned long wifiDisconnectedAt = 0;
unsigned long wifiAttemptStartedAt = 0;
unsigned long wifiRetryDelayMs = INITIAL_WIFI_RETRY_MS;
Preferences preferences;
uint64_t nextSequence = 0;
uint64_t reservedSequenceEnd = 0;

void beginWiFiConnection() {
#if WIFI_USE_STORED_CONFIG
  Serial.println("Wi-Fi: usando a configuração salva na ESP32.");
  WiFi.begin();
#else
  WiFi.begin(WIFI_SSID, WIFI_PASS);
#endif
}

String formatAge(unsigned long ageMs) {
  const unsigned long ageSeconds = ageMs / 1000;
  if (ageSeconds < 60) {
    return String(ageSeconds) + " s";
  }
  return String(ageSeconds / 60) + " min";
}

void handleRoot() {
  String html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<meta http-equiv='refresh' content='5'><title>Monitoramento ESP32-C3</title>";
  html += "<style>body{font-family:sans-serif;text-align:center;background:#f4f4f9;padding:32px 12px}";
  html += ".card{background:#fff;padding:20px;border-radius:10px;box-shadow:0 4px 8px #0002;display:inline-block}";
  html += ".status{color:#176b36}.error{color:#a12622}</style></head><body><div class='card'>";
  html += "<h2>Monitoramento de temperatura e umidade</h2>";

  if (hasValidReading) {
    html += "<p>Temperatura: <strong>" + String(temperatureC, 1) + " &deg;C</strong></p>";
    html += "<p>Umidade: <strong>" + String(humidityPercent, 1) + " %</strong></p>";
    html += "<p class='status'>Última leitura válida há " +
            formatAge(millis() - lastValidReadingAt) + "</p>";
    if (latestReadingValid) {
      html += "<p class='status'>Leitura atual do DHT11 válida</p>";
    } else {
      html += "<p class='error'>Falha na leitura atual; valores exibidos são da última leitura válida.</p>";
    }
  } else {
    html += "<p class='error'>Aguardando uma leitura válida do DHT11.</p>";
  }

  html += WiFi.status() == WL_CONNECTED
              ? "<p class='status'>Wi-Fi conectado</p>"
              : "<p class='error'>Wi-Fi desconectado</p>";

  html += "</div></body></html>";
  server.send(200, "text/html; charset=utf-8", html);
}

void sampleSensor() {
  const float newTemperatureC = dht.readTemperature();
  const float newHumidityPercent = dht.readHumidity();

  lastSampleAt = millis();
  if (isnan(newTemperatureC) || isnan(newHumidityPercent)) {
    latestReadingValid = false;
    Serial.println("ERRO: leitura inválida do DHT11; não será exibida como atual.");
    return;
  }

  temperatureC = newTemperatureC;
  humidityPercent = newHumidityPercent;
  hasValidReading = true;
  latestReadingValid = true;
  lastValidReadingAt = lastSampleAt;

  Serial.print("Temperatura: ");
  Serial.print(temperatureC, 1);
  Serial.print(" °C | Umidade: ");
  Serial.print(humidityPercent, 1);
  Serial.println(" %");

  sendReadingToApi();
}

bool reserveSequenceBlock() {
  constexpr uint64_t SEQUENCE_BLOCK_SIZE = 128;
  const uint64_t previousEnd = preferences.getULong64("seqEnd", 0);
  reservedSequenceEnd = previousEnd + SEQUENCE_BLOCK_SIZE;
  if (!preferences.putULong64("seqEnd", reservedSequenceEnd)) {
    Serial.println("ERRO: não foi possível reservar números de sequência na memória local.");
    return false;
  }
  nextSequence = previousEnd;
  return true;
}

void sendReadingToApi() {
  if (String(API_URL).length() == 0 || String(DEVICE_API_KEY).length() == 0) {
    return; // Cloud endpoint is intentionally optional until deployment is configured.
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("API: sem Wi-Fi; envio pendente. Buffer local ainda não implementado.");
    return;
  }

  const time_t now = time(nullptr);
  if (now < 1760000000) {
    Serial.println("API: aguardando sincronização de horário UTC.");
    return;
  }

  if (nextSequence >= reservedSequenceEnd && !reserveSequenceBlock()) {
    return;
  }

  char timestamp[25];
  struct tm utc;
  gmtime_r(&now, &utc);
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &utc);

  String payload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"sequence\":";
  payload += String((unsigned long long)nextSequence++);
  payload += ",\"timestamp\":\"" + String(timestamp) + "\",\"temperature_c\":";
  payload += String(temperatureC, 1) + ",\"humidity_percent\":" + String(humidityPercent, 1) + "}";

  HTTPClient http;
  const String apiUrl(API_URL);
  if (apiUrl.startsWith("https://")) {
    if (String(API_ROOT_CA).length() == 0) {
      Serial.println("API: HTTPS bloqueado porque API_ROOT_CA não foi configurado.");
      return;
    }
    if (!http.begin(apiUrl, API_ROOT_CA)) {
      Serial.println("API: não foi possível abrir a conexão HTTPS.");
      return;
    }
  } else {
    // Plain HTTP is allowed only for a trusted local development network.
    http.begin(apiUrl);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  const int status = http.POST(payload);
  Serial.printf("API: HTTP %d\n", status);
  http.end();
}

void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_START:
      Serial.println("Wi-Fi: interface da ESP32 iniciada.");
      break;
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.println("Wi-Fi: roteador encontrado; aguardando endereço IP.");
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.print("Wi-Fi conectado. IP: ");
      Serial.println(WiFi.localIP());
      wifiRetryDelayMs = INITIAL_WIFI_RETRY_MS;
      wifiRetryRequested = false;
      configTime(0, 0, "pool.ntp.org", "time.nist.gov");
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.printf("Wi-Fi desconectado. Código do motivo: %u\n",
                    info.wifi_sta_disconnected.reason);
      wifiRetryRequested = true;
      wifiDisconnectedAt = millis();
      break;
    default:
      break;
  }
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const unsigned long now = millis();
  if (!wifiRetryRequested && now - wifiAttemptStartedAt >= WIFI_CONNECT_TIMEOUT_MS) {
    Serial.printf("Wi-Fi: tentativa sem resposta após %lu ms; status=%d.\n",
                  WIFI_CONNECT_TIMEOUT_MS, WiFi.status());
    wifiRetryRequested = true;
    wifiDisconnectedAt = now;
  }

  if (!wifiRetryRequested || now - wifiDisconnectedAt < wifiRetryDelayMs) {
    return;
  }

  Serial.printf("Wi-Fi: nova tentativa; próxima espera até %lu ms.\n", wifiRetryDelayMs);
  wifiRetryRequested = false;
  wifiAttemptStartedAt = now;
  beginWiFiConnection();
  wifiRetryDelayMs = min(wifiRetryDelayMs * 2, MAX_WIFI_RETRY_MS);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  preferences.begin("iot-monitor", false);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(false); // maintainWiFi owns retries and never reconfigures an active attempt.
  WiFi.onEvent(onWiFiEvent);
  wifiAttemptStartedAt = millis();
  beginWiFiConnection();
  Serial.println("ESP32 iniciado. Tentando conectar à rede Wi-Fi de 2,4 GHz.");

  // Inicialize a pilha de rede antes de abrir o servidor TCP.
  server.on("/", handleRoot);
  server.begin();

  sampleSensor();
}

void loop() {
  server.handleClient();
  maintainWiFi();

  const unsigned long now = millis();
  if (now - lastSampleAt >= READ_INTERVAL_MS) {
    sampleSensor();
  }
}
