# API reference

The API is versioned under `/api/v1`. Local development listens on port 3000. The Render service is deployed at `https://monitoramento-iot-api.onrender.com`, with a managed PostgreSQL database.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/health` | None | API and database health |
| POST | `/api/v1/auth/token` | Username and password | Issue a one-hour HS256 bearer token |
| POST | `/api/v1/ingest` | `X-Device-Key` | Validate and store a device reading (Temp, Humidity, Luminosity) |
| GET | `/api/v1/readings/latest` | Bearer JWT | Return the latest reading |
| GET | `/api/v1/readings?limit=50&before=...` | Bearer JWT | Return paginated history |
| GET | `/api/v1/devices/{device_id}` | Bearer JWT with device access | Return device metadata and last contact |
| GET | `/api/v1/devices/{device_id}/readings` | Bearer JWT with device access | Return up to 100 readings for that device |
| GET | `/api/v1/lotes?apenas_com_selo=true` | Bearer JWT | List batches, with optional filter for certified batches only |
| POST | `/api/v1/lotes` | Bearer JWT | Create a new batch (`codigo_lote`, `nome`, `variedade`, `etapa_atual`, `data_inicio`, `device_id`) |
| PATCH | `/api/v1/lotes/{id}` | Bearer JWT | Update batch stage (`pomar` <-> `estoque`) or harvest/closure date |
| GET | `/api/v1/lotes/{id}/qualidade` | Bearer JWT | Calculate adherence in **both stages** and return the official **Selo de Qualidade da Manga** audit |

Ingestion JSON:

```json
{
  "device_id": "esp32c3-01",
  "sequence": 1,
  "timestamp": "2026-11-21T19:00:00Z",
  "temperature_c": 28.5,
  "humidity_percent": 62.0,
  "luminosity_lux": 45000.0
}
```

Duplicate `(device_id, sequence)` pairs are idempotent. Payloads outside temperature `-40..80 °C`, humidity `0..100%`, or luminosity `< 0` return `400`. Missing or invalid authentication returns `401`.

### Selo de Qualidade da Manga (`GET /api/v1/lotes/{id}/qualidade`)

**Regra de Ouro (Duas Etapas):** O lote só é elegível ao Selo de Qualidade se atingir **pelo menos 70% de conformidade em ambas as etapas**:
1. **Etapa 1 (Pomar - Cultivo no Pé):** `percentual_pomar >= 70.0%`
   - Temp: `24 °C` a `30 °C`
   - Umidade: `45%` a `70%`
   - Luminosidade: `> 40.000 lux` (período diurno)
2. **Etapa 2 (Estoque - Câmara Fria Pós-colheita):** `percentual_estoque >= 70.0%`
   - Temp: `10 °C` a `13 °C`
   - Umidade: `85%` a `90%`
   - Luminosidade: `< 50 lux` (ambiente escuro)

Se o lote falhar em qualquer uma das duas etapas, o selo é **Reprovado**. Se o lote ainda não tiver completado a transição para a câmara fria, ele fica como **Em Análise**.

Retorno de exemplo de Lote com Selo Concedido:

```json
{
  "lote_id": 1,
  "codigo_lote": "LOTE-MNG-2026-01",
  "nome": "Safra Vale do São Francisco (Certificação Completa)",
  "variedade": "Tommy Atkins",
  "etapa_atual": "estoque",
  "periodo": {
    "data_inicio": "2026-10-22T00:00:00.000Z",
    "data_colheita": "2026-11-09T00:00:00.000Z",
    "data_fim": "2026-11-19T00:00:00.000Z",
    "dias_totais": 28
  },
  "total_leituras": 8,
  "percentual_geral": 90.3,
  "percentual_pomar": 88.5,
  "percentual_estoque": 92.0,
  "aprovado_pomar": true,
  "aprovado_estoque": true,
  "elegivel_selo": true,
  "status_selo": "aprovado",
  "justificativa": "Aprovado em ambas as etapas: Pomar (88.5%) e Estoque (92.0%). Selo de Qualidade concedido!",
  "detalhamento_por_criterio": {
    "pomar": {
      "total_leituras": 4,
      "conformidade_geral": 88.5,
      "aprovado": true,
      "temperatura": { "conformidade_percent": 100.0, "ideal_min": 24, "ideal_max": 30 },
      "umidade": { "conformidade_percent": 82.5, "ideal_min": 45, "ideal_max": 70 },
      "luminosidade": { "conformidade_percent": 83.0, "ideal_min": 40000, "ideal_max": null }
    },
    "estoque": {
      "total_leituras": 4,
      "conformidade_geral": 92.0,
      "aprovado": true,
      "temperatura": { "conformidade_percent": 100.0, "ideal_min": 10, "ideal_max": 13 },
      "umidade": { "conformidade_percent": 88.0, "ideal_min": 85, "ideal_max": 90 },
      "luminosidade": { "conformidade_percent": 88.0, "ideal_min": 0, "ideal_max": 50 }
    }
  }
}
```
