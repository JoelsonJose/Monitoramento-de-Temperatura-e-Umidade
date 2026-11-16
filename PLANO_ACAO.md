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

| Gap | UC / criterion | Concrete action | Owner | Due | Completion evidence | Status |
|---|---|---|---|---|---|---|
| Preview uses the one available physical sensor | IoT | Present the DHT11-only prototype and explain the available hardware during the demonstration | Team representative | 16/11/2026 | DHT11 readings and local page demonstrated | Planned |
| Public API and duplicate/replay behavior remain unverified | Cloud / Quality | Deploy behind HTTPS, then test duplicate sequence handling and replay after an outage | Lucas Ximenes / Homero / Nicollas | Before final | Public TLS endpoint, duplicate response, and recovery evidence | Partial: local authenticated ESP32-to-PostgreSQL ingestion works |
| No public HTTPS deployment | Cloud / Security | Choose provider/domain, configure secrets, TLS and public URLs | Lucas Ximenes / Nicollas | Before final | Public API URL and TLS check | Open |
| ThingSpeak integration is not implemented | IoT / Cloud | Add a ThingSpeak channel and verify a live reading | Joelson / Lucas Ximenes | Before final | One physical event visible in ThingSpeak | Open |
| F1/F3 timing metrics not measured; functional tests passed | IoT / Quality | Preserve functional results; repeat with stopwatch if the instructor requires exact outage or recovery latency; continue F1-F6 test plan for final | Nicollas / Joelson | Per course schedule | Timed test report, if required | Partial |
| Model and evidence dataset absent | AI | Collect at least 48 hours of readings, define a task, compare temporal baseline and model | Morgana | Before final | Notebook, metrics and model card | Open |
| Mobile client and user evaluation absent | UE Mobile | Build PWA/mobile client, test with five users and calculate SUS | Morgana | Before final | Build link and SUS report | Open |
| User research absent | Consumer Behaviour | Conduct at least five interviews or collect 20 responses; derive persona and journey | Morgana | Before final | Anonymized findings and artifacts | Open |
| Security gaps remain | Security | Add object authorization, TLS, rate limiting, ZAP and dependency scan | Nicollas / Lucas Ximenes | Before final | Automated results and updated threat model | Open |
| Documentation and pitch are incomplete | Tech English | Complete English README, API spec and up to six English slides | Thayanne / João César / Morgana | Before review | Repository files and slide link | Open |
| Final evidence/backup/cost absent | Cloud / Quality | Configure deployment, logs, managed backup/restore and cost estimate | Lucas Ximenes / Nicollas | Before final | Deploy/restore/cost evidence | Open |
