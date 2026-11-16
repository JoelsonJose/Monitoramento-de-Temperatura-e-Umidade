# Action plan

## Matriz de responsabilidades

O documento de orientação pede responsáveis e links para commits, mas não define a distribuição entre as pessoas. A divisão abaixo foi definida por Joelson para a equipe. Os links apontam para o commit que registra estas atribuições; tarefas concluídas devem receber seus próprios commits de evidência. Os commits anteriores continuam atribuídos aos autores que realmente os fizeram.

| Integrante | Responsabilidade | Evidência/entrega | Commit que registra a atribuição |
|---|---|---|---|
| Joelson | Firmware ESP32-C3 e API | Firmware, leituras do DHT11, Wi-Fi, ingestão na API | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Lucas Ximenes | Docker e infraestrutura | Compose, implantação local, saúde dos serviços e infraestrutura | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Homero | Banco de dados | Modelo PostgreSQL, esquema, persistência e consultas | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Nicollas | Testes e qualidade | Casos de teste, resultados, métricas e evidências | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Thayanne | Documentação | README, relatório e documentação técnica | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| João César | Documentação | Relatório, documentação técnica e links para evidências | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Morgana | Apresentação | Slides e roteiro da demonstração | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |

As responsabilidades foram distribuídas para esta prévia. Tarefas ainda não concluídas permanecem abertas no plano abaixo.

## Plano de ação

Nenhum item abaixo é marcado como concluído sem artefato demonstrável.

### Lacunas obrigatórias da prévia (16/11)

| Lacuna para a prévia | Responsável | O que falta / evidência a obter | Estado |
|---|---|---|---|
| Segundo sensor físico | Joelson / equipe | A orientação pede pelo menos dois sensores. O protótipo disponível tem um DHT11; explicar a limitação e obter aceite explícito do professor | Exceção não confirmada |
| API pública HTTPS e ingestão da placa | Lucas Ximenes / Homero / Joelson | Publicar API em nuvem com TLS e verificar leitura física real chegando por URL pública | Só rede local HTTP comprovada |
| ThingSpeak | Joelson / Lucas Ximenes | Criar canal com Field 1 = temperatura e Field 2 = umidade; colocar Write API Key somente no `.env` local; observar resposta HTTPS 200 e entry ID nos logs da API | Confirmado: duas respostas HTTP 200; entry IDs 1 e 2; intervalo observado de 20 s |
| App mobile e protótipo navegável | Morgana / Lucas Ximenes | Prototipar no Figma e demonstrar app/PWA com login e lista de leituras reais. Dashboard web local não substitui este item | Não implementado |
| Pesquisa, persona, jornada e proposta de valor | Morgana | Aplicar o roteiro `docs/ux/pesquisa_previa.md` a pelo menos 5 usuários reais e derivar os artefatos | Roteiro pronto; respostas reais pendentes |
| Problema de IA e baseline | Morgana | Definir tarefa e calcular baseline simples | Feito para prévia: forecast da próxima leitura com baseline persistente; ver `docs/ia/baseline_previa.md` |
| Segurança 401/403 | Nicollas / Lucas Ximenes | Manter evidência de 401 e implementar/testar 403 por autorização de objeto | JWT/401 presentes; 403 ausente |
| Testes de rotas no CI | Nicollas / Joelson | Adicionar testes automatizados HTTP das rotas principais; os três testes atuais são unitários de token/payload | CI roda testes unitários; testes de rota ausentes |
| Modelo ER e dados de exemplo | Homero | Criar tabelas de dispositivo, leitura e usuário, diagrama ER e seed com dados identificados | Apenas tabela readings |
| Diagrama de arquitetura completo e último contato | Lucas Ximenes / Homero | Mostrar caminho pretendido em nuvem, apps, protocolos/portas e distinguir o que já funciona; adicionar heartbeat/último contato | Parcial/local; sem heartbeat |
| Tag da prévia | Lucas Ximenes | Criar a tag `v0.9-previa` no commit a ser entregue | Não criada |
| Medição de F1 | Nicollas / Joelson | Cronometrar a recuperação da rede para conferir o limite de 30 s da tabela de F1 | Queda/recuperação funcionais; tempo não medido |

### Pendências da entrega final (30/11)

| Gap | UC / criterion | Concrete action | Owner | Due | Completion evidence | Status |
|---|---|---|---|---|---|---|
| Buffer, watchdog and full resilience test set | IoT / Cloud / Quality | Add ordered offline buffer, watchdog/power recovery, degraded status; run F1–F6 and record loss/recovery | Joelson / Lucas Ximenes / Nicollas | 30/11/2026 | R1–R8 evidence; loss ≤1% over 24 h; device availability and recovery times | Open |
| Cloud operations and database recovery | Cloud / Database | Configure deploy pipeline, centralized logs, restart, managed backup/restore and cost estimate | Lucas Ximenes / Homero | 30/11/2026 | Public deployment, restore proof and monthly cost | Open |
| Advanced security controls | Security | Add object authorization, TLS across the path, rate limits, ZAP, dependency checks and LGPD lifecycle | Nicollas / Lucas Ximenes | 30/11/2026 | Automated security evidence and updated threat model | Open |
| Quality metrics | Quality | Add route tests, ≥60% backend coverage, static analysis, reviewed PRs and ISO/IEC 25010 report | Nicollas | 30/11/2026 | CI coverage and quality report | Open |
| AI model | AI | Collect ≥48 h, clean data, use temporal split, outperform baseline, deploy `/predict` and write model card | Morgana | 30/11/2026 | Notebook, metrics, endpoint and model card | Open |
| Mobile completion and user evaluation | UE Mobile | Add alerts/offline state, heuristic review and test with five users; calculate SUS ≥68 | Morgana / Lucas Ximenes | 30/11/2026 | Mobile build and SUS report | Open |
| Final research validation | Consumer Behaviour | Validate persona/value proposition and relate dashboard indicators to user decisions | Morgana | 30/11/2026 | Anonymized findings and validation evidence | Open |
| Final documentation and release | All | Complete English manual, final architecture/evidence, ≤5 min video and tag `v1.0` | Thayanne / João César / Morgana | 30/11/2026 | Reproducible README, video and release tag | Open |
