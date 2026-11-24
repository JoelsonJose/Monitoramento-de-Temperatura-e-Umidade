# Relatório de Segurança do Projeto Integrador — Manga Trace IoT

## 1. Identificação
- **Projeto do PI:** Manga Trace — Sistema IoT de Monitoramento Microclimático e Selo de Qualidade da Manga
- **Instituição:** Senac
- **Curso:** Cibersegurança
- **Professor:** Ronierison Maciel
- **Código de Missão:** `MISSAO` *
- **Integrantes da Equipe:**
  - Morgana Barbosa da Silva —
  - Homero —
  - Joelson — 
  - Lucas Ximenes — 
  - Nicollas — 
  - Thayanne — 
  - João César — 

---

## 2. O Projeto
O **Manga Trace** é uma solução de IoT voltada para a cadeia produtiva da manga no Vale do São Francisco. O sistema realiza o monitoramento contínuo de temperatura, umidade e luminosidade tanto no pomar (maturação) quanto nas câmaras frias (pós-colheita), auditando automaticamente se o lote cumpriu a *Regra das Duas Etapas (>= 70% de conformidade)* para concessão do Selo de Qualidade.

- **Hardware e Dispositivos:** Placas microcontroladas ESP32-C3 com sensores de temperatura e umidade DHT11 e sensores de luminosidade LDR, com suporte a comunicação Wi-Fi (HTTPS/HTTP) e conexão local via cabo USB (Web Serial API).
- **Backend e Nuvem:** API RESTful desenvolvida em Node.js 22 nativo (sem frameworks pesados), banco de dados relacional PostgreSQL (com suporte a fallback em memória Plug & Play), e deploy em nuvem na plataforma Render ([https://monitoramento-iot-api.onrender.com](https://monitoramento-iot-api.onrender.com)).
- **Arquitetura:** Ingestão autenticada por chave de dispositivo (`x-device-key`), controle de acesso por tokens JWT com finalidade estrita (*purpose-bound*), armazenamento criptografado de chaves e interface web responsiva integrada.

---

## CONTROLE 1: Autenticação em Dois Fatores com OTP (2FA / TOTP)

### 3. A Ameaça
- **O que pode dar errado sem o controle:** O painel dependia unicamente de autenticação de fator único (usuário e senha estáticos). Se as credenciais do produtor fossem descobertas por ataque de força bruta, dicionário, vazamento de credenciais em outros serviços (*credential stuffing*) ou engenharia social/phishing, um invasor obteria acesso total e irrestrito.
- **Impacto para o projeto:** Invasores poderiam adulterar relatórios de qualidade, certificar fraudulentamente lotes de mangas estragadas com o Selo de Qualidade, apagar lotes de produtores legítimos e comprometer a reputação de exportação da cooperativa agrícola.

### 4. O Controle
- **O que foi implementado:**
  1. **Algoritmo TOTP (RFC 6238):** Geração e validação de tokens OTP de 6 dígitos baseados em tempo (HMAC-SHA1 com janelas de 30 segundos) totalmente processados no servidor em [backend/src/auth/totp.js](../backend/src/auth/totp.js).
  2. **Cadastro via QR Code:** Geração de URI padronizada `otpauth://totp/...` e renderização de QR Code em formato Data URL PNG no servidor para leitura pelo Google Authenticator, Microsoft Authenticator ou Authy em [backend/src/auth/qr-code.js](../backend/src/auth/qr-code.js).
  3. **Códigos de Recuperação de Uso Único:** Geração de 8 códigos aleatórios em formato `XXXX-XXXX-XXXX`, com armazenamento em hash SHA-256 no banco e destruição atômica após o primeiro uso em [backend/src/auth/recovery-codes.js](../backend/src/auth/recovery-codes.js).
  4. **Proteção contra Replay:** Consumo atômico da janela temporal no PostgreSQL via coluna `otp_last_step`, impedindo que o mesmo código de 6 dígitos seja reutilizado dentro do mesmo intervalo em [backend/src/auth/totp-replay.js](../backend/src/auth/totp-replay.js).
  5. **Criptografia de Segredos em Repouso:** Os segredos TOTP de cada usuário são criptografados com **AES-256-GCM** antes de serem salvos no banco de dados em [backend/src/auth/secret-encryption.js](../backend/src/auth/secret-encryption.js).
  6. **Tokens de Finalidade Específica (Purpose Binding):** O login inicial emite apenas um `challenge_token` (`purpose: 'otp_challenge'`, validade de 300s). Rotas da aplicação rejeitam esse token se o segundo fator não for validado com sucesso em [backend/src/security.js](../backend/src/security.js).
  7. **Log de Bloqueio com Código de Missão:** Quando uma tentativa de 2FA falha (código errado, expirado ou replay), é disparado o log padronizado:
     `[SEGURANCA][<CODIGO_MISSAO>][2FA_OTP] Bloqueio: Código OTP ou de recuperação inválido...` em [backend/src/server.js](../backend/src/server.js).

### 5. Como Testar
Para executar a verificação automatizada completa dos 5 cenários obrigatórios:

```bash
# Definir o código de missão e executar o script de teste
node seguranca/testes/teste-depois-2fa.js
```

### 6. Resultado (Antes vs Depois)
- **Antes:** Requisição de login em `/api/v1/auth/token` apenas com usuário e senha entregava imediatamente o `access_token` JWT. Evidenciado em [seguranca/testes/teste-antes-2fa.js](testes/teste-antes-2fa.js).
- **Depois:**
  - Login com senha correta sem OTP retorna `{ otp_required: true, challenge_token }` (acesso bloqueado).
  - Código incorreto (`000000`) retorna **HTTP 401 Unauthorized** com log contendo o código de missão.
  - Código TOTP de 6 dígitos válido é aceito e emite o `access_token`.
  - Reutilização do mesmo código (replay) é imediatamente bloqueada com HTTP 401.
  - Código de recuperação funciona no primeiro uso e falha no segundo.
  - **Evidências:** [seguranca/evidencias/log-teste-2fa-MISSAO.txt](evidencias/log-teste-2fa-MISSAO.txt) e [seguranca/evidencias/roteiro-video-demonstracao-MISSAO.md](evidencias/roteiro-video-demonstracao-MISSAO.md).

### 7. Limitações
- **O que o controle não cobre:** Ataques de phishing em tempo real (*adversary-in-the-middle* / Evilginx) que interceptem o código TOTP no instante de geração.
- **Próximo passo:** Implementação de chaves físicas de segurança FIDO2 / WebAuthn baseadas em hardware (Passkeys).

---

## CONTROLE 2: Proteção contra IDOR (Insecure Direct Object Reference)

### 3. A Ameaça
- **O que pode dar errado sem o controle:** As rotas que recebiam identificadores de dispositivos (`/api/v1/devices/:id`) ou lotes (`/api/v1/lotes/:id`) confiavam cegamente no ID enviado pela URL. Um usuário mal-intencionado ou concorrente poderia alterar o parâmetro para inspecionar dispositivos ou alterar lotes de terceiros.
- **Impacto para o projeto:** Vazamento de dados confidenciais de telemetria de outras fazendas e câmaras frias, espionagem de safras, comandos indevidos de colheita forçada e destruição/exclusão maliciosa de lotes concorrentes.

### 4. O Controle
- **O que foi implementado:**
  1. **Verificação de Dono no Servidor:** A cada requisição, a API extrai o usuário a partir do token criptográfico de sessão (`identity.sub`) e faz a junção estrita com a tabela de permissões `device_access` (`WHERE a.username = $1 AND a.can_read = TRUE`), garantindo que apenas os recursos vinculados ao produtor autenticado sejam manipulados.
  2. **Controle Estrito de Propriedade (`is_owner`):** Operações destrutivas e de comando (criação de lotes, alteração de parâmetros via `PUT`/`PATCH`, comando de colheita via `/colher` e exclusão via `DELETE`) exigem explicitamente `is_owner = TRUE` através da função `verificarAcessoLote` em [backend/src/server.js](../backend/src/server.js).
  3. **Respostas Anti-Enumeração:** Tentativas de acesso ou manipulação de recursos de outros usuários recebem **HTTP 403 Forbidden** ou **HTTP 404 Not Found** (impedindo que um invasor descubra quais IDs de lotes existem no sistema).
  4. **Log de Bloqueio com Código de Missão:** Toda tentativa de violação de fronteira de dono emite o log obrigatório:
     `[SEGURANCA][<CODIGO_MISSAO>][IDOR_DEVICE]` ou `[SEGURANCA][<CODIGO_MISSAO>][IDOR_LOTE]` em [backend/src/server.js](../backend/src/server.js).

### 5. Como Testar
Para executar a verificação automatizada de IDOR com dois usuários concorrentes:

```bash
# Executar a suíte de testes de IDOR
node seguranca/testes/teste-depois-idor.js
```

### 6. Resultado (Antes vs Depois)
- **Antes:** O usuário A alterava o ID de `esp32c3-01` para `esp32c3-02` ou lote `1` para `2` e conseguia ler telemetria e deletar lotes de outro produtor. Evidenciado em [seguranca/testes/teste-antes-idor.js](testes/teste-antes-idor.js).
- **Depois:**
  - Tentativa do Usuário A de consultar dispositivo de B recebe **HTTP 403** com log de segurança.
  - Tentativa de auditar qualidade do lote de B recebe **HTTP 404** com log de segurança.
  - Tentativa de enviar comando de colheita ao lote de B recebe **HTTP 404** com log de segurança.
  - Tentativa de alterar parâmetros via PUT no lote de B recebe **HTTP 404** com log de segurança.
  - Usuário B (proprietário) continua operando seus recursos normalmente com **HTTP 200**.
  - **Evidências:** [seguranca/evidencias/log-teste-idor-MISSAO.txt](evidencias/log-teste-idor-MISSAO.txt) e [seguranca/evidencias/roteiro-video-demonstracao-MISSAO.md](evidencias/roteiro-video-demonstracao-MISSAO.md).

### 7. Limitações
- **O que o controle não cobre:** Compartilhamento intencional de credenciais ou autorizações delegadas complexas entre cooperativas (RBAC multi-tenant avançado).
- **Próximo passo:** Implementação de listas de controle de acesso granulares (ACL) com permissões delegadas temporárias por lote auditado.

---

## 🎯 Guia para a Apresentação e Alteração ao Vivo (10 Minutos)

Durante a banca, o professor selecionará um integrante da equipe para realizar uma alteração ao vivo nos controles. Abaixo estão as preparações para os cenários mais prováveis:

1. **Alterar a janela de validade do código OTP:**
   - Arquivo: [backend/src/auth/totp.js](../backend/src/auth/totp.js)
   - Na função `getMatchingTotpStep(secret, token, options)`, alterar o parâmetro `window` de `1` (padrão que aceita step anterior, atual e posterior) para `0` (apenas step atual exato de 30s) ou para `2` (janela ampliada).
2. **Invalidar todos os códigos de recuperação de um usuário:**
   - No banco PostgreSQL ou na API:
     `UPDATE users SET recovery_codes_hash = '[]'::jsonb WHERE username = 'demo';`
3. **Criar um terceiro usuário e comprovar isolamento:**
   - Criar `usuario_c` e atribuir um novo `esp32c3-03`. Executar a chamada e mostrar que ele recebe HTTP 403/404 ao tentar ler dados dos usuários A e B.
4. **Proteger uma rota nova contra IDOR:**
   - Basta importar e invocar `await verificarAcessoLote(db, identity.sub, novoId, true)` antes de processar qualquer lógica.
