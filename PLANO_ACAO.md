# Plano de ação

## Checklist de ajustes da aplicação (25/11/2026)

| Ordem | Item | Estado | Próxima confirmação |
|---|---|---|---|
| 1 | PWA: manifesto, ícones, service worker e cache da interface | Parcialmente concluído: build de produção e arquivos PWA foram verificados localmente; chamadas da API exigem internet | Confirmar instalação e abertura offline em um celular |
| 2 | Cadastro e autenticador independente por usuário | Implementado localmente e coberto por testes: cadastro username/senha, QR TOTP exclusivo por usuário e códigos de recuperação | Publicar API/frontend; validar cadastro e login de uma segunda conta no ambiente publicado |

## Matriz de responsabilidades

A orientação pede responsáveis e links para commits, mas não determina a distribuição individual. Joelson definiu a divisão abaixo para esta equipe. Os links apontam para o commit que registra as atribuições; tarefas realizadas devem receber seus próprios commits de evidência.

| Integrante | Responsabilidade | Evidência/entrega | Commit de atribuição |
|---|---|---|---|
| Joelson | Firmware ESP32-C3 e API | Firmware, leituras do DHT11, Wi-Fi e ingestão | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Lucas Ximenes | Docker e infraestrutura | Compose, implantação e saúde dos serviços | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Homero | Banco de dados | Modelo PostgreSQL, esquema e consultas | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Nicollas | Testes e qualidade | Casos, resultados e métricas de teste | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Thayanne | Documentação | Relatório e documentação técnica | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| João César | Documentação | Relatório e evidências técnicas | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |
| Morgana | Apresentação | Slides e roteiro de demonstração | [4deede1](https://github.com/JoelsonJose/Monitoramento-de-Temperatura-e-Umidade/commit/4deede1) |

## Estado da prévia técnica (16/11/2026)

| Item | Estado e evidência |
|---|---|
| Sensor | Escopo da prévia: um DHT11 conectado à ESP32-C3; leituras de temperatura e umidade observadas |
| Página local | Leitura e atualização local foram demonstradas pela equipe |
| Wi-Fi (F1) | Perda com modem desligado e reconexão após ligá-lo confirmadas funcionalmente |
| Falha de sensor (F3) | Falha detectada e leituras válidas restabelecidas após reconectar DATA |
| API pública e banco | `/health` confirmou conexão com banco em verificação anterior; placa conectada e Serial Monitor mostrou duas respostas HTTP 201 da API pública |
| Dashboard | Implementado com autenticação e leitura mais recente; interface foi traduzida para português. Confirmar no Render a publicação da tradução e a leitura atual na apresentação |
| Segurança | 401 sem token e 403 sem acesso ao dispositivo cobertos pelos testes locais |
| CI | Cinco testes de rota e unidade; as execuções mais recentes registradas no GitHub Actions passaram |
| ThingSpeak | Duas respostas HTTP 200 anteriores; tentativas mais recentes HTTP 400, integração precisa de rechecagem |
| IA | Baseline persistente da prévia calculado com 100 leituras; modelo final e coleta de 48 h ficam para entrega final |
| Mobile | Figma navegável e aplicativo/PWA não apresentados; pendentes conforme a orientação |
| Pesquisa | Roteiro pronto; faltam entrevistas/respostas reais para persona, jornada e proposta de valor |
| Inglês técnico | README, documentação da API e slides do pitch (até seis) em inglês; abertura oral de dois minutos preparada para Nicollas |
| Documentação | Diagrama elétrico, arquitetura, ER, componentes, plano de testes e matriz de responsabilidades no repositório |

## Próximas ações para a demonstração

1. Alimentar a ESP32-C3 e abrir Serial Monitor a 115200 baud.
2. Mostrar leituras do DHT11, estado do Wi-Fi e IP da placa.
3. Abrir o dashboard em português, autenticar-se e atualizar a página para conferir temperatura, umidade e horário do último contato.
4. Apontar as respostas HTTP 201 registradas no Serial Monitor como confirmação de envio à API pública.
5. Mostrar a matriz, os testes e os links do repositório. Nicollas apresenta a abertura em inglês; Morgana conduz a apresentação conforme a divisão da equipe.

## Pendências da entrega final (30/11/2026)

| Área | Trabalho restante | Responsável(is) | Evidência esperada |
|---|---|---|---|
| IoT e resiliência | Buffer e reenvio ordenado, watchdog, F1–F6 e medidas de perda/recuperação por 24 h | Joelson / Lucas Ximenes / Nicollas | Registros de teste e métricas |
| Cloud e banco | Backup/restauração, logs, reinício de serviço e estimativa de custo | Lucas Ximenes / Homero | Evidência de recuperação e custo mensal |
| Segurança | Autorização por objeto, limites de requisição, ZAP, verificação de dependências e ciclo LGPD | Nicollas / Lucas Ximenes | Relatório e modelo de ameaças atualizado |
| Qualidade | Cobertura ≥60%, análise estática, revisão de PR e relatório ISO/IEC 25010 | Nicollas | CI e relatório de qualidade |
| IA | Coletar ≥48 h, avaliar modelo temporal, superar baseline e criar `/predict`/model card | Morgana | Métricas, endpoint e model card |
| Mobile | Aplicativo, alertas, modo offline e teste SUS com cinco usuários | Morgana / Lucas Ximenes | Aplicativo e relatório SUS |
| Pesquisa | Entrevistar ≥5 pessoas ou coletar ≥20 respostas; validar duas hipóteses (pomar e pós-colheita), jornada e proposta de valor | Morgana | Respostas anônimas e síntese documentada; pesquisa documental preliminar em `docs/ux/pesquisa_previa.md` não substitui coleta primária |
| Documentação e release | Completar documentação, vídeo ≤5 min e tag `v1.0` | Thayanne / João César / Morgana | Repositório, vídeo e release |
