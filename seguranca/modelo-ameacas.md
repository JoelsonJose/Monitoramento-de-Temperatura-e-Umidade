# Modelo de Ameaças (STRIDE) — Manga Trace IoT

Este documento analisa as principais ameaças ao ecossistema de monitoramento microclimático do projeto **Manga Trace** (ESP32-C3, API Node.js, PostgreSQL e Painel Web), destacando quais ameaças são mitigadas pelos controles obrigatórios de **2FA com OTP** e **Proteção contra IDOR**, e quais permanecem abertas com seus respectivos planos de mitigação.

---

## 🎯 Escopo e Arquitetura do Sistema
O sistema coleta telemetria de sensores (temperatura, umidade e luminosidade) através de nós ESP32-C3 instalados em pomares e câmaras frias de manga no Vale do São Francisco, transmitindo dados via HTTP/HTTPS para uma API Node.js que gerencia a conformidade de lotes e concede o Selo de Qualidade.

```
[ ESP32-C3 Sensor ] --- (Ingestão HTTP / API Key) ---> [ API Node.js ] <---> [ PostgreSQL ]
                                                              ^
[ Produtor / Atacante ] --- (Painel Web / REST API) ----------+
```

---

## 🛡️ Análise de Ameaças (STRIDE)

| ID | Categoria STRIDE | Descrição da Ameaça no Contexto do Projeto | Impacto no Negócio | Tratada por Controle Obrigatório? | Status |
|:---|:---|:---|:---|:---|:---|
| **T1** | **Spoofing** (Falsificação de Identidade) | Atacante obtém credenciais de login de um produtor (via phishing, credenciais vazadas ou força bruta) e autentica-se indevidamente no painel web. | Comprometimento total da conta, adulteração de auditorias e espionagem de lotes agrícolas. | **Sim — Tratada pelo 2FA com OTP (TOTP)** | **Mitigada** ✅ |
| **T2** | **Elevation of Privilege** (Elevação de Privilégio) / IDOR | Usuário autenticado legítimo altera os IDs nas requisições da API (`/devices/:id`, `/lotes/:id`) para visualizar ou comandar dispositivos de outros produtores concorrentes. | Espionagem industrial de safras concorrentes, alteração forçada de parâmetros de câmaras frias e exclusão maliciosa de lotes. | **Sim — Tratada pela Proteção contra IDOR** | **Mitigada** ✅ |
| **T3** | **Tampering** (Adulteração de Dados no Dispositivo) | Atacante com acesso físico ao pomar intercepta a fiação I2C/OneWire do sensor DHT11 ou falsifica leituras injetando valores falsos de temperatura na ESP32. | Falsa aprovação do Selo de Qualidade da Manga ou perda de carga térmica não detectada. | **Não** (Ameaça física no hardware/firmware) | **Aberta** ⚠️ |
| **T4** | **Information Disclosure** (Interceptação de Tráfego de Rede) | Interceptação de dados de telemetria em redes Wi-Fi públicas ou não criptografadas quando a ESP32 transmite sem TLS/HTTPS ativado. | Exposição de dados de produção e localização das fazendas. | **Não** (Ameaça de camada de transporte) | **Aberta** ⚠️ |

---

## 🔍 Detalhamento das Ameaças e Controles

### Ameaças Mitigadas pelos Controles:

1. **Ameaça T1 (Spoofing) ➔ Mitigada pelo Controle 1 (2FA com OTP):**
   - **Mecanismo:** Mesmo que a senha seja comprometida, o atacante é impedido de emitir o `access_token` JWT. O sistema exige a validação criptográfica do token TOTP de 6 dígitos gerado em aplicativo autenticador RFC 6238 ou código de recuperação de uso único. Replays são rejeitados pelo rastreamento atômico de step (`otp_last_step`).

2. **Ameaça T2 (IDOR / Broken Access Control) ➔ Mitigada pelo Controle 2 (Proteção contra IDOR):**
   - **Mecanismo:** A API não confia em parâmetros de identificação fornecidos pelo cliente. A cada requisição, a camada de acesso ao banco faz join estrito com a tabela `device_access`, validando se o `username` extraído da assinatura criptográfica do JWT é o proprietário (`is_owner = TRUE`). Tentativas não autorizadas recebem HTTP 403 ou HTTP 404 (anti-enumeração) e disparam logs imediatos de auditoria com o código de missão.

---

## ⚠️ Ameaças Residuais e Riscos que Continuam Abertos

1. **Adulteração Física / Spoofing de Sensores (T3):**
   - **Risco Atual:** O DHT11 não possui autenticação criptográfica no canal de hardware com a ESP32.
   - **Próximo Passo / Mitigação:** Adoção de elementos seguros (como ATECC608A) no nó IoT e detecção estatística de anomalias por IA no backend para identificar curvas térmicas fisicamente impossíveis.

2. **Interceptação de Tráfego Local (T4):**
   - **Risco Atual:** Em redes de teste locais onde o TLS estiver desabilitado, um atacante na mesma rede LAN pode farejar a chave `X-Device-Key`.
   - **Próximo Passo / Mitigação:** Imposição estrita de HTTPS com certificado raiz fixado em firmware (`API_ROOT_CA`) e rotação periódica de chaves dos dispositivos.
