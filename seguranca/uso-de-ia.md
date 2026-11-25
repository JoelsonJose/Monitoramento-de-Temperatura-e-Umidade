# Declaração de Uso de Inteligência Artificial

Em conformidade com as diretrizes do Projeto Integrador (Seção 8 do documento de Segurança no Projeto Integrador — Senac Cibersegurança), declaramos a utilização de ferramentas de Inteligência Artificial como suporte técnico durante o desenvolvimento e estruturação dos controles de segurança.

---

## 🛠️ Ferramentas Utilizadas

- **Ferramenta:** Google Antigravity (Powered by Gemini AI)
- **Finalidade:**
  1. Revisão e refatoração da lógica matemática do algoritmo TOTP (RFC 6238) e derivação de steps HMAC-SHA1.
  2. Implementação do algoritmo de criptografia autenticada AES-256-GCM para armazenamento seguro dos segredos de OTP no banco PostgreSQL.
  3. Estruturação dos testes automatizados de "Antes e Depois" com `node:test` e simulação de ataques IDOR e Replay de TOTP.
  4. Formatação e redação da documentação técnica e modelo de ameaças STRIDE.

---

## 🔍 O que a Equipe Conferiu e Alterou

1. **Revisão da Validação de Dono no Banco (Proteção contra IDOR):**
   - A equipe conferiu manualmente todas as cláusulas SQL em `backend/src/server.js` (função `verificarAcessoLote` e rotas `/devices/:id` e `/lotes/:id`), garantindo que a autorização é verificada exclusivamente no servidor a partir do usuário extraído do JWT (`identity.sub`) e da tabela `device_access`, sem confiar em identificadores enviados pelo cliente.
   - Alteramos as respostas de erro nas rotas de lotes de 403 para 404 intencionalmente, aplicando a boa prática de segurança para evitar enumeração de recursos confidenciais (resource enumeration).

2. **Revisão da Proteção contra Replay no TOTP:**
   - Conferimos a implementação do consumo atômico de step em `backend/src/auth/totp-replay.js` (`UPDATE users SET otp_last_step = $2 WHERE otp_last_step < $2`), garantindo que não há condição de corrida (*race condition*) e que o mesmo código de 6 dígitos é invalidado imediatamente após ser aceito dentro do intervalo de 30 segundos.

3. **Revisão dos Códigos de Recuperação:**
   - Conferimos a geração e o hash em SHA-256 dos códigos de recuperação em `backend/src/auth/recovery-codes.js`, garantindo que os códigos brutos nunca sejam armazenados em texto claro no banco de dados e que a remoção ocorra de forma atômica no array JSONB.

4. **Inclusão do Código de Missão nos Logs de Bloqueio:**
   - Inserimos e conferimos a função `logSecurityBlock` para assegurar que, a cada tentativa de ataque bloqueada (2FA inválido ou IDOR detectado), a mensagem de log registre explicitamente o identificador `[SEGURANCA][<CODIGO_DE_MISSAO>]`.

5. **Responsabilidade Técnica:**
   - Todos os integrantes da equipe estudaram o funcionamento dos módulos desenvolvidos, revisaram os arquivos de teste e estão preparados para explicar as decisões de arquitetura e executar as alterações ao vivo solicitadas pelo professor durante a banca de avaliação.

---

## 🥭 Assistente de IA do produto (chatbot de agronomia da manga)

Além do uso de IA como apoio ao desenvolvimento (seções acima), o **produto** passou a ter um assistente de IA em tempo de execução.

- **Uso no produto:** `POST /api/v1/chat` (`backend/src/chat/agronomia-chat.js`) envia a conversa a um modelo de linguagem (API Google Gemini, camada gratuita do Google AI Studio; modelo configurável em `AI_MODEL`) com um prompt de sistema restrito a agronomia da manga.
- **Ferramenta de apoio ao desenvolvimento deste recurso:** Claude Code (Anthropic), usado para escrever o primeiro rascunho do módulo, da interface e dos testes.
- **Privacidade:** na camada gratuita do Gemini o Google pode usar o conteúdo das conversas para melhorar seus produtos; por isso o chat não deve receber dados pessoais nem credenciais (o aviso está no rodapé da janela).
- **Controles de segurança:** chave `AI_API_KEY` apenas no servidor (`.env` ignorado pelo Git / variável de ambiente no Render), nunca enviada ao navegador nem a respostas de erro ou logs; rota protegida por token JWT; limite de 10 perguntas por minuto por usuário; validação de tamanho e formato das mensagens; resposta exibida no navegador com `textContent` (sem interpretar HTML).
- **O que a equipe deve conferir antes da banca:** ler `agronomia-chat.js` e `index.html` (bloco "Assistente de IA"), rodar `npm test` em `backend/`, testar o chat com uma chave própria e saber explicar por que a chave não pode ficar no front-end.
