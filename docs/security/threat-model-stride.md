# Modelo de ameaças STRIDE

Escopo: sensor DHT11, ESP32-C3, Wi-Fi, API de ingestão, PostgreSQL e dashboard. Este é um exercício inicial de projeto, não uma avaliação de segurança completa.

| Categoria STRIDE | Exemplo de ameaça | Mitigação atual / planejada | Evidência ainda necessária |
|---|---|---|---|
| Falsificação | Atacante envia leituras falsas do dispositivo | Rota de ingestão exige chave do dispositivo | Rotacionar a chave, guardá-la em cofre de segredos e garantir TLS no trajeto dispositivo/API |
| Adulteração | Leitura alterada no trânsito ou banco | Limites de entrada, ingestão autenticada e restrições do banco | Teste de integridade e confirmação do trajeto HTTPS |
| Repúdio | Não identificar qual dispositivo enviou a leitura | ID do dispositivo, sequência e horário no esquema da API | Auditoria dos registros e suporte de identidade/horário no firmware |
| Divulgação de informação | Senhas de Wi-Fi ou API publicadas no código | `credentials.h` local e `.env` ignorados pelo Git | Revisar histórico Git e configuração de segredos hospedados |
| Negação de serviço | Requisições repetidas sobrecarregam API ou banco | Corpo da requisição limitado a 16 KiB e rota de saúde | Limite de taxa, cotas de recursos e teste de carga |
| Elevação de privilégio | Usuário acessa dados de dispositivo sem autorização | API possui controle de acesso por dispositivo; os testes cobrem a resposta 403 | Demonstração ao vivo de usuário autenticado sem permissão |

O projeto ainda não atende todos os requisitos finais de autorização por objeto, limites de requisição, ZAP e ciclo de tratamento de dados LGPD. A API pública usa HTTPS; o fluxo atual também foi configurado para a placa enviar à API.
