# Problema de IA e baseline da prévia

## Problema da prévia

Estimar as próximas leituras de temperatura e umidade, previstas para ocorrer a cada cinco segundos, usando o histórico do DHT11. Este baseline simples serve como referência inicial e não deve ser apresentado como um modelo de IA treinado.

## Dados físicos e divisão temporal

O cálculo usou as 100 leituras físicas consecutivas mais recentes do dispositivo `esp32c3-01`, consultadas na API/PostgreSQL local em 16/11/2026. A amostra cobriu sequências 693–792 e os horários 2026-11-16 02:15:23Z–02:23:41Z. As primeiras 80 linhas formaram o trecho anterior e as últimas 20 foram usadas na avaliação temporal. As linhas não foram embaralhadas.

## Baseline

Previsão persistente: para cada ponto de teste, estimar temperatura e umidade seguintes repetindo o valor da leitura anterior. Métrica: erro absoluto médio (MAE).

| Variável | Pontos de teste | MAE |
|---|---:|---:|
| Temperatura | 20 | 0,01 °C |
| Umidade relativa | 20 | 0,10 ponto percentual |

## Limitações e próxima etapa

Os valores variaram pouco durante essa janela estável de aproximadamente oito minutos. O MAE baixo descreve somente esta amostra e não comprova desempenho em condições variáveis. A entrega final exige pelo menos 48 horas de dados, avaliação temporal, modelo que supere o baseline, endpoint `/predict` e model card. A consulta e os dados podem ser reproduzidos pela API protegida; credenciais não são registradas neste documento.
