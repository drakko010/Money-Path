# Money Path

> **"Tu dinero. Tu plan. Tu patrimonio."**

Plataforma de planejamento financeiro pessoal construída de forma incremental, etapa por etapa.

---

## 1. Visão do produto

Money Path **não é** apenas um aplicativo de controle de gastos. O conceito central é:

> **"No te mostramos solamente dónde está tu dinero. Te mostramos qué hacer con él."**

O produto transforma a situação financeira completa do usuário —

`ingresos + gastos + deudas + ahorro + metas + inversiones + patrimonio`

— em uma rota de ação:

`información + interpretación + recomendación + plan de acción`.

## 2. Posicionamento

- **Categoria:** planificación financiera personal (não "expense tracker").
- **Conceito:** toda funcionalidade existe para converter dados em direção.
- **Tom:** claro, honesto, próximo. O produto orienta; quem decide é o usuário.

## 3. Público e mercado

| Dimensão          | Valor                                      |
| ----------------- | ------------------------------------------ |
| Mercado inicial   | México                                     |
| Idioma inicial    | Espanhol mexicano (`es-MX`)                |
| Moeda padrão      | Peso mexicano (`MXN`, 2 decimais)          |
| Expansão prevista | Outros países da LATAM e suas moedas       |

A arquitetura já nasce preparada para multi-idioma e multi-moeda.

## 4. Stack

| Camada       | Tecnologia                                   |
| ------------ | -------------------------------------------- |
| Framework    | Next.js 16 (App Router, React Server Components) |
| Linguagem    | TypeScript (strict)                          |
| UI           | Tailwind CSS 4 + design tokens próprios (`@theme`) |
| Banco        | PostgreSQL                                   |
| ORM          | Drizzle ORM + drizzle-kit                    |
| Autenticação | Better Auth + `@better-auth/drizzle-adapter` (Etapa 4) |
| Tipografia   | Space Grotesk (display) + Manrope (UI)       |

## 5. Arquitetura

Arquitetura modular orientada a recursos:

```
src/
├── app/
│   ├── page.tsx             # Site público: home da fundação
│   ├── design/page.tsx      # Vitrine do Design System (Etapa 1)
│   ├── not-found.tsx        # 404 global
│   ├── layout.tsx           # Layout raiz, fontes, ToastProvider (lang="es")
│   ├── api/
│   │   ├── auth/[...all]/   # Endpoints Better Auth (Etapa 4)
│   │   ├── auth/dev/reset-link/  # Link de reset em preview sem email (flag)
│   │   ├── onboarding/      # POST: guarda o diagnóstico inicial (Etapa 5)
│   │   └── health/          # Healthcheck com consulta real ao banco
│   ├── (auth)/              # PÁGINAS PÚBLICAS COM LAYOUT CENTRAL
│   │   ├── layout.tsx
│   │   ├── login · register · forgot-password · reset-password
│   │   └── onboarding/page.tsx   # ONBOARDING FINANCEIRO (Etapa 5)
│   └── app/                 # APLICATIVO — segmento /app
│       ├── layout.tsx       # Sidebar + bottom nav + sessão + gate de onboarding
│       ├── loading.tsx · not-found.tsx
│       ├── page.tsx         # Inicio (container do dashboard)
│       └── resumen|presupuesto|deudas|fondo|metas|inversiones|patrimonio|
│           money-path|money-ai|calculadoras|academia|notificaciones|
│           configuracion/page.tsx
├── components/
│   ├── onboarding/wizard.tsx# Wizard de 10 passos + tela de resultado (Etapa 5)
│   ├── auth/forms.tsx       # Login, registro, recuperación, reset
│   ├── app/                 # sidebar, mobile-nav, page-shell, session-gate, breadcrumbs, nav-icons
│   ├── ui/                  # Design System (Etapa 1) — 20+ componentes
│   ├── icons.tsx · wordmark.tsx · foundation-status.tsx
│   ├── module-map.tsx · roadmap.tsx
├── config/                  # navigation, locales (7 moedas), modules, roadmap, onboarding (Etapa 5)
├── db/
│   ├── index.ts · schema.ts · seed.sql
│   └── schema/              # MODELO DE DADOS por domínio
│       ├── currencies · common · identity · auth
│       ├── categories · transactions · debts · goals · investments
│       ├── networth · path (money_path_states, Etapa 5) · budgets
│       ├── notifications · ai · academy · calculations
└── lib/
    ├── i18n/                # Dicionários tipados (es-MX base)
    ├── money/index.ts       # Núcleo monetário (centavos inteiros)
    ├── onboarding.ts        # Persistência do diagnóstico (Etapa 5)
    ├── auth-server.ts · auth-client.ts · auth.ts
    └── settings.ts
```

Princípios:

- **Server Components por padrão**; dados reais consultados no servidor.
- **Configuração dirigida por dados**: textos no i18n, estrutura em `src/config/*`, defaults no banco.
- **Cada módulo terá seu próprio espaço** quando sua etapa chegar.

## 6. Arquitetura do aplicativo (Etapa 2)

14 rotas sob `/app` (fonte: `src/config/navigation.ts`): Inicio, Resumen, Presupuesto, Deudas, Fondo de emergencia, Metas, Inversiones, Patrimonio, Money Path, Money AI, Calculadoras, Academia, Notificaciones, Configuración. Layout: sidebar fixa no desktop; barra superior + bottom navigation com menú "Más" no mobile. Breadcrumbs + `PageShell`/`ModulePage`; loading entre rotas; 404 duplo (app + global).

## 7. Autenticação (Etapa 4)

Implementada com **Better Auth** + adapter Drizzle: cadastro, login, logout, recuperação de senha, sessão persistente (cookie httpOnly + `sessions`, 30 dias), proteção de rotas e perfil automático pós-cadastro (`profiles` + `financial_profiles` + 14 categorias base).

- **Senhas:** hasheadas pelo Better Auth (scrypt) em `accounts`; nunca gerenciadas manualmente.
- **Sessão dual:** cookie `SameSite=None; Secure; Partitioned` + fallback **Bearer** (`localStorage`) para contextos com cookies de terceiros bloqueados (preview em iframe). Guard híbrido `SessionGate`.
- **Secreto resiliente:** env ou `app_settings.auth.secret` (persistido).
- **Origens:** `trustedOrigins` dinâmico (wildcard e2b + origens de preview).
- **Variáveis:** `BETTER_AUTH_SECRET` (opcional com fallback), `NEXT_PUBLIC_AUTH_DEV_RESET`, `RESEND_API_KEY` (opcional).

## 8. Onboarding financeiro (Etapa 5)

Diagnóstico inicial premium em **10 passos** (uma pergunta por vez, sem sobrecarga):

1. **País** (MX, BR, CO, CL, AR, PE, US, outro) → sugere moeda.
2. **Moeda** (pré-selecionada pelo país; catálogo completo de 7 moedas).
3. **Renda mensal** aproximada.
4. **Frequência de recebimento** (mensal, quinzenal, semanal, outra).
5. **Gastos essenciais** aproximados.
6. **Dívidas** (sim/não + total aproximado).
7. **Reserva atual** para emergências.
8. **Investimentos atuais**.
9. **Patrimônio aproximado** (aceita negativo).
10. **Objetivo principal**: sair das dívidas · criar reserva · economizar · comprar algo · viajar · investir · construir patrimônio · outro.

**Resultado:** tela personalizada ("Ya tenemos una primera visión de tu situación financiera.") com resumo formatado por padrão financeiro (`MoneyValue`), balance mensal derivado (positivo/negativo/zero), objetivo escolhido, disclaimer de orientação e **primeiro estado do Money Path™** persistido em `money_path_states` (montos em centavos).

**Comportamentos:**

- Usuário com sessão e sem onboarding é redirecionado de `/app` para `/onboarding` (gate no layout).
- `POST /api/onboarding` valida tudo no servidor (moeda, país, frequência, objetivo, montos via núcleo monetário) e grava por **usuário da sessão** — nunca por id vindo do cliente.
- Repetir o onboarding atualiza `financial_profiles` e adiciona novo estado (histórico auditable).
- Estados de loading (submit), erro (alerta com mensagem) e sucesso; mensagens de validação no dicionário es-MX.
- Nenhuma recomendação financeira complexa nesta etapa — apenas leitura clara do ponto de partida.

**Dados (mudanças de schema):** `financial_profiles` ganhou `country`, `income_frequency`, `has_debts`, `total_debts`, `current_reserve`, `current_investments`, `approximate_net_worth`, `primary_goal`, `onboarding_completed_at`; nova tabela `money_path_states` (`source`, `state jsonb`, índice `(user_id, created_at)`).

## 9. Dashboard — página Inicio (Etapa 6)

Dashboard completo em `/app`, priorizando **1) situação atual → 2) progresso → 3) próximo passo**.

**Indicadores principais** (cards com `MoneyValue` + badge "Estimado/Registrado"):
ingresos del mes · gastos del mes · saldo · ahorro/inversión · deudas · fondo de emergencia (com mini-progresso até a meta) · patrimonio neto.

**Personalização:** o usuário escolhe quais indicadores aparecem (modal com switches). A preferência persiste em `user_settings` (`dashboard.indicators`) via `POST /api/dashboard/preferences` (validação servidor: ids conhecidos, mínimo 1, ordem canônica).

**Gráficos** (SVG puro no servidor, sem dependências):
- Ingresos vs gastos — barras agrupadas dos últimos 6 meses (movimentos reais na moeda base; estado vazio sem movimentos).
- Distribución de gastos — dona por categoria do mês atual (top 5 + "Otros"), com legenda e percentuais.
- Evolución del patrimonio — linha/área dos snapshots; com um único ponto mostra o "punto de partida" do diagnóstico.
- Progreso de metas — barras das metas ativas; sem metas criadas, deriva uma meta inicial do objetivo do onboarding (reserva vs meta, deudas, investimento), marcada como derivada.

**Money Path™ preview ("Tu próximo paso"):** card de destaque com regra simples e transparente derivada dos dados reais: diagnóstico incompleto → "Completa tu información financiera para crear tu ruta."; gastos > ingresos → presupuesto; hay deudas → plan de deudas; reserva < meta → fondo; sin ahorro/inversión → invertir; estável → patrimonio. Sempre com CTA para o módulo e disclaimer de orientação.

**Fontes de dados (regra anti-mock):** primeiro os movimentos/registros reais (tabelas `income`, `expenses`, `debts`, `emergency_funds`, `net_worth_snapshots`, `goals`, filtradas por usuário, moeda base e borrado suave); sem registros, o diagnóstico do onboarding é usado como valor **estimado** e sinalizado como tal. Nunca se somam moedas distintas: cada agregado filtra pela moeda base do usuário.

## 10. Módulo Presupuesto (Etapa 7)

Implementação completa em `/app/presupuesto` — primeiro módulo financeiro ativo.

**Abas:** Ingresos · Gastos fijos · Gastos variables (URL-driven: `?tab=`, preservando o período ativo).

**Ingresos:** data, descrição, valor, categoria, recorrência (semanal/quincenal/mensual/trimestral/anual → cria plantilla em `recurring_transactions` + movimento vinculado) e recebimento futuro (cria `future_receipts` + ingreso pendiente, marcável como recebido).

**Gastos:** data, descrição, valor, categoria, tipo (fijo/variable — nova coluna `expenses.kind`, precarregada da categoria), estado (pagado/pendiente) e observação.

**Categorias personalizadas:** criar (única por usuário, case-insensitive → 409 se duplicada) e arquivar (borrado suave; histórico preservado via `set null` nos movimentos).

**Importação de extratos (CSV, sem integração bancária):** colar ou subir arquivo `fecha,descripcion,monto,tipo,categoria`; monto negativo = gasto; categoria criada automaticamente se não existir; máximo 500 filas. **Anti-duplicados:** qualquer movimiento com a mesma (fecha, monto, descripción) e tipo já existente é omitido (verificado: re-import retorna 0 novos).

**Resumo do período:** Ingresos (recibidos) · Gastos (pagados + pendientes) · Ahorro/Inversión (saldo positivo restante) · Saldo — recalculado a cada operação.

**Filtros:** período (este mes, mes pasado, últimos 3/6 meses, todo), categoría, tipo e estado — todos por query string, com botão "Limpiar filtros".

**Regras garantidas:**
- Indicadores do dashboard e gráficos atualizam automaticamente (lêm as mesmas tabelas reais).
- Movimentos eliminados usam borrado suave (`deleted_at`) — nada é destruído; cancelados ficam fora dos totais.
- Toda operação valida sessão e propriedade no servidor (`user_id` da sessão, nunca do cliente) e a moeda base do usuário (nunca mistura moedas).

**APIs:** `POST /api/presupuesto/transactions` (criar), `.../transactions/update` (markReceived/markPaid/cancel/delete), `.../categories` (create/archive), `.../import` (CSV com dedupe).

## 11. Recurrencia financeira (Etapa 8)

**Suporte:** receitas e despesas recorrentes — frequência mensal, quinzenal e semanal (outras no modelo), data inicial, data final opcional, valor e categoria. Gestão em `/app/presupuesto/recurrencias`; cobros em `/app/presupuesto/cobros` (acessos na página principal do Presupuesto).

**Geração consistente e sem duplicatas:** as plantillas vivem em `recurring_transactions`; as ocorrências são **materializadas de forma idempotente** por `ensureOccurrences()` (chamado nas páginas do módulo): despesas viram `expenses` (passadas = pagadas, futuras = pendentes); ingressos até hoje viram `income` (recibidos) e **futuros viram `future_receipts`** — receitas futuras permanecem separadas das já recebidas. Dedupe por (plantilla + fecha); verificado com cargas repetidas (14/3/3 sem duplicar). Horizonte: até hoje + 3 meses, respeitando data final (plantilla vira "completada" ao passar dela).

**Edição por alcance** (padrão de calendário):
- **Solo esta ocurrencia** — altera somente a ocorrência na data de referência.
- **Esta y las próximas** — atualiza a plantilla e regenera a partir da data de referência (ocorrências futuras geradas são substituídas; confirmação explícita na UI).
- **Toda la serie** — atualiza a plantilla e regenera tudo.

**Operações:** criar, editar, pausar (para a geração; ocorrências existentes ficam), reanudar e eliminar (borrado suave da plantilla; histórico de ocorrências preservado).

**Cobros futuros:** página dedicada separada dos ingressos recebidos — pendentes e recebidos recentemente. "Marcar recibido" concretiza o cobro: se havia ingreso vinculado, o marca como recibido; senão, cria o ingreso na data de hoje. Cancelar não cria ingresso. Cobros manuais e gerados por recurrencias convivem (badge "Recurrente"). `future_receipts` ganhou `recurring_id` (anti-duplicados + vínculo com a plantilla).

**APIs:** `POST /api/presupuesto/recurring` (create/update com scope/pause/resume/delete) e `POST /api/presupuesto/future-receipts` (create/markReceived/cancel) — sempre pelo usuário da sessão (acesso cruzado → 404, verificado).

## 12. Compras parceladas (Etapa 9)

Implementação completa em `/app/presupuesto/parcelas` (acesso na página principal do Presupuesto).

**Cadastro:** descrição, valor total, número de parcelas (2–120), data da primeira parcela, categoria (gasto) e **método de pagamento** (novo campo em `installments.payment_method`: crédito, débito, efectivo, transferencia, outro).

**Sistema (tudo derivado no servidor):** valor por parcela (distribuição exata em centavos: `1,000.01 ÷ 3 = 333.34 + 333.34 + 333.33`), parcelas restantes, valor já pago, próxima parcela (data + número) e data de término (vencimentos mensais com dia fixo, clamp de fim de mês).

**Visualização:** card no formato do produto — `iPhone · $18,000 · 12 × $1,500 · 3/12 pagas` — com barra de progresso, método de pagamento, categoria, término, pago/restante e lista expansível das 12 cuotas com botão "Pagar" por cuota pendente.

**Orçamento (regra central):** cada parcela é materializada como gasto real (`expenses.installment_id` + `installment_number`) na sua data de vencimento — geração idempotente (`ensureInstallmentOccurrences`, chamada nas páginas do módulo). **Cada mês registra somente a sua parcela** (verificado: 12 meses × $1,500; nenhum mês carrega os $18,000); o resumen do Presupuesto e os gráficos do dashboard refletem as parcelas automaticamente, no mês certo. Parcelas geradas entram como gastos **fijos** (compromissos mensais).

**Operações:** criar; pagar cuota (marca paga, sincroniza `paid_installments`, plano vira `completed` ao quitar tudo — verificado); eliminar (borrado suave do plano + cancela somente as cuotas **impagas**; as pagas permanecem como histórico real).

**API:** `POST /api/presupuesto/installments` (`create` / `payCuota` / `delete`) — sessão e propriedade validadas no servidor (401 sem sessão; validações 400 testadas).

## 13. Deudas (Etapa 10)

Implementação completa em `/app/deudas` (abas **Mis deudas** / **Plan de pago**).

**Cadastro:** credor, tipo (tarjeta/préstamo/hipoteca/auto/educativo/otra), valor original, saldo atual, juros anual (%), dia de vencimento, pagamento mínimo, número de parcelas, prioridade (alta/média/baja) e estado. Novas colunas em `debts`: `priority` (1–3, check) e `total_installments`.

**Dashboard do módulo:** Deuda total (Σ original das abertas) · Deuda restante (Σ saldos) · Pagos del mes (Σ abonos do mês + contagem) · Progreso de pago (barra %).

**Abonos:** registrar abono descuenta o saldo real; abono acima do saldo é recusado (400); ao zerar o saldo a dívida vira `paid_off` automaticamente. Abonos ficam em `debt_payments` (histórico preservado).

**Alertas de vencimento:** dívidas cujo próximo vencimento está a ≤7 dias aparecem num alerta no topo (hoje/amanhã/em N dias).

**Plan de pago:** ordena por prioridade e **compara duas estratégias de quitação** — Avalancha (maior juros primeiro) vs Bola de nieve (menor saldo primeiro) — via simulação pura (`simulateStrategy`, capitalização mensal, mínimo + excedente rolado). Mostra meses até quitar, juros estimados, total a pagar e primeira dívida liquidada, com um **excedente mensal ajustável** (pré-carregado do diagnóstico). Recomenda a estratégia que poupa juros. **Nunca executa pagamentos** — é orientação.

**Money Path:** o saldo real de dívidas alimenta o indicador do dashboard e a tarjeta "Tu próximo paso" passa a nomear a dívida prioritária ("Empieza por {name}").

**Segurança:** sessão/propriedade validadas no servidor; simulação é função pura sem efeitos colaterais.

## 14. Fondo de Emergencia (Etapa 11)

Implementação completa em `/app/fondo`.

**Cálculo do gasto essencial mensal:** usa o **ajuste manual** do usuário se definido; senão calcula a **média dos últimos 3 meses** de gastos registrados apenas nas categorias **marcadas como essenciais**. Novas colunas: `expense_categories.is_essential` e `financial_profiles.essential_monthly_override` (null = automático). **Discricionárias ficam fora por padrão** (Suscripciones, Comida fuera, Entretenimiento, Otros gastos nunca são marcadas essenciais — nem no seed do registro nem na migração); o usuário vê exatamente quais categorias contam, com o valor médio mensal de cada uma (breakdown).

**Escolha de objetivo de meses:** presets 3 / 6 / 9 / 12 + custom (1–36), salvos em `financial_profiles.emergencyFundTargetMonths`.

**Indicadores:** Meta total (essencial × meses) · Valor atual · Valor restante · Percentual · **Meses protegidos** (valor atual ÷ essencial mensal). Cálculo verificado exato: `(8,500 + 9,330.40 + 2,090.75) ÷ 3 = 6,640.38` × 6 = **39,842.28**.

**Operações:** configurar (meses + override), alternar categoria essencial, aportar (soma ao valor atual) e fixar valor atual. O fundo atual vive em `emergency_funds` (semeado do `currentReserve` do onboarding) e o objetivo fica sincronizado nessa tabela.

**Progresso:** barra de % + visualização de blocos por mês (preenchidos conforme meses protegidos, com fração).

**Integração:** o indicador de fondo do dashboard usa o mesmo `computeEssentialMonthly`, mantendo consistência; seed do registro e migração marcam as essenciais corretas.

**Segurança:** todas as operações validam sessão e propriedade (toggle de categoria alheia → 404).

## 15. Metas (Etapa 12)

Implementação completa em `/app/metas`.

**Criar meta:** nome, **categoria** (viaje/auto/casa/fondo de emergencia/educación/inversión/compra personal/otro — nova coluna `goals.category`), valor objetivo, valor atual, prazo (data) e prioridade (alta/média/baja — `goals.priority` agora NOT NULL 1–3 com check).

**Cálculo:** quanto falta guardar **por mês**, **por semana** e o **período restante** até o prazo (`computeGoalPlan`, aritmética inteira em centavos com arredondamento para cima). Verificado: restante 23,000 ÷ 12 meses = **$1,916.67/mês**.

**Contribuições:** registrar aporte soma ao `current_amount` automaticamente e grava em `goal_contributions`; ao atingir o objetivo a meta vira `achieved`. Progresso atualiza em tempo real (verificado 5,000 → 7,000).

**Previsão:** "Al ritmo actual, alcanzarás tu meta aproximadamente en X" — ritmo = aportes totais da meta ÷ meses desde o primeiro aporte; sem aportes, pede o primeiro aporte. Data estimada calculada.

**Dashboard:** a seção "Progreso de metas" do Inicio lê as metas ativas reais (mesma tabela), exibindo o progresso automaticamente.

**Resumo do módulo:** metas ativas · objetivo total · ahorrado · logradas.

**Segurança:** todas as operações validam sessão e propriedade (404 para meta alheia; 401 sem sessão); validações 400 (objetivo ≤ 0, atual > objetivo, aporte ≤ 0).

## 16. Inversiones (Etapa 13)

Implementação completa em `/app/inversiones` (abas **Inversiones** / **Cuentas**).

**Contas:** instituição, tipo (casa de bolsa/banco/AFORE/cripto/otra), moeda e saldo (nova coluna `investment_accounts.balance`).

**Investimentos:** nome, categoria (CETES/fondo/ETF/acción/bono/cripto/otro), quantidade, preço médio, valor atual, aportes e data. Novas colunas em `investments`: `quantity` (numeric 18,6) e `average_price` (numeric 18,2). Importe investido = quantidade × preço médio (preenchido automaticamente) ou valor explícito.

**Cálculos:** total invertido · valor atual · ganho/perda · percentual · aportes. Verificado exato: invertido 25,000 · actual 23,050 · pérdida −1,950 · **−7.80%**. Aporte soma ao `invested_amount` e grava em `investment_transactions` (kind `contribution`).

**Evolução:** gráfico de área do patrimônio investido (acumulado mensal de aportes + base, 12 meses), SVG sem dependências.

**Restrições (por desenho):** sem integração de corretoras/bancos e sem recomendações de compra/venda — disclaimer visível no módulo.

**Segurança:** totais consideram apenas a moeda base (não se misturam moedas); sessão/propriedade validadas (401 sem sessão, 404 para registro alheio); delete suave preserva histórico.

## 17. Patrimonio (Etapa 14)

Implementação completa em `/app/patrimonio` (abas **Activos** / **Pasivos**).

**Activos:** dinheiro, inversiones, imóveis, veículos e outros ativos (tabela `assets`, kinds existentes). Para veículos e imóveis, valor **manual** por enquanto; novas colunas `assets.valuation_source` (`manual`/`external`) e `assets.external_reference` deixam a estrutura pronta para futura integração com fontes externas de avaliação.

**Pasivos:** financiamientos, préstamos, cartões e outras dívidas (enum de `liabilities` ajustado para `financing`/`personal_loan`/`credit_card`/`other`).

**Fórmula:** Patrimonio Neto = Total de Ativos − Total de Passivos. Verificado exato: 1,100,000 − 262,000 = **838,000**; patrimônio negativo suportado (−62,000 após remover um ativo).

**Evolução:** histórico mensal em `net_worth_snapshots` (um snapshot por mês, atualizado a cada visita). Mostra patrimônio atual, **variação** contra o mês anterior (+38,000 / +4.8% em teste) e gráfico do histórico. O indicador "Evolución del patrimonio" do dashboard lê os mesmos snapshots.

**Segurança:** totais apenas na moeda base; sessão/propriedade validadas (401/404); delete suave recalcula o patrimônio.

## 18. Calculadoras (Etapa 15)

Implementação completa em `/app/calculadoras` (4 abas). Funções puras em `src/lib/calculators.ts`, calculando em centavos (aritmética inteira, sem ponto flutuante para o dinheiro).

**1. Interés compuesto:** investimento inicial + aporte mensal + taxa anual + período → total aportado, juros ganhos e valor final. (Verificado: 10,000 + 1,000/mês @ 10% por 5 anos = final 93,890.15.)

**2. Meta financiera:** valor objetivo + valor atual + prazo → aporte mensal necessário. (Verificado: 45,000 ÷ 36 meses = 1,250/mês.)

**3. Primer gran objetivo:** simula construção de patrimônio (aporte mensal + rendimento até o objetivo), com tempo estimado e crescimento por ano.

**4. Comprar vs rentar:** simulador comparativo a N anos (preço, enganche, taxa/prazo hipotecário, manutenção, plusvalía vs renda, aumento de renda, rendimento do enganche investido) → custo neto de cada opção, vencedor e diferença.

**UX (cada calculadora):** explica os campos (hints), valida inputs (mensagens por campo), mostra o resultado e tem botão "Simular de nuevo". Disclaimer global: resultados são **proyecciones orientativas, no garantías**.

**Segurança:** módulo sob o aplicativo protegido; não acessa nem expõe dados financeiros do usuário (ferramenta de simulação pura).

## 19. Money Path™ (Etapa 16)

O diferencial central do produto, em `/app/money-path`. Não é uma página de gráficos: é um motor que transforma os dados financeiros reais do usuário em uma rota de ação.

**Entradas (todas de dados existentes):** ingresos, gastos, gastos essenciais, deudas, ahorro, fondo de emergencia, metas, inversiones e patrimonio — coletados no servidor por `lib/moneypath.ts` (média de 3 meses para ingresso/gasto reais, com fallback ao diagnóstico do onboarding marcado como estimado).

**Análise:** `analyzeMoneyPath` (função pura em `lib/moneypath-shared.ts`) detecta prioridades ordenadas por severidade: excesso de gastos, dívida relevante (tasa alta ou dívida grande), falta de reserva, baixa capacidade de ahorro, meta incompatible con orçamento, patrimônio evoluindo (sinal positivo), necessidade de reorganização (≥3 frentes) e "on track" quando não há problemas.

**Resultado — Tu Ruta Financiera (5 seções):** 1) Situación actual (indicadores reais), 2) Prioridad (hallazgo principal + severidade), 3) Acción recomendada, 4) Impacto estimado (com badge "Estimado"), 5) Próximo paso (CTA ao módulo correspondente).

**Exemplo real (verificado):** prioridade "Tienes deuda relevante — Tarjeta BBVA (68.5% anual)"; impacto "Si destinas $X al mes a tus deudas, las liquidarías en ~8 meses"; próximo paso → `/app/deudas`.

**Simulação "¿Qué pasa si reduzco mis gastos en $X?":** slider interativo que recalcula o novo excedente e os meses para alcançar o fundo de emergencia antes/depois (verificado: recorte de $500 → 2 meses antes).

**Persistência:** cada visita grava um estado da rota em `money_path_states` (máx. 1/dia, `source='auto'`) para auditoria.

**Importante:** não inventa dados (tudo vem de tabelas reais); projeções marcadas como estimadas; disclaimers de que não é asesoría financeira profissional.

## 20. Money AI (Etapa 17)

Assistente financeiro contextual em `/app/money-ai`. Não é um chatbot genérico: responde **exclusivamente com os dados reais do próprio usuário** via um motor determinístico de intents (`lib/moneyai/`), garantindo que nunca inventa transações, saldos nem patrimônio.

**Perguntas suportadas (todas verificadas com dados reais):** "¿Puedo comprar esto?" (pide precio si falta), "¿Cuánto gasté en comida?" (suma por categorías coincidentes), "¿Por qué no logro ahorrar?", "¿Cuánto necesito ahorrar para mi meta?", "¿Cuál es mi mayor gasto?", "¿Cómo puedo reducir mis gastos?", "¿Cuándo alcanzaré mi meta?".

**Estructura de respuesta (5 partes):** Resumen → Explicación → Datos utilizados (lista de datos reales con montos) → Impacto → Próximo paso (CTA al módulo). Verificado completo.

**Transparencia:** cuando falta información responde "Necesito más información para responder con precisión." (`needsMoreInfo`), p. ej. "¿Puedo comprar esto?" sin precio, o categoría no identificada (lista las categorías disponibles).

**Seguridad (por desenho):** solo lee datos; no ejecuta compras, transferencias ni inversiones; no se pasa por consultor financiero (disclaimer visible). La API valida sesión (401 sin ella).

**UI:** conversa (burbujas + tarjeta estructurada), histórico de conversaciones persistido (`ai_conversations`/`ai_messages`), sugerencias y preguntas rápidas (chips), y cards de contexto (ingreso, gasto, balance, fondo, deudas, patrimonio).

**Arquitectura:** `context.ts` recolecta el contexto real (server); `engine.ts` detecta la intención y construye la respuesta (función pura, i18n); `/api/money-ai` (GET historial / POST chat).

## 21. Reports & Insights (Etapa 18)

Implementado como o módulo **Resumen** (`/app/resumen`), a casa natural dos relatórios. Tudo server-rendered a partir de dados reais; sem dados, mostra estado vazio (nunca inventa).

**Períodos:** seletor com Este mes · Últimos 3 · Últimos 6 · Últimos 12 meses (query param `?p=`). Cada período compara contra o período anterior de igual duração.

**Relatórios (seções):** evolución de ingresos y gastos (barras agrupadas por mes) · gastos por categoría (barras + variação % vs período anterior) · capacidad de ahorro (ahorro del período, promedio mensual e taxa %) · deudas (total, ativas, pagado en el período) · inversiones (invertido, valor actual, ganancia) · patrimonio (línea de evolução desde snapshots + último valor e cambio).

**Comparación:** tabela "Período anterior vs actual" para ingresos, gastos e ahorro, com delta em %.

**Insights automáticos** (`buildInsights`, função pura): gerados só quando há dados — p. ej. "Tu gasto en {categoría} aumentó {pct}%", "Tu patrimonio aumentó {amount}", "Tu ahorro fue superior/menor al período anterior", "Pagaste {amount} a tus deudas", "Tus inversiones generaron {amount} de ganancia", "Tus ingresos aumentaron/bajaron {pct}%". Verificado: "Comida fuera aumentó 93%" e "ahorro fue menor" com dados reais.

**Arquitectura:** `lib/reports.ts` (`getReportsData` coleta séries/totales/comparaciones; `buildInsights` gera insights); `components/reportes/reports-charts.tsx` (gráficos SVG server-rendered).

## 22. Banco de dados e modelo (Etapas 0/3/4/5)

PostgreSQL via Drizzle ORM. Entrada única: `src/db/schema.ts`. **36 tabelas**: `currencies`; identidade (`users`, `profiles`, `financial_profiles`, `user_settings`); auth (`sessions`, `accounts`, `verifications`); categorias; movimentos (`income`, `expenses`, `recurring_transactions`, `future_receipts`, `installments`); dívidas (`debts`, `debt_payments`); ahorro (`emergency_funds`, `goals`, `goal_contributions`); investimentos; patrimônio (`assets`, `liabilities`, `net_worth_snapshots`); `budgets`; conta (`notifications`, `subscriptions`); Money AI; academia; `calculations`; **`money_path_states`** (Etapa 5); `app_settings`.

Convenções: UUID v4; `created_at`/`updated_at` em tudo; `numeric(18,2)` com cálculo em centavos; multi-moeda explícita (FK `currencies`); borrado suave; constraints/índices por domínio. Na Etapa 7, `expenses` ganhou `kind` (fijo/variable, índice `(user_id, kind)`) e `note`; na Etapa 8, `future_receipts` ganhou `recurring_id` (vínculo com a plantilla + anti-duplicados); na Etapa 9, `installments` ganhou `category_id` (FK a categorias de gasto) e `payment_method`; na Etapa 10, `debts` ganhou `priority` (1–3, check) e `total_installments`; na Etapa 11, `expense_categories` ganhou `is_essential` e `financial_profiles` ganhou `essential_monthly_override` (nullable); na Etapa 12, `goals` ganhou `category` (enum) e `priority` virou NOT NULL 1–3 (check); na Etapa 13, `investment_accounts` ganhou `balance` e `investments` ganhou `quantity` (18,6) e `average_price` (18,2); na Etapa 14, `assets` ganhou `valuation_source` e `external_reference`, e o enum de `liabilities` foi ajustado (financing/personal_loan/credit_card/other).

```bash
npx drizzle-kit push                          # aplica o modelo
psql "$DATABASE_URL" -f src/db/seed.sql       # seed de moedas (idempotente)
```

## 23. Módulos

Capacidades de referência (registro em `src/config/modules.ts`): Ingresos, Gastos fijos, Gastos variables, Categorías, Educación financiera (Academia) — **planificados**, aguardando suas etapas. **Disponíveis: Panel/dashboard (Etapa 6), Presupuesto (Etapa 7), Ingresos recurrentes e Cobros futuros (Etapa 8), Pagos a plazos (Etapa 9), Deudas (Etapa 10), Fondo de emergencia (Etapa 11), Metas (Etapa 12), Inversiones (Etapa 13), Patrimonio (Etapa 14), Calculadoras (Etapa 15).**

**Diferenciais:** Money Path™ (motor de rota de ação, Etapa 16) e Money AI (assistente contextual sobre os dados do usuário, Etapa 17) — ambos implementados. A área **Resumen** foi implementada como Reports & Insights na Etapa 18.

## 24. Design System (Etapa 1)

Paleta própria petrol + cobre sobre superfícies cálidas (tokens `@theme`): `primary #14656d`, `primary-hover #0f5159`, `background #f4f3ee`, `surface #fcfbf8`, `elevated #fefdfa`, `text #16262b`, `muted #54656b`, `success #1c8a56`, `warning #a8690c`, `danger #c03d36`, `info #1f6e96`, `border #e4e1d5`, acento cobre. Componentes: Button, Input, Select, Checkbox, Switch, Slider, Card, Modal, Drawer, Badge, Tooltip, Dropdown, Tabs, Progress, Alert, Toast, Empty/Loading/Error states, `MoneyValue`, `Sparkline`; ícones SVG consistentes. Padrões financeiros: receita `+` verde, despesa `−` vermelha, dívida âmbar, meta petrol, patrimônio tinta, investimento azul-petróleo. Vitrine em `/design`. Mobile first.

## 25. Etapas de desenvolvimento

| Etapa | Conteúdo                                                                                     | Estado    |
| ----- | -------------------------------------------------------------------------------------------- | --------- |
| 0     | Fundação — i18n, núcleo monetário, configuração em banco, verificações                        | ✅ Completa |
| 1     | Identidade visual e Design System                                                             | ✅ Completa |
| 2     | Arquitetura do aplicativo — 14 rotas, sidebar/bottom nav, páginas base, 404                   | ✅ Completa |
| 3     | Banco de dados — modelo completo, multi-moeda, auditoria, borrado suave                       | ✅ Completa |
| 4     | Autenticação — Better Auth, sessão dual, recuperação, perfil automático                       | ✅ Completa |
| 5     | Onboarding financeiro — diagnóstico em 10 passos, introdução personalizada, primeiro estado do Money Path | ✅ Completa |
| 6     | Dashboard — página Inicio completa: 7 indicadores personalizáveis, 4 gráficos, "Tu próximo paso" do Money Path | ✅ Completa |
| 7     | Presupuesto — abas Ingresos/Gastos fijos/Gastos variables, categorías personalizadas, importação CSV com anti-duplicados, resumo e filtros | ✅ Completa |
| 8     | Recurrencia financiera — plantillas de ingressos/despesas, geração idempotente de ocorrências, edição por alcance (una/siguientes/serie), cobros futuros separados | ✅ Completa |
| 9     | Compras parceladas — cadastro completo, distribuição exata em centavos, cuotas por mês (impacto correto no orçamento), pagamento por cuota e controle de avance | ✅ Completa |
| 10    | Deudas — cadastro completo, dashboard do módulo, abonos, alertas de vencimiento, plan de pago por prioridade e comparação de estratégias (avalancha/bola de nieve) | ✅ Completa |
| 11    | Fondo de emergencia — gasto essencial por categorías (sem discricionárias), objetivo de meses, ajuste manual, aportes e visualização de progresso | ✅ Completa |
| 12    | Metas — criação com categoria/prazo/prioridade, cálculo por mês/semana/período, contribuições com progresso automático e previsão ao ritmo atual | ✅ Completa |
| 13    | Inversiones — contas (instituição/tipo/moeda/saldo), investimentos (quantidade/preço médio/valor atual), aportes, ganho/perda e evolução do patrimônio investido | ✅ Completa |
| 14    | Patrimonio — activos (dinero/inversiones/inmuebles/vehículos/otros), pasivos (financiamientos/préstamos/tarjetas/otras), patrimonio neto, variação e histórico mensal | ✅ Completa |
| 15    | Calculadoras — interés compuesto, meta financiera, primer gran objetivo y comprar vs rentar; campos explicados, validados, com resultado e "simular de nuevo" | ✅ Completa |
| 16    | Money Path™ — motor que convierte ingresos/gastos/deudas/ahorro/metas/inversiones/patrimonio en una ruta de acción (situación, prioridad, acción, impacto, próximo paso) + simulación "¿y si reduzco gastos?" | ✅ Completa |
| 17    | Money AI — asistente contextual que responde sobre el propio dinero con datos reales: conversa, histórico, sugerencias, preguntas rápidas y cards de contexto | ✅ Completa |
| **18** | **Reports & Insights** — implementa o módulo Resumen: informes por período (1/3/6/12 meses), comparación entre períodos e insights automáticos | ✅ Completa |
| 19+   | Definidas e aprovadas pelo produto antes de serem construídas                                 | Por definir |

**Etapa atual: 18 — Reports & Insights (concluída).** Nenhuma etapa seguinte foi iniciada.

## 26. Funcionalidades concluídas

**Etapa 0 — Fundação:** i18n tipado `es-MX`; núcleo monetário em centavos; registro locales/moedas; `app_settings`; painel de verificação em vivo; healthcheck real.

**Etapa 1 — Design System:** paleta própria; tokens semânticos; ícones; 20 componentes UI; padrões financeiros; vitrine `/design`; `ToastProvider` global.

**Etapa 2 — Arquitetura:** 14 rotas `/app/*`; sidebar + bottom nav com menú "Más"; páginas base com breadcrumbs/estados; 404 duplo.

**Etapa 3 — Banco de dados:** 36 tabelas por domínio; multi-moeda com FK; constraints/índices verificadas; borrado suave.

**Etapa 4 — Autenticação:** cadastro/login/logout/recuperação; sessão persistente dual (cookie + Bearer); proteção de rotas; perfil automático pós-cadastro; secreto resiliente.

**Etapa 5 — Onboarding financeiro:**

- ✅ Wizard premium de 10 passos (país, moeda, renda, frequência, gastos essenciais, dívidas, reserva, investimentos, patrimônio, objetivo) com progresso, validação por passo e retorno.
- ✅ 8 objetivos financeiros (sair de dívidas, criar reserva, economizar, comprar, viajar, investir, patrimônio, outro).
- ✅ Tela de resultado personalizada: "Ya tenemos una primera visión de tu situación financiera." + resumo com padrões financeiros + mensagem de balance.
- ✅ Primeiro estado do Money Path™ criado e persistido (`money_path_states`, montos em centavos).
- ✅ Persistência real: `POST /api/onboarding` com validação server-side e escrita por usuário da sessão (verificado no banco com valores exatos).
- ✅ Gate: `/app` sem onboarding → redirect a `/onboarding`; após concluir → acesso liberado.
- ✅ Prefill + aviso quando o diagnóstico já foi completado (re-execução atualiza).
- ✅ Estados de loading/erro/sucesso; mensagens es-MX; nenhuma recomendação complexa.

**Etapa 6 — Dashboard:**

- ✅ Página Inicio completa com prioridades claras: situação atual → progresso → próximo passo.
- ✅ 7 indicadores (ingresos, gastos, saldo, ahorro/inversión, deudas, fondo de emergencia com mini-progresso, patrimonio neto) com badge "Estimado/Registrado".
- ✅ Personalização persistente: o usuário escolhe quais indicadores ver; salvo em `user_settings` via API validada (mínimo 1, ids conhecidos, ordem canônica).
- ✅ 4 gráficos SVG sem dependências: ingresos vs gastos (6 meses), distribución de gastos (dona por categoria), evolución del patrimonio (área), progreso de metas (barras).
- ✅ Fontes reais com fallback honesto: movimentos/registros primeiro; sem registros, o diagnóstico aparece sinalizado como "Estimado" — nada de mock.
- ✅ Higiene multi-moeda: cada agregado considera somente a moeda base do usuário.
- ✅ Metas derivadas do objetivo do onboarding enquanto não existem metas criadas (marcadas como derivadas).
- ✅ Card "Tu próximo paso" (Money Path™ preview) com regra transparente sobre os dados reais, CTA ao módulo correspondente, disclaimer e caso "Completa tu información financiera para crear tu ruta." quando falta diagnóstico.
- ✅ Estados vazios em todos os gráficos; validado com movimentos reais e com usuário multi-moeda (ARS).

**Etapa 7 — Presupuesto:**

- ✅ Módulo completo em `/app/presupuesto` com 3 abas (Ingresos, Gastos fijos, Gastos variables).
- ✅ Registro de ingresos com data, descrição, valor, categoria, recorrência (plantilla + movimiento vinculado) e cobro futuro (pendente, marcável como recibido).
- ✅ Registro de gastos com data, descrição, valor, categoria, tipo (coluna `expenses.kind`), estado e observação.
- ✅ Categorias personalizadas: criação única por usuário (409 em duplicada) e arquivamento com borrado suave.
- ✅ Importação de extratos CSV (colar ou arquivo) com anti-duplicados por (fecha, monto, descripción): 3 novos + 1 duplicado no primeiro import; 0 novos no re-import.
- ✅ Resumo do período (Ingresos, Gastos comprometidos, Ahorro/Inversión, Saldo) recalculado a cada operação.
- ✅ Filtros por período, categoría, tipo e estado (URL), com limpeza rápida.
- ✅ Operações: marcar recibido/pagado (com concretização do cobro futuro), cancelar e eliminar (soft delete) — todas com diálogo de confirmação.
- ✅ Regra "indicadores automáticos" verificada: o dashboard refletiu os novos movimentos imediatamente.
- ✅ Segurança: 401 sem sessão; validação de propriedade e moeda base no servidor; montantes validados no núcleo monetário.

**Etapa 8 — Recurrencia financiera:**

- ✅ Plantillas de receitas e despesas recorrentes (mensal, quinzenal, semanal) com data inicial, data final opcional, valor e categoria.
- ✅ Geração idempotente de ocorrências (`ensureOccurrences`): gastos concretos (pagados/pendientes), ingressos passados recebidos e **ingressos futuros como cobros futuros separados** — verificado sem duplicatas em cargas repetidas.
- ✅ Edição por alcance: solo esta ocurrencia / esta y próximas / toda la serie (comportamentos verificados no banco).
- ✅ Pausar, reanudar e eliminar (borrado suave; histórico preservado).
- ✅ Página Cobros futuros separada: pendentes + recebidos; "Marcar recibido" cria/completa o ingreso sem duplicar (verificado com repetição).
- ✅ `future_receipts.recurring_id` (vínculo + anti-duplicados) e páginas `/app/presupuesto/recurrencias` e `/cobros` com acessos na página principal.
- ✅ Segurança: propriedade validada no servidor (acesso cruzado → 404).

**Etapa 9 — Compras parceladas:**

- ✅ Cadastro completo: descrição, valor total, número de parcelas (2–120), primeira parcela, categoria e método de pagamento (crédito/débito/efectivo/transferencia/otro).
- ✅ Cálculos derivados no servidor: valor por parcela com distribuição exata em centavos (resto nas primeiras cuotas), parcelas restantes, valor já pago, próxima parcela e data de término.
- ✅ Visualização no formato do produto: `iPhone · $18,000 · 12 × $1,500 · 3/12 pagas` com progresso, pago/restante e lista expansível de cuotas com "Pagar" por parcela.
- ✅ Orçamento correto: cada cuota é um gasto real na sua data de vencimento — verificado que 12 meses registram $1,500 cada e nenhum mês carrega o total.
- ✅ Plano completa automaticamente ao quitar todas as cuotas (`completed`, verificado); eliminar cancela só cuotas impagas e preserva histórico pago.
- ✅ Geração idempotente (recargas repetidas sem duplicatas) e acesso na página principal do Presupuesto.
- ✅ Segurança: 401 sem sessão; validações 400 (parcelas fora de 2–120, total ≤ 0); propriedade por usuário da sessão.

**Etapa 10 — Deudas:**

- ✅ Cadastro completo: credor, tipo, valor original, saldo atual, juros anual, dia de vencimento, pagamento mínimo, parcelas, prioridade e estado (validações 400 testadas: saldo > original, juros fora de 0–300).
- ✅ Dashboard do módulo: Deuda total, Deuda restante, Pagos del mes e Progreso de pago.
- ✅ Abonos: descuenta o saldo real; recusado acima do saldo; ao zerar vira `paid_off`; histórico em `debt_payments`.
- ✅ Alertas de vencimento: dívidas a ≤7 dias do vencimento em alerta destacado (hoje/amanhã/em N dias).
- ✅ Plan de pago: ordem por prioridade + comparação de estratégias **Avalancha vs Bola de nieve** com meses, juros, total a pagar, primeira dívida liquidada e excedente ajustável; recomenda a que poupa juros. Simulação pura validada por unidade (divergência e não-convergência corretas).
- ✅ Money Path alimentado: indicador de deudas do dashboard usa saldos reais e "Tu próximo paso" nomeia a dívida prioritária.
- ✅ Nunca executa pagamentos (orientação com disclaimer); borrado suave preserva histórico.

**Etapa 11 — Fondo de emergencia:**

- ✅ Cálculo do gasto essencial mensal: ajuste manual OU média dos últimos 3 meses de gastos em categorias essenciais (breakdown por categoria com valor médio).
- ✅ Discricionárias fora por padrão: seed do registro e migração marcam só as essenciais (renta, servicios, internet, transporte, súper, salud, educación); o usuário controla o resto.
- ✅ Objetivo de meses (3/6/9/12 + custom 1–36) e ajuste manual do essencial, persistidos.
- ✅ Indicadores: Meta total, Valor atual, Restante, Percentual e **Meses protegidos** — cálculo verificado exato (essencial 6,640.38 × 6 = 39,842.28).
- ✅ Operações: configurar, alternar categoria essencial, aportar e fixar valor atual; fundo em `emergency_funds` semeado do `currentReserve` e objetivo sincronizado.
- ✅ Progresso claro: barra % + blocos por mês (com fração).
- ✅ Integração com o indicador de fondo do dashboard via `computeEssentialMonthly` compartilhado.
- ✅ Segurança: sessão/propriedade validadas (toggle de categoria alheia → 404).

**Etapa 12 — Metas:**

- ✅ Criar meta com nome, categoria (viaje/auto/casa/fondo/educación/inversión/compra personal/otro), valor objetivo, valor atual, prazo e prioridade.
- ✅ Cálculo por mês, por semana e período restante (`computeGoalPlan`, centavos exatos: 23,000 ÷ 12 = $1,916.67/mês).
- ✅ Contribuições: registro de aportes com atualização automática do progresso e virada para `achieved` ao atingir o objetivo (verificado).
- ✅ Previsão "Al ritmo actual, alcanzarás tu meta aproximadamente en X" (ritmo real de aportes; sem aportes, pede o primeiro).
- ✅ Resumo do módulo (ativas, objetivo total, ahorrado, logradas) e progresso refletido no dashboard (mesma tabela).
- ✅ Segurança: 404 para meta alheia, 401 sem sessão, validações 400 (objetivo ≤ 0, atual > objetivo, aporte ≤ 0); delete suave preserva aportes.

**Etapa 13 — Inversiones:**

- ✅ Contas: instituição, tipo, moeda e saldo (`investment_accounts.balance`).
- ✅ Investimentos: nome, categoria, quantidade, preço médio, valor atual, aportes e data (`investments.quantity`/`average_price`); importe = quantidade × preço médio ou explícito.
- ✅ Cálculos: total invertido, valor atual, ganho/perda, percentual e aportes — verificados exatos (−7.80% de pérdida em exemplo real).
- ✅ Aportes: somam ao `invested_amount` e registram em `investment_transactions`.
- ✅ Evolução: gráfico de área do patrimônio investido (SVG, 12 meses).
- ✅ Restrições respeitadas: sem integração de corretoras/bancos e sem recomendações de compra/venda (disclaimer visível).
- ✅ Segurança: totais só na moeda base; 401 sem sessão; 404 para registro alheio; delete suave preserva histórico.

**Etapa 14 — Patrimonio:**

- ✅ Activos: dinheiro, inversiones, imóveis, veículos e outros ativos; valor manual para veículos/imóveis com estrutura pronta para avaliação externa futura (`valuation_source`/`external_reference`).
- ✅ Pasivos: financiamientos, préstamos, cartões e outras dívidas (enum ajustado).
- ✅ Fórmula: neto = ativos − pasivos, verificado exato (1,100,000 − 262,000 = 838,000) e com patrimônio negativo suportado (−62,000).
- ✅ Evolução: histórico mensal em `net_worth_snapshots` (1 snapshot/mês, atualizado por visita), variação contra o mês anterior (+38,000 / +4.8% em teste) e gráfico; o dashboard lê os mesmos snapshots.
- ✅ Segurança: moeda base nos totais; 401 sem sessão; 404 para registro alheio; delete suave recalcula o patrimônio.

**Etapa 15 — Calculadoras:**

- ✅ Interés compuesto (aporte inicial + mensal + taxa + período → aportado/juros/final), verificado exato.
- ✅ Meta financiera (objetivo + atual + prazo → aporte mensal necessário), verificado (1,250/mês).
- ✅ Primer gran objetivo (simulação de construção de patrimônio com tempo estimado e crescimento por ano).
- ✅ Comprar vs rentar (simulador comparativo a N anos → custo neto, vencedor e diferença).
- ✅ UX: cada calculadora explica os campos, valida inputs, mostra resultado e permite "Simular de novo".
- ✅ Disclaimer global: projeções orientativas, não garantias. Funções puras em centavos (`lib/calculators.ts`).
- ✅ Módulo sob o aplicativo protegido; não acessa dados financeiros do usuário.

**Etapa 16 — Money Path™:**

- ✅ Coleta no servidor das 9 entradas reais (ingresos, gastos, gastos essenciais, deudas, ahorro, fondo, metas, inversiones, patrimonio) com média de 3 meses e fallback ao diagnóstico marcado como estimado.
- ✅ `analyzeMoneyPath` (função pura): detecta e ordena prioridades (excesso de gastos, dívida relevante, falta de reserva, baixa capacidade de ahorro, meta incompatível, patrimônio evoluindo, reorganização, on track).
- ✅ Tu Ruta Financiera em 5 seções: Situación actual · Prioridad · Acción recomendada · Impacto estimado (badge "Estimado") · Próximo paso (CTA).
- ✅ Exemplo real verificado: dívida cara → prioridade + impacto "liquidarías en ~8 meses" + CTA a `/app/deudas`.
- ✅ Simulação "¿Qué pasa si reduzco mis gastos en $X?" (slider recalcula excedente e meses do fundo; verificado 2 meses antes).
- ✅ Persistência de estado da rota em `money_path_states` (1/dia, `source='auto'`).
- ✅ Não inventa dados; projeções marcadas como estimadas; disclaimers de não-assessoría.

**Etapa 17 — Money AI:**

- ✅ Motor determinístico de intents (`lib/moneyai/engine.ts`) que responde só com dados reais do usuário — nunca inventa transações/saldos/patrimônio.
- ✅ As 7 perguntas do spec respondidas corretamente (verificado via API com dados reais): comprar, gasto por categoría, por qué no ahorro, cuánto para mi meta, mayor gasto, reducir gastos, cuándo alcanzaré mi meta.
- ✅ Resposta estruturada em 5 partes: Resumen → Explicación → Datos utilizados → Impacto → Próximo paso (CTA).
- ✅ Transparência: "Necesito más información…" quando falta dato (sem preço, categoria não identificada, sem metas).
- ✅ Segurança: só leitura; não executa compras/transferências/inversiones; não se passa por consultor (disclaimer); API 401 sem sessão.
- ✅ UI: conversa, histórico persistido (`ai_conversations`/`ai_messages`), sugestões/perguntas rápidas e cards de contexto.

**Etapa 18 — Reports & Insights (módulo Resumen):**

- ✅ Seletor de períodos (1/3/6/12 meses) via query param, comparando contra o período anterior de igual duração.
- ✅ Relatórios: evolución de ingresos/gastos (barras por mês), gastos por categoría (com variação %), capacidad de ahorro (período, promedio, taxa %), deudas, inversiones e patrimonio (linha de evolução).
- ✅ Comparación "Período anterior vs actual" (ingresos, gastos, ahorro) com delta em %.
- ✅ Insights automáticos (`buildInsights`, função pura) gerados só com dados reais — verificado "Comida fuera aumentó 93%" e "ahorro fue menor".
- ✅ Tudo server-rendered; sem dados → estado vazio (nunca inventa).
- ✅ Proteção: sem sessão o conteúdo não renderiza (gate híbrido).

## 27. Funcionalidades pendentes

- Implementação dos módulos restantes sobre o modelo de dados (academia, notificaciones, configuración) — aguardando suas etapas.
- Geração de recorrências por job/agenda (hoje a geração é idempotente sob demanda, ao abrir o módulo).
- Integração bancária real — a importação atual é por CSV.
- Verificação de email no registro — quando houver serviço de email configurado.
- Ativação de novos locales/monedas LATAM — estrutura pronta.

## 28. Decisões técnicas

1. **Dinheiro = centavos inteiros na aplicação**; `numeric(18,2)` no banco.
2. **Multi-moeda explícita:** FK `currency` em todo valor.
3. **Segurança no banco, não no frontend:** `user_id NOT NULL` + FK; APIs escrevem sempre pelo usuário da sessão.
4. **Borrado suave** em dados financeiros.
5. **Better Auth** como sistema de autenticação; senhas nunca manuais.
6. **`generateId: "uuid"`** para colunas de identidade.
7. **Origem/CSRF** com wildcard + origem dinâmica de preview.
8. **Perfil automático via `databaseHooks`** no registro.
9. **Email de reset com fallback de preview** (`RESEND_API_KEY` ou flag dev).
10. **Sessão dual cookie + Bearer** e guard híbrido (`SessionGate`).
11. **Secreto com fallback em BD** (`auth.secret`).
12. **Onboarding como upsert + histórico de estados (Etapa 5):** repetir o diagnóstico atualiza o perfil e acrescenta um estado novo em `money_path_states` (auditable).
13. **Gate de onboarding no layout do app (Etapa 5):** garante que todo usuário passe pelo diagnóstico antes dos módulos.
14. **Dashboard sem mock (Etapa 6):** agregados consultam as tabelas reais; sem registros, o diagnóstico do onboarding entra como valor "Estimado" sinalizado — transparência em vez de dados inventados.
15. **Gráficos SVG próprios (Etapa 6):** barras, dona, área e progresso renderizados no servidor sem dependências; bundle leve e estilo consistente.
16. **Personalização persistida (Etapa 6):** indicadores visíveis em `user_settings`; escolha do usuário sobrevive a sessões e dispositivos.
17. **Próximo passo derivado por regras (Etapa 6):** escalera simples e explicável (equilíbrio → deudas → reserva → inversión → patrimonio); sem aconselhamento complexo, sempre com disclaimer.
18. **Código compartilhado server/client sem DB (Etapa 7):** tipos e constantes do Presupuesto vivem em `presupuesto-shared.ts`; o módulo de dados (drizzle) nunca entra no bundle do navegador.
19. **Anti-duplicados por chave natural (Etapa 7):** importação e criação nunca geram movimentos duplicados — dedupe por (fecha, monto, descripción) por usuário e tipo.
20. **Tipo do gasto no próprio movimento (Etapa 7):** `expenses.kind` permite reclassificar sem depender da categoria, e alimenta as abas fijos/variables e o filtro de tipo.
21. **Ocorrências materializadas e idempotentes (Etapa 8):** recurrencias geram linhas reais (dedupe por plantilla + fecha), permitindo edição por ocorrência e integração direta com dashboard/resumo; geração sob demanda nas páginas do módulo (sem job/cron ainda).
22. **Receitas futuras = cobros futuros (Etapa 8):** ingressos recorrentes futuros nunca entram como ingreso até serem recebidos — viram `future_receipts` e só concretizam via "Marcar recibido".
23. **Parcelas = gastos reais por mês (Etapa 9):** cada cuota materializa um gasto na sua data de vencimento (dedupe por plan + número), garantindo que o orçamento registre somente a mensualidade do mês; a distribuição usa aritmética inteira em centavos (resto nas primeiras cuotas) — nunca ponto flutuante.
24. **Simulação de quitação como função pura (Etapa 10):** `simulateStrategy` roda sem efeitos colaterais (nunca executa pagamentos), capitaliza juros mensalmente e rola mínimos de deudas liquidadas — a mesma lógica serve ao cliente e a futuros cálculos server-side.
25. **Essencial ≠ discrecional por desenho (Etapa 11):** o gasto essencial só considera categorias marcadas `is_essential`; nada é assumido automaticamente como essencial e o usuário vê o breakdown exato do que está sendo usado. `computeEssentialMonthly` é compartilhado entre o módulo e o dashboard.
26. **Cálculos de metas puros e compartilhados (Etapa 12):** `computeGoalPlan`/`forecastAtCurrentPace` rodam sem dependências de DB, em centavos com arredondamento para cima; o progresso atualiza no servidor a cada aporte e o dashboard lê a mesma tabela `goals`.
27. **Inversiones sem asesoría nem integraciones (Etapa 13):** o módulo só registra e acompanha; não conecta corretoras/bancos e não recomenda compra/venda. Totais agregam apenas a moeda base e a evolução usa acumulado mensal real de aportes.
28. **Patrimonio con valuación manual y estructura externa (Etapa 14):** vehículos/inmuebles aceitan valor manual hoy; `valuation_source`/`external_reference` dejan la puerta abierta a fuentes externas sin cambiar el modelo. Snapshot mensual idempotente alimenta tanto el módulo como el dashboard.
29. **Calculadoras como funciones puras en centavos (Etapa 15):** la lógica vive en `lib/calculators.ts` sin DB ni efectos colaterales; cada calculadora valida y explica sus campos y aclara que son proyecciones, no garantías.
30. **Money Path™ como motor de análisis puro (Etapa 16):** `analyzeMoneyPath`/`planForFinding`/`simulateExpenseCut` son funciones puras sin DB; el servidor solo recolecta datos reales y persiste el estado de la ruta. Toda recomendación se deriva de datos existentes y las proyecciones se marcan como estimadas.
31. **Money AI determinístico y anclado en datos (Etapa 17):** sin LLM externo (no hay riesgo de alucinación ni dependencia de API); el motor detecta intenciones y responde con cifras reales del usuario. Cuando falta información lo dice explícitamente en vez de inventar.
32. **Insights como función pura derivada de comparaciones (Etapa 18):** `buildInsights` recibe los datos del informe y genera insights solo cuando hay base real (categoría vs período anterior, ahorro, patrimonio, pagos a deudas, ganancia de inversiones, ingresos). Sin datos, no se generan insights falsos.
33. **i18n por dicionários tipados**; `es-MX` base.
34. **Identidade visual própria**; tokens semânticos em `@theme`.
35. **Responsividade total** (mobile first; dashboard em coluna única no celular).
36. **Site público ≠ aplicativo** (`/` e `/design` públicos; produto em `/app/*` protegido).

## 29. Regras de desenvolvimento (obrigatórias)

1. Não remover funcionalidades existentes.
2. Não substituir funcionalidades reais por mock data sem necessidade.
3. Não criar funcionalidades futuras antes da etapa correspondente.
4. Antes de qualquer alteração, verificar o README.
5. Atualizar o README ao concluir cada etapa.
6. Manter arquitetura modular.
7. Preparar internacionalização desde o início.
8. Preparar suporte futuro a múltiplas moedas.
9. Usar cálculos monetários com precisão adequada.
10. Nunca tomar decisões financeiras reais em nome do usuário.
11. Money AI deve apresentar recomendações como orientação, não aconselhamento financeiro profissional.
12. Toda funcionalidade deve funcionar em mobile e desktop.
13. Evitar hardcode sempre que uma configuração ou dado puder ser armazenado.
14. Criar estados de loading, vazio, erro e sucesso.
15. Não avançar automaticamente para a próxima etapa.

---

*Money Path — Tu dinero. Tu plan. Tu patrimonio.*
