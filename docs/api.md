# API reference

The API is versioned under `/api/v1`. Local development listens on port 3000. The Render service is deployed at `https://monitoramento-iot-api.onrender.com`, with a managed PostgreSQL database.

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/health` | None | API and database health |
| POST | `/api/v1/auth/register` | None | Create a read-only user and start that user's authenticator enrollment |
| POST | `/api/v1/auth/token` | Username and password | Issue a one-hour HS256 bearer token |
| POST | `/api/v1/ingest` | `X-Device-Key` | Validate and store a device reading (Temp, Humidity, Luminosity) |
| GET | `/api/v1/readings/latest` | Bearer JWT | Return the latest reading |
| GET | `/api/v1/readings?limit=50&before=...` | Bearer JWT | Return paginated history |
| GET | `/api/v1/devices` | Bearer JWT | List only devices explicitly associated with the current user |
| GET | `/api/v1/devices/{device_id}` | Bearer JWT with device access | Return device metadata and last contact |
| GET | `/api/v1/devices/{device_id}/readings` | Bearer JWT with device access | Return up to 100 readings for that device |
| GET | `/api/v1/lotes?apenas_com_selo=true` | Bearer JWT | List batches, with optional filter for certified batches only |
| POST | `/api/v1/lotes` | Bearer JWT | Create a new batch (`codigo_lote`, `nome`, `variedade`, `etapa_atual`, `data_inicio`, `device_id`) |
| PATCH | `/api/v1/lotes/{id}` | Bearer JWT | Update batch stage (`pomar` <-> `estoque`) or harvest/closure date |
| GET | `/api/v1/lotes/{id}/qualidade` | Bearer JWT | Calculate adherence in **both stages** and return the official **Selo de Qualidade da Manga** audit |

### Account registration and two-factor setup

`POST /api/v1/auth/register` accepts `{"username":"ana","password":"at-least-12-characters"}`. Usernames are normalized to lowercase and must contain 3-32 letters, numbers, dots, underscores or hyphens. Passwords require 12-256 characters and are stored as salted scrypt hashes. A new account receives the `viewer` role but **no device access**. It cannot see readings or device metadata until an administrator explicitly associates a device with that account; assignment currently requires an authorized database operation because there is no device-sharing screen/API yet. The initial migration removes old automatic grants to the configured demo device, retaining access for the configured demo owner.

A successful registration returns HTTP 201 with a short-lived `setup_token`. Send it as a Bearer token to `POST /api/v1/auth/otp/setup` to receive a unique QR code and manual TOTP secret. Scan it in Microsoft Authenticator using **+ > Other account**, or another RFC 6238 compatible authenticator, then submit its six-digit code to `POST /api/v1/auth/otp/enable`. Eight one-time recovery codes are returned once. The authenticator generates codes locally; this flow does not send push notifications, email or SMS. Each account has its own TOTP secret. Registration is limited to five attempts per client address per 15 minutes.

`POST /api/v1/auth/token` verifies the stored password hash and then requires the account's TOTP code or a recovery code. The first successful login for the legacy environment-configured account upgrades its password to a scrypt hash. Registration errors: `400` invalid username/password, `409` username already taken, `429` rate limited, `503` security configuration missing.

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

## Assistente de IA — agronomia da manga (`POST /api/v1/chat`)

Chatbot do dashboard (botão redondo no canto inferior direito, visível após o login). O navegador nunca fala com o provedor de IA: ele chama esta rota, e o **servidor** usa a chave `AI_API_KEY` (lida do `.env` ou das variáveis de ambiente do Render).

- **Autenticação:** `Authorization: Bearer <token de acesso>` (mesmo token das demais rotas).
- **Corpo:** `{"messages":[{"role":"user","content":"Quando colher a Tommy Atkins?"}]}`. Máximo de 12 mensagens e 1500 caracteres por mensagem; a conversa deve começar e terminar com `user`.
- **Resposta 200:** `{"resposta":"..."}`.
- **Erros:** `400` corpo inválido · `401` sem token/expirado · `429` mais de 10 perguntas por minuto por usuário · `503` `AI_API_KEY` não configurada · `502`/`504` provedor de IA indisponível ou lento. As mensagens de erro nunca incluem a chave nem o corpo de resposta do provedor.
- **Escopo do assistente:** responde só sobre agronomia da manga (prompt de sistema em `backend/src/chat/agronomia-chat.js`) e recomenda consultar um engenheiro agrônomo para doses e defensivos.
- **Configuração:** `AI_API_KEY` (obrigatória, sem aspas) e `AI_MODEL` (opcional, padrão `gemini-3.5-flash-lite`) em `.env`. Veja `.env.example`.
- **Chave gratuita:** crie em https://aistudio.google.com/apikey (Google AI Studio, camada gratuita). Os limites de uso gratuito são do Google; ao estourar, a rota responde `429` com mensagem amigável. Na camada gratuita o Google pode usar o conteúdo das conversas para melhorar seus produtos, então não envie dados pessoais.
