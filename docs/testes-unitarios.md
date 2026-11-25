
# Testes Unitários e Cobertura de Código

## 1. Finalidade

A implementação de testes unitários tem como finalidade verificar automaticamente o comportamento das funções e dos módulos do backend do sistema de Monitoramento de Temperatura e Umidade.

Essa abordagem permite identificar falhas antecipadamente, validar regras de negócio e garantir maior confiabilidade durante a evolução do sistema.

## 2. Objetivos

- Garantir o funcionamento correto das funcionalidades existentes.
- Identificar falhas e inconsistências no código.
- Prevenir regressões durante novas implementações.
- Validar mecanismos de autenticação e segurança.
- Facilitar a manutenção e evolução do sistema.
- Alcançar cobertura global mínima de 90% de código.

## 3. Importância para o projeto

Os testes unitários contribuem diretamente para a qualidade, segurança e sustentabilidade do software.

| Benefício | Impacto no projeto |
|---|---|
| Segurança | Validação dos mecanismos de autenticação e proteção de dados. |
| Confiabilidade | Verificação do comportamento esperado das funcionalidades. |
| Prevenção de regressões | Identificação de falhas introduzidas por novas alterações. |
| Manutenibilidade | Maior segurança durante correções e refatorações. |
| Produtividade | Redução do esforço necessário para validações repetitivas. |
| Documentação | Registro executável do comportamento esperado do sistema. |

Os testes unitários complementam os testes de integração, segurança, interface e hardware, mas não os substituem.

## 4. Tecnologias utilizadas

A implementação preserva as tecnologias e os padrões existentes no projeto.

| Tecnologia | Finalidade |
|---|---|
| Node.js 22 | Ambiente de execução. |
| JavaScript | Linguagem de desenvolvimento. |
| node:test | Framework nativo de testes automatizados. |
| node:assert/strict | Validação dos resultados esperados. |
| V8 Coverage | Mensuração da cobertura de código. |
| npm | Gerenciamento de dependências e execução dos testes. |
| Git | Versionamento das implementações. |

A utilização do framework nativo do Node.js reduz a necessidade de dependências adicionais e mantém a compatibilidade com a arquitetura existente.

## 5. Arquitetura dos testes

Os arquivos de testes são mantidos próximos aos módulos correspondentes, seguindo o padrão de organização do projeto.

```text
backend/
├── package.json
└── src/
    ├── auth/
    │   ├── recovery-codes.js
    │   ├── recovery-codes.test.js
    │   ├── totp.js
    │   ├── totp-boundaries.test.js
    │   ├── secret-encryption.js
    │   ├── secret-encryption.test.js
    │   └── secret-encryption-boundaries.test.js
    ├── security.js
    ├── server.js
    └── migrate.js
```

A estrutura apresentada destaca os módulos relevantes para as primeiras entregas.

Os arquivos automatizados utilizam a extensão `.test.js`, permitindo que sejam identificados automaticamente pelo executor de testes.

## 6. Testes implementados

### Lote 01 — Códigos de recuperação (2FA)

Arquivo: `recovery-codes.test.js`

| ID | Cenário |
|---|---|
| UT-RC-001 | Validar formato e limites de geração dos códigos. |
| UT-RC-002 | Rejeitar quantidades inválidas. |
| UT-RC-003 | Validar normalização e geração do hash SHA-256. |
| UT-RC-004 | Rejeitar códigos vazios ou de tamanho inválido. |
| UT-RC-005 | Validar códigos de recuperação e seus hashes. |

### Lote 02 — TOTP e Base32

Arquivo: `totp-boundaries.test.js`

| ID | Cenário |
|---|---|
| UT-TOTP-001 | Validar codificação Base32 e entradas inválidas. |
| UT-TOTP-002 | Validar geração de códigos TOTP conforme vetores de referência. |
| UT-TOTP-003 | Validar a janela temporal de autenticação. |
| UT-TOTP-004 | Validar intervalos temporais vizinhos e negativos. |
| UT-TOTP-005 | Validar parâmetros da URI de provisionamento. |

### Lote 03 — Criptografia de segredos

Arquivo: `secret-encryption-boundaries.test.js`

| ID | Cenário |
|---|---|
| UT-ENC-001 | Rejeitar conteúdos inválidos para criptografia. |
| UT-ENC-002 | Rejeitar conteúdos criptografados que não sejam textos. |
| UT-ENC-003 | Validar formatos e versões de criptografia. |
| UT-ENC-004 | Validar tamanhos do IV e da tag de autenticação. |
| UT-ENC-005 | Validar a configuração da chave de criptografia. |

**Total de novos testes implementados: 15.**

Os testes utilizam dados sintéticos e não dependem de credenciais reais ou do banco de dados de produção.

## 7. Como executar os testes

### 7.1. Pré-requisitos

- Node.js 22 ou superior.
- npm.
- Git.
- Repositório clonado localmente.

### 7.2. Preparação do ambiente

A partir da raiz do projeto:

```powershell
cd backend
npm.cmd ci
```

O comando instala as dependências conforme as versões definidas no arquivo `package-lock.json`.

Caso o terminal já esteja dentro da pasta `backend`, não é necessário executar novamente o comando `cd backend`.

Em ambientes Linux e macOS, utilize `npm` no lugar de `npm.cmd`.

### 7.3. Executar todos os testes

```powershell
npm.cmd test
```

Alternativamente:

```powershell
node --test
```

Esses comandos executam toda a suíte de testes automatizados identificada pelo Node.js, incluindo os testes unitários e os demais testes existentes.

### 7.4. Executar testes específicos

**Códigos de recuperação:**

```powershell
node --test src/auth/recovery-codes.test.js
```

**TOTP e Base32:**

```powershell
node --test src/auth/totp-boundaries.test.js
```

**Criptografia de segredos:**

```powershell
node --test src/auth/secret-encryption-boundaries.test.js
```

Cada arquivo contém cinco novos casos de teste.

### 7.5. Executar testes com cobertura de código

```powershell
node --test --experimental-test-coverage
```

Esse comando executa os testes e apresenta um relatório com os percentuais de cobertura dos arquivos considerados pelo executor.

### 7.6. Executar cobertura de um módulo específico

Exemplo utilizando o módulo TOTP:

```powershell
node --test --experimental-test-coverage --test-coverage-include=src/auth/totp.js src/auth/otp.test.js src/auth/totp-step.test.js src/auth/totp-boundaries.test.js
```

## 8. Interpretação dos resultados

### Resultados da execução

| Indicador | Significado |
|---|---|
| tests | Quantidade de testes registrados. |
| pass | Testes aprovados. |
| fail | Testes reprovados. |
| cancelled | Testes cancelados. |
| skipped | Testes ignorados. |
| duration_ms | Tempo de execução em milissegundos. |

### Métricas de cobertura

| Métrica | Significado |
|---|---|
| Lines | Percentual de linhas de código exercitadas. |
| Branches | Percentual de caminhos condicionais exercitados. |
| Functions | Percentual de funções executadas. |
| Statements | Percentual de instruções executadas. |
| Uncovered lines | Linhas que ainda não foram exercitadas pelos testes. |

O relatório nativo do Node.js apresenta cobertura de linhas, branches e funções. A cobertura de statements deverá ser mensurada posteriormente por uma ferramenta complementar, como o c8.

## 9. Meta de cobertura

A iniciativa estabelece como objetivo atingir cobertura global mínima de 90%.

| Métrica | Meta |
|---|---:|
| Lines | ≥ 90% |
| Branches | ≥ 90% |
| Functions | ≥ 90% |
| Statements | ≥ 90% |
| Testes aprovados | 100% |

### Últimos resultados de cobertura registrados

| Métrica | Lote 01 | Lote 02 |
|---|---:|---:|
| Lines | 45,43% | 45,49% |
| Branches | 68,91% | 73,09% |
| Functions | 81,58% | 81,58% |
| Statements | Não mensurado | Não mensurado |

Após o Lote 02, foram registrados 43 testes aprovados e nenhuma falha.

Os módulos `recovery-codes.js` e `totp.js` atingiram 100% de cobertura nas três métricas avaliadas.

O Lote 03 foi publicado, mas seus resultados consolidados de cobertura ainda precisam ser registrados.

A meta global de 90% permanece em desenvolvimento.

É importante destacar que uma alta cobertura de código não garante, isoladamente, a ausência de defeitos. A qualidade dos cenários, das assertions e dos comportamentos validados também deve ser considerada.

## 10. Padrão de desenvolvimento

Os testes seguem o padrão AAA (Arrange, Act, Assert):

- Arrange: preparação dos dados e condições necessárias.
- Act: execução da funcionalidade testada.
- Assert: verificação do resultado obtido.

Também são adotados os seguintes princípios:

- Independência entre os testes.
- Utilização de dados sintéticos.
- Validação de cenários positivos e negativos.
- Análise de valores de fronteira.
- Validação do tratamento de exceções.
- Prevenção de regressões.
- Preservação das regras de negócio existentes.

## 11. Estratégia de entregas

O desenvolvimento é realizado de forma incremental, com entregas de cinco novos testes por lote.

Cada incremento deve contemplar:

1. Análise do código-fonte.
2. Identificação das lacunas de cobertura.
3. Implementação dos testes.
4. Execução individual dos novos testes.
5. Execução da suíte completa.
6. Análise de cobertura.
7. Revisão do código.
8. Commit e publicação no repositório.

### Branch de desenvolvimento

`test/unit-tests-coverage-90`

Todas as novas implementações desta iniciativa devem ser publicadas na branch dedicada.

Alterações estruturais, modificações nas regras de negócio, mudanças em contratos da API e merges para outras branches dependem de autorização prévia.

## 12. Critérios de aceitação

- [ ] Todos os novos testes aprovados.
- [ ] Nenhuma regressão identificada.
- [ ] Cobertura de código mensurada.
- [ ] Testes independentes e reproduzíveis.
- [ ] Código revisado.
- [ ] Documentação atualizada.
- [ ] Alterações publicadas na branch dedicada.
- [ ] Cobertura global mínima de 90% atingida ao final da iniciativa.

## 13. Próximas etapas

- Ampliar a cobertura do módulo de segurança.
- Desenvolver testes de validação dos dados dos sensores.
- Ampliar a cobertura das funcionalidades do servidor.
- Desenvolver testes para as rotinas de migração.
- Implementar a mensuração de statements.
- Configurar um Quality Gate de cobertura mínima de 90%.
- Integrar as validações ao pipeline de integração contínua, mediante autorização.

## 14. Conclusão

A implementação de testes unitários estabelece uma base para a evolução segura e sustentável do projeto.

A iniciativa busca não apenas aumentar os indicadores de cobertura, mas também garantir que as funcionalidades existentes sejam verificadas continuamente, reduzindo riscos e fortalecendo a qualidade do software entregue.
