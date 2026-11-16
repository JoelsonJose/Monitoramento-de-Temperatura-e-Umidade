# Plano de testes da prévia

## Hardware e aplicação local

| ID | Caso | Procedimento | Resultado esperado | Resultado observado |
|---|---|---|---|---|
| HW-01 | Leitura normal | Ligar a ESP32-C3 com DHT11 conectado; consultar a página local | Temperatura, umidade, estado do sensor e Wi-Fi aparecem e atualizam | Aprovado: página local atualizou leituras; HTTP 200; leituras válidas observadas |
| F1 | Perda e recuperação do Wi-Fi | Desligar o modem/ponto de acesso; confirmar perda; religar; verificar a ESP32 | A placa recupera conexão e a página local volta a responder | Aprovado funcionalmente: equipe observou a queda durante modem desligado; após ligar, 3 respostas HTTP 200 e Wi-Fi conectado. Duração e latência não cronometradas |
| F3 | Falha e recuperação do sensor | Com a ESP32 ligada, remover apenas o fio DATA do DHT11; consultar página; reconectar DATA | Página sinaliza leitura atual inválida, não trata valores anteriores como atuais e retorna a leituras válidas após a reconexão | Aprovado: 2 respostas HTTP 200 mostraram falha e mantiveram a última leitura válida identificada; após reconectar, 3 respostas mostraram leitura válida. Latência não cronometrada |

## Backend e automação

| ID | Caso | Resultado registrado |
|---|---|---|
| API-01 | Testes unitários de token JWT e validação de dados | 3 aprovados |
| API-02 | Smoke test de painel, emissão de token, chave inválida, corpo inválido e JWT ausente | HTTP 200 / token emitido / HTTP 401 / HTTP 400 / HTTP 401 |
| API-03 | Validar sintaxe JavaScript e configuração Docker Compose | Aprovados |
| API-04 | Subir PostgreSQL/API via Docker e validar integração básica | Aprovado: contêineres API e PostgreSQL saudáveis; `/health` reportou banco conectado; dashboard HTTP 200; login e consulta autenticada HTTP 200; rota protegida sem token HTTP 401 |
| API-05 | Receber e persistir leitura física da ESP32 | Aprovado: firmware compilado e carregado na ESP32-C3 pela COM5; API consultada após o envio retornou 12 leituras de `esp32c3-01`; sequências consecutivas chegaram em intervalos de 5 s; registros continham temperatura, umidade e timestamp UTC |
| API-06 | Encaminhar leitura física ao ThingSpeak | Aprovado: duas gravações de leituras físicas por HTTPS; HTTP 200, entry IDs 1 e 2, intervalo de 20 s |

## Limites do registro

Os resultados F1 e F3 confirmam o comportamento funcional para esta demonstração. A integração local transmite duas métricas físicas (temperatura e umidade) e também device ID, sequência e timestamp UTC. As leituras foram confirmadas no PostgreSQL. O transporte do protótipo usa HTTP na rede privada; publicação HTTPS, retransmissão após perda de rede e teste de duplicatas ainda não foram comprovados. Não foram medidos tempo de indisponibilidade, latência de reconexão, perda de pacotes ou duração da recuperação do sensor. As credenciais Wi-Fi e da API não devem ser incluídas nos documentos ou no repositório.
