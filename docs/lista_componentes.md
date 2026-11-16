# Lista de componentes

Escopo do protótipo demonstrado: um sensor DHT11 conectado a uma ESP32-C3.

| Item | Quantidade | Situação / observação |
|---|---:|---|
| Placa de desenvolvimento ESP32-C3 | 1 | Disponível; alimentação USB durante a demonstração |
| Sensor de temperatura e umidade DHT11 | 1 | Sensor usado nos testes F1/F3 e na página local |
| Protoboard | 1 | Reutilizável; verificar conexões antes de energizar |
| Fios jumper | 3 ou mais | VCC, DATA e GND; GPIO de dados usado no firmware: GPIO 5 |
| Cabo USB compatível com a placa | 1 | Programação e alimentação da ESP32-C3 |
| Resistor pull-up de 4,7 kΩ a 10 kΩ | 0 ou 1 | Opcional: instalar entre DATA e 3V3 apenas se o DHT11 for sensor sem módulo/pull-up integrado |
| Caixa / suporte | 1 | Reutilizado; não é invólucro calibrado ou certificado |

## Ligações

- DHT11 VCC → 3V3 da ESP32-C3.
- DHT11 DATA → GPIO 5.
- DHT11 GND → GND da ESP32-C3.
- Se for sensor nu sem resistor integrado: pull-up entre DATA e 3V3.

Confira as inscrições no módulo e o pinout específico da placa. A ordem física dos pinos pode variar entre módulos DHT11.
