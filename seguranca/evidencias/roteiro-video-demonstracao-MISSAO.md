# Roteiro de Gravação de Vídeos de Evidência (Até 90 segundos cada)

Este roteiro orienta a gravação dos vídeos curtos exigidos pelo edital para comprovação dos controles de segurança e utilização como **Plano B** durante a apresentação do Projeto Integrador.

---

## 📹 Vídeo 1: Demonstração do 2FA com OTP (Até 90 segundos)
**Arquivo de Entrega:** `seguranca/evidencias/video-teste-2fa-MISSAO.mp4`

- **[00:00 - 00:15] Introdução:** Mostrar o terminal ou tela de login do Manga Trace. Apresentar o código de missão da equipe.
- **[00:15 - 00:30] Tentativa de Login sem OTP:** Digitar usuário e senha válidos. Mostrar que o sistema NÃO concede o token direto e exige a validação do 2FA (`challenge_token`).
- **[00:30 - 00:45] Código Incorreto e Log de Bloqueio:** Digitar um código OTP incorreto (`000000`). Mostrar a rejeição HTTP 401 e a mensagem de log no terminal contendo o código de missão:
  `[SEGURANCA][<CODIGO_MISSAO>][2FA_OTP] Bloqueio: Código OTP ou de recuperação inválido...`
- **[00:45 - 01:05] Código Válido (Google Authenticator / Authy):** Gerar o código válido de 6 dígitos no aplicativo autenticador, submeter e demonstrar o acesso liberado ao painel.
- **[01:05 - 01:20] Tentativa de Replay:** Submeter imediatamente o mesmo código OTP e mostrar o bloqueio imediato (proteção contra replay attack).
- **[01:20 - 01:30] Conclusão:** Mostrar o uso de um código de recuperação e a sua imediata invalidação para novos acessos.

---

## 📹 Vídeo 2: Demonstração da Proteção contra IDOR (Até 90 segundos)
**Arquivo de Entrega:** `seguranca/evidencias/video-teste-idor-MISSAO.mp4`

- **[00:00 - 00:15] Contexto de Dois Usuários:** Apresentar que existem dois usuários cadastrados:
  - **Usuário A:** Proprietário do dispositivo `esp32c3-01` e Lote 1.
  - **Usuário B:** Proprietário do dispositivo `esp32c3-02` e Lote 2 (confidencial).
- **[00:15 - 00:40] Tentativa de IDOR em Dispositivos:**
  - Usuário A logado com seu token válido tenta requisitar `/api/v1/devices/esp32c3-02`.
  - Mostrar a resposta **HTTP 403 Forbidden** e o log de segurança gerado:
    `[SEGURANCA][<CODIGO_MISSAO>][IDOR_DEVICE] Bloqueio: Acesso negado: dispositivo pertence a outro usuário...`
- **[00:40 - 01:05] Tentativa de IDOR em Lotes e Comandos:**
  - Usuário A tenta auditar o lote 2 de B (`/api/v1/lotes/2/qualidade`) ou mandar comando de colheita (`/api/v1/lotes/2/colher`).
  - Mostrar a resposta **HTTP 404 Not Found** (anti-enumeração) e o bloqueio da operação.
- **[01:05 - 01:30] Acesso Legítimo do Dono:**
  - Usuário B autentica-se e acessa o dispositivo `esp32c3-02` e Lote 2 normalmente com **HTTP 200 OK**.
  - Conclusão demonstrando que cada produtor só tem visão e comando sobre seus próprios recursos.
