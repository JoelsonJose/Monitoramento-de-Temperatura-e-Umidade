#ifndef CREDENTIALS_H
#define CREDENTIALS_H

// Configurações de Wi-Fi padrão
// Se a ESP32 não encontrar esta rede, ela entrará automaticamente no
// modo Ponto de Acesso (AP: "MangaTrace-Setup" no IP 192.168.4.1)
// permitindo configurar o Wi-Fi diretamente pelo celular ou navegador sem precisar gravar o código de novo!
const char* WIFI_SSID = "Sua_Rede_2_4_GHz";
const char* WIFI_PASS = "Sua_Senha_WiFi";

// URL da API REST (Render ou IP da rede local)
#define API_URL "https://monitoramento-iot-api.onrender.com/api/v1/ingest"
#define DEVICE_ID "esp32c3-01"
#define DEVICE_API_KEY ""

// Opcional: certificado raiz PEM para strict SSL pinning.
// Se deixado vazio (""), a ESP32 opera em modo flexível/Plug&Play HTTPS,
// conectando com segurança na nuvem sem exigir a inclusão manual da cadeia de certificados.
#define API_ROOT_CA ""

// Configurações dos sensores (Pinos da ESP32-C3)
#define DHTPIN 5        // Sensor DHT11 de Temperatura e Umidade
#define LDRPIN 2        // Sensor de Luminosidade LDR (ADC1_CH2 no GPIO 2)

#endif
