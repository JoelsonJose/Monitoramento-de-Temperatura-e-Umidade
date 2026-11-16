# Guia de apoio em português para a apresentação

Este material acompanha o formato solicitado pela equipe: slide de abertura e pitch oral de dois minutos em inglês; slides 2 a 6 em português. Atenção: a orientação também contém a frase “Slides do pitch (em inglês, máximo 6)” na Tabela 11. Essa frase pode ser interpretada como exigência de que todos os slides sejam em inglês; confirme com o professor se o formato misto é aceito.

## Slide 1 — Projeto, problema e público provisório

**Mensagem:** o projeto observa temperatura e umidade em dois contextos ligados à manga: o pomar e a pós-colheita. Os perfis de produtor/encarregado do pomar e responsável pelo ambiente pós-colheita são hipóteses baseadas em pesquisa documental, não personas validadas por entrevistas. O valor proposto é consultar leituras com horário e histórico remotamente. O protótipo tem um DHT11 e mede um ponto por vez; não monitora os dois contextos simultaneamente.

**Abertura:** Nicollas faz o pitch de dois minutos em inglês. A fala deve nomear o problema, os perfis provisórios, a proposta de valor e a arquitetura. Não apresentar as personas como resultado de entrevistas.

## Slide 2 — Leituras físicas

**Mensagem:** o sensor está ligado à ESP32-C3; o Serial Monitor mostra leituras físicas e respostas HTTP 201 da API pública. HTTP 201 indica que a API aceitou e gravou uma nova leitura. Os valores impressos no slide são registros observados naquela sessão; na demonstração, mostrar os valores atuais da placa e do painel.

**Fala de apoio:** “A placa mede a cada cinco segundos. Depois de conectar ao Wi-Fi, enviou leituras à API pública. Aqui aparecem a temperatura e a umidade que recebemos do DHT11.”

## Slide 3 — Firmware

**Mensagem:** DHT11 no GPIO 5, leitura periódica, detecção de leitura inválida, indicação da última leitura válida, página local e reconexão Wi-Fi. A placa também prepara as leituras para envio autenticado por HTTPS.

**Fala de apoio:** “Se o sensor falha, o firmware sinaliza a leitura inválida e não a envia como dado válido. Se o Wi-Fi cai, a placa tenta reconectar e continua realizando as leituras.”

## Slide 4 — Arquitetura

**Mensagem:** DHT11 → ESP32-C3 → API Node.js no Render → PostgreSQL → dashboard web. O navegador consulta a API autenticada para mostrar a leitura mais recente, o histórico e o último contato do dispositivo.

**Fala de apoio:** “A ESP32 envia ID do dispositivo, sequência, horário UTC, temperatura e umidade. O serviço grava os dados no banco; o dashboard busca os registros reais pela API.”

## Slide 5 — Evidências das UCs

**Mensagem:** o slide resume o estado documentado das oito UCs. A prévia tem evidências físicas e de nuvem, plano/testes, baseline simples de IA e documentação. As hipóteses de persona e o app/Figma ainda requerem trabalho. A coleta de usuário continua pendente.

**Fala de apoio:** “Este quadro separa o que já tem evidência do que segue pendente. O baseline foi calculado com uma amostra curta de leituras; ele não é um modelo de IA treinado. As personas ainda não foram validadas em entrevistas.”

## Slide 6 — Demonstração e próximos passos

**Mensagem:** mostre a ESP32 ligada, Serial Monitor, conexão Wi-Fi, ingestão na API e o dashboard com valores atuais. A prévia também pede protótipo navegável no Figma e app/PWA que autentique e liste dados reais; o dashboard web atual não deve ser declarado como esses dois entregáveis.

**Roteiro ao vivo:**

1. Energizar a ESP32-C3 e abrir Serial Monitor a 115200 baud.
2. Mostrar leituras do DHT11, Wi-Fi/IP e uma nova resposta HTTP 201.
3. Abrir o dashboard, autenticar e clicar em “Atualizar agora”; conferir temperatura, umidade, horário e gráfico.
4. Explicar que o painel atualiza automaticamente e que o botão faz nova consulta à API.
5. Identificar claramente o protótipo/app móvel e as entrevistas como pendentes, se ainda não tiverem sido concluídos.

## V0/Vercel e dados reais

Um protótipo feito no V0 pode consumir dados reais, desde que seja conectado à API; não é necessário inventar leituras. O caminho é autenticar com `POST /api/v1/auth/token`, usar o token retornado para consultar `GET /api/v1/readings/latest` e `GET /api/v1/readings?limit=50`, e então preencher os cartões e o gráfico.

O V0/Vercel tem outra origem web que o Render. O backend atual não configura CORS para esse domínio; por isso, o caminho mais simples é criar rotas de servidor/proxy no projeto Vercel que encaminhem as chamadas ao Render. A chave `DEVICE_API_KEY` fica somente no firmware/servidor e nunca no JavaScript do navegador. O usuário/senha de demonstração também devem ser configurados fora do código. Outra opção é manter o dashboard no mesmo serviço/origem da API, como está hoje.

Um protótipo com dados simulados pode demonstrar navegação, mas deve ser identificado como simulação. Ele não comprova a leitura física, o app consumindo dados reais nem as entrevistas exigidas. A orientação menciona Figma para o protótipo; um V0 não deve ser presumido como substituto sem confirmação do professor.
