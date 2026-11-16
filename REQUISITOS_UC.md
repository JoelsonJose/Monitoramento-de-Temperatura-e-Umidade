# Matriz de requisitos e evidências das UCs

Esta matriz separa os requisitos mínimos da prévia de 16/11/2026 dos requisitos da entrega final de 30/11/2026. Um item só é considerado concluído quando existe evidência observável; a existência de código, por si só, não comprova o funcionamento.

## Requisitos da prévia (16/11)

| ID | Unidade curricular | Requisito da prévia | Implementação / evidência atual | Estado |
|---|---|---|---|---|
| IOT-01 | IoT | Leituras físicas com unidade e dados rastreáveis | ESP32-C3 + DHT11 mede temperatura e umidade; placa enviou leituras à API pública e Serial Monitor mostrou HTTP 201 | Aquisição física e envio público observados |
| IOT-02 | IoT | Definir escopo de sensores do protótipo | Equipe selecionou um DHT11 como único sensor desta demonstração | Escopo registrado pela equipe |
| IOT-03 | IoT / Qualidade | Demonstrar perda/recuperação do Wi-Fi e falha de leitura do sensor (F1/F3) | Recuperação de Wi-Fi e detecção/recuperação de falha do DHT11 confirmadas funcionalmente | Confirmado pela equipe; duração não medida |
| IOT-04 | IoT | Canal ThingSpeak, campos e intervalo; conferir resposta HTTP | Houve HTTP 200 e IDs 1 e 2; tentativas mais recentes retornaram HTTP 400 | Integração a revalidar |
| CLD-01 | Computação em Nuvem | API pública HTTPS recebe dados da placa; Dockerfile e ambiente | Render implantado; `/health` informou banco conectado; placa obteve HTTP 201 | API e ingestão pública observadas |
| DB-01 | Nuvem / IoT | Tabelas de dispositivo, leitura e usuário; consulta ao vivo; ER e dados de exemplo | Migração cria devices/users/device_access/readings; diagrama ER e banco gerenciado disponíveis | Banco conectado; conferir leitura atual no painel |
| DASH-01 | Nuvem / IoT | Dashboard consulta API e mostra último contato | Dashboard web com autenticação e campo de último contato; arquivo da interface atualizado para português | Confirmar publicação e leitura atual no Render ao vivo |
| SEG-01 | Segurança | STRIDE, JWT e demonstração de 401/403 | JWT e autorização por dispositivo; testes locais cobrem 401 e 403 | Testes implementados; 403 ao vivo não demonstrado |
| QUA-01 | Qualidade de Software | Plano e testes automatizados das rotas principais no CI | Cinco testes automatizados; execuções recentes do GitHub Actions registradas como aprovadas | Evidência de CI registrada |
| IA-01 | Inteligência Artificial | Definir problema de IA e calcular baseline simples | Baseline de persistência calculado em 100 leituras físicas, com divisão temporal | Mínimo da prévia preparado; modelo final fica para depois |
| MOB-01 | Dispositivos Móveis | Protótipo navegável no Figma e app/PWA com dados reais | Dashboard web existe; não foi apresentada evidência de Figma ou app/PWA | Pendente conforme orientação |
| CCO-01 | Comportamento do Consumidor | Persona, jornada e proposta de valor baseadas em entrevistas/respostas | Roteiro de entrevista preparado; respostas reais não registradas | Pendente; roteiro sozinho não atende |
| ENG-01 | Inglês Técnico | README e documentação da API em inglês; abertura de pitch de 2 min em inglês | README, API, slides (até seis) e roteiro de abertura em inglês no repositório | Materiais escritos preparados; abertura atribuída a Nicollas |
| DOC-01 | Todas | Diagramas de arquitetura/elétrico, componentes, responsáveis e links de commit | Diagramas, lista de componentes e matriz de responsabilidades com commit disponíveis | Arquivos preparados; usar links na demonstração |

## Requisitos finais (30/11)

| ID | Unidade curricular | Trabalho restante para a entrega final | Estado |
|---|---|---|---|
| RES-02 | IoT / Nuvem / Qualidade | Buffer/reenvio, watchdog, estado degradado, heartbeat, backup/restauração e testes F1–F6 | Parcial; F1/F3 funcionais; R2/R4 e testes restantes pendentes |
| CLD-02 | Computação em Nuvem | Pipeline de deploy, logs centralizados, reinício, backup/restauração e custo | Parcial; serviço público ativo; operações de recuperação pendentes |
| SEC-02 | Segurança | TLS de ponta a ponta, autorização por objeto, limite de taxa, ZAP, dependências e ciclo LGPD | Parcial; chave de dispositivo e JWT implementados |
| QUA-02 | Qualidade | Cobertura ≥60%, análise estática, PR revisado, relatório F1–F6 e ISO/IEC 25010 | Pendente |
| IA-02 | Inteligência Artificial | Divisão temporal, modelo melhor que baseline, `/predict`, dashboard/app e model card | Pendente |
| MOB-02 | Dispositivos Móveis | Alertas, modo offline, avaliação heurística e SUS ≥68 com cinco usuários | Pendente |
| CCO-02 | Comportamento do Consumidor | Validar persona/proposta e relacionar indicadores às decisões dos usuários | Pendente |
| DATA-02 | IoT / IA | Pelo menos 48 h de leituras, estatísticas, falhas e limpeza documentada | Pendente |
| DOC-02 | Todas | Documentação final, vídeo de até 5 min, evidências e tag `v1.0` | Pendente |

## Observações

- O escopo acordado pela equipe para esta prévia usa somente um sensor DHT11.
- A orientação traz divergência de duração: uma seção menciona 15 min por equipe e a tabela de horários informa 20 min. Confirmar com o docente.
- A orientação indica envio da prévia até 15/11/2026, 23h59, com demonstração em 16/11/2026. A tag `v0.9-previa` foi publicada no commit `8798c9e`.
- A orientação também solicita verificar os requisitos oficiais das ementas de cada UC. Ementas separadas não foram fornecidas, portanto requisitos adicionais dessas disciplinas não estão incluídos nesta matriz.
