# Requisitos de resiliência e registro de testes

| ID | Requisito | Implementação atual | Evidência / estado |
|---|---|---|---|
| R1 | Reconexão automática ao Wi-Fi | Eventos registrados e tentativas com espera crescente até 30 s | Recuperação funcional F1 confirmada após queda do modem; tempos não medidos |
| R2 | Armazenar e reenviar leituras | Buffer offline não implementado | Pendente |
| R3 | ID do dispositivo, sequência e horário UTC | Firmware envia os campos em cada leitura válida | Ingestão local anterior confirmada; placa também recebeu HTTP 201 da API pública |
| R4 | Watchdog e recuperação após falta de energia | Comportamento não configurado nem testado explicitamente | Pendente |
| R5 | Não aceitar leitura inválida do sensor como válida | NaN é sinalizado e não substitui o último valor válido | F3 de detecção e recuperação confirmado funcionalmente; latência não medida |
| R6 | Degradação controlada dos componentes | Página local informa o estado do Wi-Fi; degradação de cloud/app não implementada | Parcial |
| R7 | Heartbeat e último contato | API atualiza `last_seen_at` ao receber leituras | Endpoint e banco ativos; conferir atualização do contato na demonstração |
| R8 | Reinício do serviço cloud e restauração do banco | Render com PostgreSQL gerenciado; consulta anterior a `/health` confirmou conexão | Saúde confirmada; backup/restauração ainda não testados |

## Registro dos testes de falha

| Teste | Procedimento | Resultado | Recuperação / perda |
|---|---|---|---|
| Monitoramento normal | Usar o DHT11 com a placa ligada | Leituras válidas aparecem na página local e no Serial Monitor | Operação normal observada |
| F1 — queda de rede | Desligar o modem, verificar a perda, religá-lo e observar a ESP32 | Aprovado funcionalmente em 15/11/2026: a equipe confirmou queda e reconexão; depois, a placa voltou a publicar leituras | Duração da queda e tempo de recuperação não cronometrados |
| F2 — falta de energia | Desconectar e reconectar a alimentação da placa | Não executado | Não medido |
| F3 — falha do sensor | Desconectar apenas o fio DATA do DHT11 e reconectá-lo | Aprovado em 15/11/2026: falha indicada sem exibir o valor anterior como atual; leituras válidas voltaram após reconectar DATA | Intervalo exato de recuperação não medido |
| F4 — indisponibilidade da API | Interromper o serviço por 30 segundos | Não executado | Não medido |
| F5 — mensagem duplicada | Reenviar a mesma sequência do dispositivo | Banco possui restrição contra sequência repetida; ensaio não executado | Não medido |
| F6 — indisponibilidade ThingSpeak | Bloquear o destino ou usar chave inválida | Integração precisa de revisão; respostas recentes foram HTTP 400 | Não executado |

## API, banco e envio da placa

Em 15/11/2026, a API e o PostgreSQL locais foram iniciados via Docker Compose; o health check confirmou o banco, o painel respondeu HTTP 200 e rotas protegidas sem token responderam HTTP 401. Os testes locais de autorização também cobriram HTTP 403.

Em 16/11/2026, a ESP32-C3 conectou-se ao Wi-Fi e informou o IP `192.168.1.8`. O Serial Monitor mostrou duas respostas HTTP 201 do endpoint público do Render após envios do DHT11. Uma consulta anterior ao endpoint `/health` retornou status ok e banco conectado. Conferir no dashboard se a última leitura aparece durante a demonstração.

F1 e F3 passaram funcionalmente conforme evidência comunicada pela equipe. Não foram medidos tempos de indisponibilidade, latência de reconexão, perda de pacotes nem duração de recuperação do sensor. As credenciais de Wi-Fi, API e ThingSpeak não devem aparecer nos documentos ou no repositório.
