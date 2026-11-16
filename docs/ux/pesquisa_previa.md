# Pesquisa exploratória e hipóteses de personas — manga

## O que esta pesquisa cobre

Este documento registra uma pesquisa documental inicial e duas hipóteses de perfil para os cenários escolhidos pela equipe: pomar de manga e ambiente de pós-colheita. **Não é uma pesquisa primária com usuários.** Nenhuma entrevista ou resposta foi inventada; persona, jornada e proposta de valor ainda precisam ser validadas com pelo menos cinco entrevistas ou vinte respostas reais, conforme a orientação do PI.

## Evidências documentais

- A Embrapa descreve que temperatura, umidade relativa, chuva e duração do molhamento foliar são fatores ambientais relevantes para acompanhar doenças da mangueira, especialmente em fases críticas do pomar. O DHT11 mede temperatura e umidade do ar; sozinho, não mede chuva, molhamento foliar nem diagnostica doenças. [Embrapa Ater+ — Doenças da mangueira](https://www.atermaisdigital.cnptia.embrapa.br/web/manga/doencas)
- Na pós-colheita, a Embrapa descreve etapas de pré-resfriamento e armazenamento sob condições controladas de temperatura e umidade relativa. Um capítulo técnico recente lista, para manga, faixas de armazenamento que variam conforme cultivar e maturação; isso contextualiza o monitoramento, mas não deve ser usado como limiar universal para este protótipo. [Embrapa Ater+ — Pós-colheita](https://www.atermaisdigital.cnptia.embrapa.br/web/manga/pos-colheita) e [Embrapa — Colheita e pós-colheita de frutas (2026)](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1185180/1/Livro-DesidratacaoFrutas-Eliseth-Ronielli-fev2026-AINFO-1.pdf)

Essas fontes sustentam que as duas situações têm necessidade técnica de observar condições ambientais. Elas **não** comprovam frequência de uso de um painel, preferência por alertas ou disposição para usar este produto; essas questões dependem das entrevistas.

## Hipóteses de personas para validação

### Persona A — responsável pelo pomar

- **Perfil provisório:** produtor(a), encarregado(a) ou técnico(a) que acompanha uma área de mangueiras.
- **Objetivo a investigar:** observar condições locais de temperatura e umidade e relacioná-las ao manejo e às fases do pomar.
- **Hipótese de dificuldade:** as medições podem não estar continuamente disponíveis no ponto acompanhado; é preciso descobrir como a pessoa observa e registra essas condições hoje.
- **Possível utilidade do projeto:** leitura remota com horário, histórico e indicação clara de quando a última medição chegou.
- **Limite do protótipo:** um DHT11 em um ponto não representa todo o pomar, não mede molhamento foliar/chuva e não recomenda tratamento fitossanitário.

### Persona B — responsável pela pós-colheita

- **Perfil provisório:** operador(a), encarregado(a) ou técnico(a) que acompanha a área onde a manga aguarda seleção, resfriamento, armazenamento ou transporte.
- **Objetivo a investigar:** acompanhar temperatura e umidade do ambiente e perceber quando uma leitura deixou de atualizar.
- **Hipótese de dificuldade:** variações ambientais podem passar despercebidas entre verificações manuais; verificar se isso acontece no processo real.
- **Possível utilidade do projeto:** leitura atual e histórico simples, com último contato do dispositivo, acessíveis no navegador.
- **Limite do protótipo:** a ESP32/DHT11 apenas mede e transmite; não controla refrigeração. Uma demonstração escolar sem calibração não substitui instrumento nem procedimento técnico de uma câmara comercial.

### Proposta de valor provisória

“Acompanhar remotamente temperatura e umidade em um ponto do pomar ou do ambiente de pós-colheita, com horário e histórico das leituras, para ajudar a pessoa responsável a perceber mudanças e decidir se precisa verificar o local.” Esta frase é uma hipótese para validar; não afirmar redução de perdas, diagnóstico ou melhoria operacional sem evidência dos usuários.

## Plano de coleta primária

Conversar com pelo menos cinco pessoas reais ou obter pelo menos vinte respostas. Incluir pessoas ligadas aos dois cenários quando possível; registrar quantas representam cada contexto. Pedir consentimento antes de anotar e guardar respostas anônimas, sem nome ou contato pessoal.

1. Você acompanha uma mangueira no pomar, manga colhida/armazenada, ou ambos? Qual é sua função?
2. Que temperatura ou condição de umidade você acompanha hoje, em que local e em quais momentos?
3. Como mede e registra essas condições? O que faz quando não consegue obter uma leitura?
4. Conte uma situação real em que perceber uma mudança ambiental cedo teria ajudado. O que você fez e qual informação faltou?
5. Se as leituras aparecessem num celular/computador, que decisão concreta isso apoiaria? Com que frequência consultaria o painel?
6. Que aviso faria sentido se a medição parasse de atualizar? Quem deveria recebê-lo?
7. O que faria você desconfiar da leitura ou deixar de usar um sistema desse tipo?

Não sugerir que ocorreu perda ou problema. Perguntar por exemplos concretos e registrar também quando a pessoa não vê utilidade no sistema.

| Código | Cenário / função (anônimo) | Prática atual | Problema ou necessidade relatada | Decisão apoiada | Consentimento para citação anônima |
|---|---|---|---|---|---|
| R1 | A coletar | A coletar | A coletar | A coletar | A coletar |
| R2 | A coletar | A coletar | A coletar | A coletar | A coletar |
| R3 | A coletar | A coletar | A coletar | A coletar | A coletar |
| R4 | A coletar | A coletar | A coletar | A coletar | A coletar |
| R5 | A coletar | A coletar | A coletar | A coletar | A coletar |

## Síntese a preencher após as conversas

Contar os temas sem generalizar além da amostra; escolher o perfil mais bem sustentado, registrar jornada atual e propor uma versão revisada da proposta de valor. Manter divergências entre pomar e pós-colheita visíveis. Até a coleta, as duas personas permanecem **hipóteses documentais** e o requisito de pesquisa com usuários continua pendente.
