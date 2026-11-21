#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include <time.h>
#include "DHT.h"

#if __has_include("credentials.h")
#include "credentials.h"
#endif

// Definições padrão para compilação garantida (Plug & Play mesmo sem credentials.h)
#ifndef WIFI_SSID
const char* WIFI_SSID = "Sua_Rede_2_4_GHz";
#endif
#ifndef WIFI_PASS
const char* WIFI_PASS = "Sua_Senha_WiFi";
#endif
#ifndef API_URL
#define API_URL "https://monitoramento-iot-api.onrender.com/api/v1/ingest"
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

// Pinos dos Sensores (ESP32-C3)
#ifndef DHTPIN
#define DHTPIN 5
#endif
#ifndef DHTTYPE
#define DHTTYPE DHT11
#endif
#ifndef LDRPIN
#define LDRPIN 2 // GPIO 2 (ADC1_CH2 na ESP32-C3)
#endif

// Parâmetros de temporização
constexpr unsigned long READ_INTERVAL_MS = 5000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;
constexpr const char* AP_SSID = "MangaTrace-Setup";
constexpr const char* AP_PASS = "12345678";

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);
Preferences preferences;

// Variáveis de telemetria
float temperatureC = NAN;
float humidityPercent = NAN;
float luminosityLux = 0.0f;
bool hasValidReading = false;
bool latestReadingValid = false;
unsigned long lastSampleAt = 0;
unsigned long lastValidReadingAt = 0;

// Estado de conexão e Plug & Play
bool apModeActive = false;
unsigned long wifiAttemptStartedAt = 0;
String activeSsid = "";
String activePass = "";
String activeApiUrl = API_URL;
String activeDeviceId = DEVICE_ID;
String activeApiKey = DEVICE_API_KEY;

uint64_t nextSequence = 0;
uint64_t reservedSequenceEnd = 0;

// Leitura calibrada do sensor de luminosidade (LDR em divisor de tensão)
float readLuminosityLux() {
  const int raw = analogRead(LDRPIN);
  // ESP32-C3 ADC: 12 bits (0 a 4095)
  // Montagem padrão com pull-down de 10k: maior luz = maior tensão (maior leitura)
  // Montagem com pull-up: inverte a leitura.
  // Mapeamos proporcionalmente com curva agronômica para estimar de 0 a 75.000 lux.
  float normalized = (float)raw / 4095.0f;
  if (normalized < 0.005f) return 10.0f; // escuro (ex: estoque/câmara fria)
  
  // Curva de resposta de LDR: lux proporcional à potência da leitura
  float estimatedLux = 10.0f + powf(normalized, 1.8f) * 75000.0f;
  if (estimatedLux > 100000.0f) estimatedLux = 100000.0f;
  return estimatedLux;
}

void loadStoredConfiguration() {
  preferences.begin("iot-config", false);
  String storedSsid = preferences.getString("ssid", "");
  String storedPass = preferences.getString("pass", "");
  String storedApiUrl = preferences.getString("api_url", "");
  String storedDeviceId = preferences.getString("device_id", "");
  String storedApiKey = preferences.getString("api_key", "");

  if (storedSsid.length() > 0) {
    activeSsid = storedSsid;
    activePass = storedPass;
  } else {
    activeSsid = String(WIFI_SSID);
    activePass = String(WIFI_PASS);
  }

  if (storedApiUrl.length() > 0) activeApiUrl = storedApiUrl;
  if (storedDeviceId.length() > 0) activeDeviceId = storedDeviceId;
  if (storedApiKey.length() > 0) activeApiKey = storedApiKey;
}

void startAccessPoint() {
  if (apModeActive) return;
  Serial.println("\nAtivando Ponto de Acesso (AP) de contingência...");
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress apIP = WiFi.softAPIP();
  apModeActive = true;
  Serial.print("Conecte no Wi-Fi: ");
  Serial.println(AP_SSID);
  Serial.print("Abra no navegador: http://");
  Serial.println(apIP);
}

// Leitura calibrada do sensor de luminosidade (LDR em divisor de tensão)
float readLuminosityLux() {
  const int raw = analogRead(LDRPIN);
  // ESP32-C3 ADC: 12 bits (0 a 4095)
  // Montagem padrão com pull-down de 10k: maior luz = maior tensão (maior leitura)
  // Montagem com pull-up: inverte a leitura.
  // Mapeamos proporcionalmente com curva agronômica para estimar de 0 a 75.000 lux.
  float normalized = (float)raw / 4095.0f;
  if (normalized < 0.005f) return 10.0f; // escuro (ex: estoque/câmara fria)
  
  // Curva de resposta de LDR: lux proporcional à potência da leitura
  float estimatedLux = 10.0f + powf(normalized, 1.8f) * 75000.0f;
  if (estimatedLux > 100000.0f) estimatedLux = 100000.0f;
  return estimatedLux;
}

void loadStoredConfiguration() {
  preferences.begin("iot-config", false);
  String storedSsid = preferences.getString("ssid", "");
  String storedPass = preferences.getString("pass", "");
  String storedApiUrl = preferences.getString("api_url", "");
  String storedDeviceId = preferences.getString("device_id", "");
  String storedApiKey = preferences.getString("api_key", "");

  if (storedSsid.length() > 0) {
    activeSsid = storedSsid;
    activePass = storedPass;
  } else {
    activeSsid = String(WIFI_SSID);
    activePass = String(WIFI_PASS);
  }

  if (storedApiUrl.length() > 0) activeApiUrl = storedApiUrl;
  if (storedDeviceId.length() > 0) activeDeviceId = storedDeviceId;
  if (storedApiKey.length() > 0) activeApiKey = storedApiKey;
}

void startAccessPoint() {
  if (apModeActive) return;
  Serial.println("\n[PLUG & PLAY] Ativando Ponto de Acesso (AP) de contingência...");
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress apIP = WiFi.softAPIP();
  apModeActive = true;
  Serial.print("[PLUG & PLAY] Conecte no Wi-Fi: ");
  Serial.println(AP_SSID);
  Serial.print("[PLUG & PLAY] Abra no navegador: http://");
  Serial.println(apIP);
}

void beginWiFiConnection() {
  loadStoredConfiguration();
  if (activeSsid == "Sua_Rede_2_4_GHz" || activeSsid.length() == 0) {
    Serial.println("Wi-Fi: credenciais padrão detectadas. Iniciando Ponto de Acesso Plug & Play.");
    startAccessPoint();
    return;
  }

  Serial.printf("Wi-Fi: conectando à rede '%s'...\n", activeSsid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(activeSsid.c_str(), activePass.c_str());
  wifiAttemptStartedAt = millis();
}

String formatAge(unsigned long ageMs) {
  const unsigned long ageSeconds = ageMs / 1000;
  if (ageSeconds < 60) return String(ageSeconds) + " s";
  return String(ageSeconds / 60) + " min";
}

void handleRoot() {
  String html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<meta http-equiv='refresh' content='6'><title>Manga Trace · ESP32</title>";
  html += "<style>body{font-family:sans-serif;background:#f6f8f1;color:#16352e;margin:0;padding:24px 12px;text-align:center}";
  html += ".card{background:#fff;max-width:480px;margin:0 auto 20px;padding:24px;border-radius:18px;box-shadow:0 10px 30px #183c2c12;text-align:left}";
  html += "h2{margin:0 0 16px;color:#236c4a;font-size:22px;text-align:center}";
  html += ".metric{background:#f3f6f1;padding:12px 16px;border-radius:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}";
  html += ".metric-title{font-size:14px;color:#66776e;font-weight:bold}";
  html += ".metric-value{font-size:20px;font-weight:800;color:#194e38}";
  html += ".status{color:#176b36;font-size:13px;text-align:center;margin:12px 0 0}";
  html += ".error{color:#a12622;font-size:13px;text-align:center;margin:12px 0 0}";
  html += ".badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:bold;background:#e7f1e9;color:#236c4a}";
  html += "input,button{width:100%;box-sizing:border-box;margin-top:6px;margin-bottom:12px;padding:10px 12px;border:1px solid #dce4db;border-radius:8px;font-size:14px}";
  html += "button{background:#236c4a;color:#fff;font-weight:bold;cursor:pointer;border:none;margin-top:8px}";
  html += "button:hover{background:#194e38}</style></head><body>";

  html += "<div class='card'>";
  html += "<h2>Manga Trace · Telemetria</h2>";

  if (hasValidReading) {
    html += "<div class='metric'><span class='metric-title'>Temperatura</span><span class='metric-value'>" + String(temperatureC, 1) + " &deg;C</span></div>";
    html += "<div class='metric'><span class='metric-title'>Umidade do Ar</span><span class='metric-value'>" + String(humidityPercent, 1) + " %</span></div>";
    html += "<div class='metric'><span class='metric-title'>Luminosidade</span><span class='metric-value'>" + String(luminosityLux, 0) + " lux</span></div>";
    
    // Análise agronômica rápida
    String agronomy = (luminosityLux >= 35000.0f) ? "Sol Pleno (Pomar)" : (luminosityLux <= 60.0f ? "Escuro (Câmara Fria)" : "Luz Intermediária");
    html += "<div style='text-align:center;margin:12px 0;'><span class='badge'>" + agronomy + "</span></div>";
    html += "<p class='status'>Última leitura há " + formatAge(millis() - lastValidReadingAt) + "</p>";
  } else {
    html += "<p class='error'>Aguardando leitura dos sensores (DHT11 / LDR)...</p>";
  }

  if (WiFi.status() == WL_CONNECTED) {
    html += "<p class='status'>Wi-Fi Conectado: <strong>" + activeSsid + "</strong> (IP: " + WiFi.localIP().toString() + ")</p>";
  } else if (apModeActive) {
    html += "<p class='error'>Modo AP Plug&Play Ativo: Conectado a <strong>" + String(AP_SSID) + "</strong> (192.168.4.1)</p>";
  } else {
    html += "<p class='error'>Tentando conectar ao Wi-Fi...</p>";
  }
  html += "</div>";

  // Formulário Plug & Play para configuração sem abrir IDE
  html += "<div class='card'>";
  html += "<h3 style='margin-top:0;font-size:16px;color:#16352e'>Configuração Rápida (Plug & Play)</h3>";
  html += "<form method='POST' action='/save-config'>";
  html += "<label style='font-size:12px;font-weight:bold'>Nome da Rede Wi-Fi (SSID):</label>";
  html += "<input type='text' name='ssid' value='" + activeSsid + "' required>";
  html += "<label style='font-size:12px;font-weight:bold'>Senha do Wi-Fi:</label>";
  html += "<input type='password' name='pass' placeholder='••••••••'>";
  html += "<label style='font-size:12px;font-weight:bold'>URL da API Ingest:</label>";
  html += "<input type='text' name='api_url' value='" + activeApiUrl + "'>";
  html += "<label style='font-size:12px;font-weight:bold'>Device API Key:</label>";
  html += "<input type='text' name='api_key' value='" + activeApiKey + "'>";
  html += "<button type='submit'>Salvar e Reiniciar ESP32</button>";
  html += "</form></div></body></html>";

  server.send(200, "text/html; charset=utf-8", html);
}

void handleSaveConfig() {
  if (server.hasArg("ssid")) {
    preferences.begin("iot-config", false);
    preferences.putString("ssid", server.arg("ssid"));
    if (server.arg("pass").length() > 0) {
      preferences.putString("pass", server.arg("pass"));
    }
    if (server.hasArg("api_url")) {
      preferences.putString("api_url", server.arg("api_url"));
    }
    if (server.hasArg("api_key")) {
      preferences.putString("api_key", server.arg("api_key"));
    }
  }

  String html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<title>Salvo!</title><style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f6f8f1}</style></head><body>";
  html += "<h2>Configurações salvas com sucesso!</h2><p>A ESP32 está reiniciando para conectar na nova rede...</p></body></html>";
  server.send(200, "text/html; charset=utf-8", html);
  delay(1000);
  ESP.restart();
}

bool reserveSequenceBlock() {
  constexpr uint64_t SEQUENCE_BLOCK_SIZE = 128;
  const uint64_t previousEnd = preferences.getULong64("seqEnd", 0);
  reservedSequenceEnd = previousEnd + SEQUENCE_BLOCK_SIZE;
  if (!preferences.putULong64("seqEnd", reservedSequenceEnd)) {
    Serial.println("ERRO: não foi possível reservar sequência na memória local.");
    return false;
  }
  nextSequence = previousEnd;
  return true;
}

void sendReadingToApi() {
  if (activeApiUrl.length() == 0 || activeApiKey.length() == 0) {
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  const time_t now = time(nullptr);
  char timestamp[25];
  if (now > 1700000000) {
    struct tm utc;
    gmtime_r(&now, &utc);
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &utc);
  } else {
    // Caso NTP ainda não tenha sincronizado, envia timestamp relativo aproximado
    snprintf(timestamp, sizeof(timestamp), "2026-11-21T19:00:00Z");
  }

  if (nextSequence >= reservedSequenceEnd && !reserveSequenceBlock()) {
    return;
  }

  // Montagem do JSON com temperatura, umidade e luminosidade
  String payload = "{\"device_id\":\"" + activeDeviceId + "\",\"sequence\":";
  payload += String((unsigned long long)nextSequence++);
  payload += ",\"timestamp\":\"" + String(timestamp) + "\",\"temperature_c\":";
  payload += String(temperatureC, 1) + ",\"humidity_percent\":" + String(humidityPercent, 1);
  payload += ",\"luminosity_lux\":" + String(luminosityLux, 1) + "}";

  HTTPClient http;
  const String apiUrl(activeApiUrl);

  if (apiUrl.startsWith("https://")) {
    if (String(API_ROOT_CA).length() > 0) {
      http.begin(apiUrl, API_ROOT_CA);
    } else {
      // Modo Plug & Play HTTPS (setInsecure permite enviar para o Render sem travar em certificado CA ausente)
      WiFiClientSecure client;
      client.setInsecure();
      http.begin(client, apiUrl);
    }
  } else {
    http.begin(apiUrl);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", activeApiKey);
  const int status = http.POST(payload);
  Serial.printf("API Ingest: HTTP %d (Luminosidade: %.1f lux)\n", status, luminosityLux);
  http.end();
}

void sampleSensor() {
  const float newTemperatureC = dht.readTemperature();
  const float newHumidityPercent = dht.readHumidity();
  const float newLuminosityLux = readLuminosityLux();

  lastSampleAt = millis();
  luminosityLux = newLuminosityLux;

  if (isnan(newTemperatureC) || isnan(newHumidityPercent)) {
    latestReadingValid = false;
    Serial.printf("Aviso: DHT11 aguardando leitura; Lux: %.0f\n", luminosityLux);
    return;
  }

  temperatureC = newTemperatureC;
  humidityPercent = newHumidityPercent;
  hasValidReading = true;
  latestReadingValid = true;
  lastValidReadingAt = lastSampleAt;

  Serial.printf("Temp: %.1f °C | Umid: %.1f %% | Luz: %.0f lux\n",
                temperatureC, humidityPercent, luminosityLux);

  sendReadingToApi();
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const unsigned long now = millis();
  // Se passou do tempo limite sem conectar, ativa o Ponto de Acesso Plug & Play automaticamente!
  if (!apModeActive && now - wifiAttemptStartedAt >= WIFI_CONNECT_TIMEOUT_MS) {
    Serial.printf("Wi-Fi: tempo esgotado após %lu ms sem conexão.\n", WIFI_CONNECT_TIMEOUT_MS);
    startAccessPoint();
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n--- Manga Trace: Inicializando ESP32 ---");

  dht.begin();
  pinMode(LDRPIN, INPUT);
  preferences.begin("iot-monitor", false);

  beginWiFiConnection();

  server.on("/", handleRoot);
  server.on("/save-config", HTTP_POST, handleSaveConfig);
  server.begin();
  Serial.println("Servidor Web local iniciado na porta 80.");

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
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
