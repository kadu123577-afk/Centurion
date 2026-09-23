# Relatório de Testes — Plataforma Centurion

**Data do teste:** 10 de julho de 2026
**Escopo testado:** Painel Super Admin, Painel Admin (Prefeitura de Nova Crixás) e fluxo completo de processo licitatório (Configurar → DFD → ETP → TR)
**Metodologia:** Navegação exploratória e preenchimento de um processo de teste (aquisição de 10 veículos utilitários) usando os recursos de IA (DeepSeek V3) integrados à plataforma.

---

## 1. Qualidades identificadas

### 1.1 Estrutura e organização
- O fluxo em três etapas (**DFD → ETP → TR**) segue de forma clara o rito da Lei nº 14.133/2021, com referências explícitas aos artigos aplicáveis em cada campo (ex.: "Art. 7º, I, B", "Art. 18, X").
- Há **herança de dados** entre as etapas: itens e valores preenchidos no DFD aparecem automaticamente no TR, evitando redigitação.
- Separação clara de papéis: **Super Admin** (gerencia prefeituras) e **Painel Admin** (gerencia usuários e configurações de uma prefeitura específica), com limite de usuários por contrato (ex.: "0/5 usuários").

### 1.2 Geração de conteúdo com IA
- O botão **"Expandir com IA"** (no DFD) transforma um texto curto e informal em uma redação técnica completa e bem estruturada.
- O botão **"Gerar com IA"** no TR gera o documento inteiro em etapas sequenciais e visíveis (**"DeepSeek V3 redigindo TR... 1/7, 2/7... 7/7"**), cobrindo objeto, justificativa, quantitativo, obrigações das partes, reajuste, pagamento e aplicação da LC 123/2006.
- O ETP gerado contém 16 seções tecnicamente coerentes (impactos ambientais, mapa de riscos, análise de custo-benefício, posicionamento conclusivo), citando corretamente normas correlatas (Decreto 11.462/2023, CTB, PROCONVE, Lei 8.666/93 residual etc.).
- O conteúdo gerado manteve **coerência temática** entre DFD, ETP e TR (todos girando em torno da mesma contratação), sem contradições relevantes entre as seções.

### 1.3 Experiência do usuário
- **Preview em tempo real** lado a lado com o formulário, em todas as etapas — facilita conferência imediata do que será exportado.
- Exportação em **DOCX** disponível em todas as etapas.
- Mensagens de status claras em alguns pontos (ex.: "✓ Campo gerado com sucesso!", "✓ Concluído — revise os textos antes de salvar").

---

## 2. Defeitos e inconsistências encontradas

### 2.1 Sobrescrita silenciosa de dados digitados manualmente
Este foi o problema mais relevante encontrado. Ao preencher manualmente:
- **Número do processo**: digitei "TESTE-0001/2026" → o sistema salvou "4036/2026" (depois "0087/2026").
- **Tipo de contratação**: não selecionei nada → apareceu "Serviços Comuns".
- **Setor requisitante**: digitei "Departamento de Compras" → foi salvo "Departamento de Frotas e Transportes".
- **Matrícula do responsável**: digitei "12345" → foi salvo "10245".

**Risco:** um administrador pode preencher um campo, assumir que aquele valor foi salvo, e só perceber a divergência ao revisar o documento final (ou nem perceber). Isso é um problema de **integridade de dados** e de **confiança na interface**, não apenas estético.

**Sugestão de melhoria:** o sistema deveria avisar explicitamente quando reescreve um campo previamente preenchido pelo usuário (ex.: "este número de processo já existe e foi reatribuído automaticamente"), ou impedir a edição manual de campos que são, na prática, gerados automaticamente.

### 2.2 Falta de feedback consistente ao acionar a IA
Na primeira tentativa de gerar o TR, o clique em "Gerar com IA" não produziu nenhuma indicação visível de progresso, e o documento não foi completado — foi necessário clicar novamente para que a barra de progresso "1/7 → 7/7" aparecesse e o processo funcionasse corretamente.

**Risco:** o usuário pode achar que a geração falhou (ou nem perceber que não rodou) e seguir para exportação/assinatura com um documento incompleto.

**Sugestão de melhoria:** garantir feedback imediato e consistente a cada clique (spinner, mensagem de "iniciando geração..."), e um estado de erro explícito caso a chamada falhe, em vez de uma falha silenciosa.

### 2.3 Campos financeiros/administrativos não preenchidos pela IA
Na seção "Despesa Orçamentária e Forma de Pagamento" do TR, campos como **Dotação Orçamentária**, **Prazo de Pagamento**, **Nome do Fundo/Órgão** e **CNPJ do Fundo/Órgão** permaneceram em branco mesmo após a geração completa por IA.

Isso é compreensível (são dados específicos de cada prefeitura que a IA não tem como inventar), mas a ausência de um aviso ou destaque visual ("campos obrigatórios pendentes") pode levar a um TR incompleto ser salvo ou exportado sem que ninguém perceba a lacuna.

### 2.4 Ausência de integração com catálogo de materiais (CATMAT)
Na tabela de itens do TR, a coluna **CATMAT** aparece como "—" (não preenchida). Não há integração ou busca automática de código de catálogo, o que é comum em sistemas de licitação mais maduros e ajudaria na padronização dos itens.

### 2.5 Navegação com comportamento inesperado
Em um dos testes, um clique dentro do formulário de configuração levou diretamente à aba ETP já populada com conteúdo (de um processo diferente do que eu estava preenchendo), sem uma transição clara ou confirmação. Não ficou claro se isso foi um problema de navegação da própria plataforma ou uma limitação da automação usada no teste — mas do ponto de vista do usuário, a ausência de uma indicação clara de "processo ativo atual" no topo da tela (fora do número, que também mudou) dificulta saber com certeza em qual processo/rascunho está trabalhando.

---

## 3. Sugestões de melhoria (resumo priorizado)

| Prioridade | Sugestão | Motivo |
|---|---|---|
| Alta | Impedir ou avisar claramente sobre sobrescrita automática de campos preenchidos manualmente | Risco direto de erro em documento oficial |
| Alta | Feedback visual obrigatório e confiável em toda ação de IA (sucesso, progresso, falha) | Evita geração incompleta passar despercebida |
| Média | Checklist ou indicador de "campos pendentes" antes de permitir salvar/exportar | Reduz risco de TR/DFD/ETP incompletos serem finalizados |
| Média | Indicador fixo e visível do processo/rascunho ativo (número, etapa, última edição) | Melhora rastreabilidade durante o trabalho |
| Baixa | Integração com CATMAT/CATSER para padronizar itens | Alinhamento com boas práticas de licitação |
| Baixa | Histórico de alterações (quem editou o quê e quando) no processo | Auditoria e responsabilização |

---

## 4. Conclusão geral

A plataforma Centurion está **funcionalmente completa e operacional** para o fluxo de DFD → ETP → TR, com um diferencial forte na geração de conteúdo técnico-jurídico coerente via IA, citando corretamente a legislação aplicável. Os problemas encontrados são majoritariamente de **confiabilidade da interface e transparência de dados** (o que foi ou não realmente salvo, quando a IA realmente rodou) — não foram encontradas falhas que impeçam o uso da plataforma, mas o risco de um documento oficial sair incompleto ou com dados trocados sem que o usuário perceba é real e merece atenção prioritária.
