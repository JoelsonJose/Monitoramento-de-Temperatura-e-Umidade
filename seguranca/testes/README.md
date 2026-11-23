# Testes Automatizados de Segurança (Antes e Depois)

Este diretório contém os scripts de teste automatizados para comprovação empírica dos dois controles de segurança obrigatórios do Projeto Integrador:

1. **Controle 1:** Autenticação em Dois Fatores com OTP (TOTP e Códigos de Recuperação)
2. **Controle 2:** Proteção contra IDOR (Verificação de Dono no Servidor)

Todos os scripts utilizam exclusivamente o runtime nativo do Node.js (>= 22) com o módulo `node:test` e `node:assert`, sem dependências externas complexas.

---

## 🚀 Como Executar os Testes

Para executar com o seu código de missão recebido do professor (exemplo: `K7Q2M9`), defina a variável de ambiente `MISSION_CODE`:

### No Linux / macOS / Git Bash:
```bash
export MISSION_CODE=K7Q2M9

# 1. Testes de 2FA/OTP
node seguranca/testes/teste-antes-2fa.js
node seguranca/testes/teste-depois-2fa.js

# 2. Testes de Proteção contra IDOR
node seguranca/testes/teste-antes-idor.js
node seguranca/testes/teste-depois-idor.js
```

### No Windows PowerShell:
```powershell
$env:MISSION_CODE="K7Q2M9"

# 1. Testes de 2FA/OTP
node seguranca\testes\teste-antes-2fa.js
node seguranca\testes\teste-depois-2fa.js

# 2. Testes de Proteção contra IDOR
node seguranca\testes\teste-antes-idor.js
node seguranca\testes\teste-depois-idor.js
```

---

## 📋 Descrição dos Cenários Testados

### 1. Controle de 2FA com OTP
- **`teste-antes-2fa.js` (Antes):**
  - Mostra que a API legada aceitava apenas usuário e senha e devolvia o `access_token` JWT imediatamente.
  - Demonstra a fragilidade: senhas roubadas ou interceptadas davam acesso irrestrito ao painel de monitoramento de mangas.
- **`teste-depois-2fa.js` (Depois):**
  - **Cenário 1:** Login com senha correta sem código OTP não entrega token de acesso (retorna desafio `challenge_token`).
  - **Cenário 2:** Tentativa de autenticação com código OTP incorreto/vencido é rejeitada com HTTP 401 e log com código de missão.
  - **Cenário 3:** Código OTP de 6 dígitos gerado via TOTP padrão RFC 6238 é aceito com HTTP 200 e libera o `access_token`.
  - **Cenário 4 (Replay Attack):** O mesmo código OTP não pode ser usado novamente no mesmo intervalo de 30 segundos (bloqueado com HTTP 401 e log de segurança).
  - **Cenário 5 (Recovery Codes):** Código de recuperação de uso único funciona uma única vez e é invalidado atomicamente no banco.

---

### 2. Controle de Proteção contra IDOR
- **`teste-antes-idor.js` (Antes):**
  - Demonstra a vulnerabilidade IDOR: o endpoint recebia o identificador do dispositivo (`/devices/:id`) ou do lote (`/lotes/:id`) e confiava na URL.
  - O Usuário A trocava o ID e lia telemetria de câmaras frias alheias ou excluía lotes de outro produtor.
- **`teste-depois-idor.js` (Depois):**
  - **Cenário 1:** O Usuário A tenta ler dispositivo de B trocando o ID -> Bloqueado com HTTP 403 e log de segurança.
  - **Cenário 2:** O Usuário A tenta auditar a qualidade do lote de B trocando o ID -> Bloqueado com HTTP 404 (anti-enumeração) e log de segurança.
  - **Cenário 3:** O Usuário A tenta disparar o comando de colheita (`/colher`) no lote de B -> Bloqueado com HTTP 404 e log de segurança.
  - **Cenário 4:** O Usuário A tenta alterar parâmetros do lote de B via `PUT` -> Bloqueado com HTTP 404 e log de segurança.
  - **Cenário 5:** O Usuário B (dono legítimo) acessa seus próprios dispositivos e lotes normalmente com HTTP 200.
