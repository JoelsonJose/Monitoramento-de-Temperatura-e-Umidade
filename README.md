# 🌡️ Monitoramento de Temperatura e Umidade com ESP32-C3

**Equipe:** Homero, Joelson, Lucas Ximenes, Nicollas, Thayanne, João Cesar e Morgana.

## 📋 Sobre o Projeto
Protótipo de IoT desenvolvido para a leitura e monitoramento em tempo real de temperatura e umidade ambiente. O projeto utiliza um microcontrolador ESP32-C3 que processa os dados de um sensor DHT22 e os disponibiliza em uma interface Web acessível via navegador em qualquer dispositivo na mesma rede Wi-Fi.

## 🛠️ Componentes Utilizados
* Placa de desenvolvimento ESP32-C3
* Sensor de Temperatura e Umidade DHT22
* Protoboard e cabos jumper (macho-fêmea/macho-macho)
* Cabo USB (para alimentação e upload do código)

## 🔌 Esquema de Ligação
Com base no diagrama elétrico do projeto:
* **Pino VCC (DHT22)** -> Conectado ao **3V3** do ESP32
* **Pino DATA (DHT22)** -> Conectado ao pino **GPIO 6** do ESP32
* **Pino GND (DHT22)** -> Conectado ao pino **GND** do ESP32

## 🚀 Como Executar o Projeto

### Pré-requisitos
1. Ter a **IDE Arduino** instalada.
2. Adicionar as placas ESP32 na IDE Arduino (Em *Preferences*, inserir a URL da Espressif no Gerenciador de Placas).
3. Instalar a biblioteca **DHT sensor library** (da Adafruit) no Gerenciador de Bibliotecas da IDE.

### Passos
1. Faça o clone deste repositório ou baixe os arquivos.
2. Abra o arquivo `.ino` na IDE Arduino.
3. No código, localize as seguintes linhas e insira as credenciais da sua rede Wi-Fi:
   ```cpp
   const char* ssid = "Rede_wifi";
   const char* password = "Senha_rede_wifi";
4. Conecte o ESP32-C3 ao computador. Selecione a placa correta e a porta COM na IDE.
5. Faça o upload do código para a placa.
6. Abra o Monitor Serial (configurado para a velocidade 115200 baud).
7. Após o microcontrolador se conectar à rede, o IP local será exibido no Monitor Serial.
8. Copie esse IP e cole no navegador de qualquer dispositivo conectado na mesma rede Wi-Fi para visualizar a interface de monitoramento.