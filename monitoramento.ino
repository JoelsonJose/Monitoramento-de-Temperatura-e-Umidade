#include <WiFi.h>
#include <WebServer.h>
#include "DHT.h"
#include "credentials.h" // Importa as credenciais de forma segura

// Configuração do DHT22 
#define DHTPIN 5       // Pino GPIO 5 conectado ao fio verde do sensor
#define DHTTYPE DHT22  // Modelo do sensor

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

void handleRoot() {
  float temp = dht.readTemperature();
  float umid = dht.readHumidity();

  // Verifica se a leitura falhou
  if (isnan(temp) || isnan(umid)) {
    server.send(500, "text/plain", "Falha ao ler o sensor DHT22!");
    return;
  }

  // Constrói a página HTML para exibir os dados
  String html = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<title>Monitoramento ESP32-C3</title>";
  html += "<style>body{font-family:sans-serif; text-align:center; background:#f4f4f9; padding-top:50px;}";
  html += ".card{background:#fff; padding:20px; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.1); display:inline-block;}</style></head>";
  html += "<body><div class='card'><h2>Sensores do Projeto Integrador</h2>";
  html += "<p>Temperatura: <strong>" + String(temp) + " &deg;C</strong></p>";
  html += "<p>Umidade: <strong>" + String(umid) + " %</strong></p>";
  html += "</div></body></html>";

  server.send(200, "text/html", html);
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Inicia conexão Wi-Fi usando as variáveis do credentials.h
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nConectado!");
  Serial.print("Acesse a página em: http://");
  Serial.println(WiFi.localIP());

  // Define a rota principal do servidor
  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  server.handleClient();
  delay(2000); // O DHT22 precisa de pelo menos 2 segundos entre leituras
}