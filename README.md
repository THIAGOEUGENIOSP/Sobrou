# KM Legal

Controle financeiro e análise de rentabilidade para motorista de aplicativo.

A pergunta que o app existe para responder: **quanto você realmente ganhou hoje?**
Faturamento não é lucro. O KM Legal desconta o combustível pelo preço que você
pagou de verdade na bomba, separa a reserva do carro e mostra o que sobra.

---

## Como está organizado

```
kmlegal/
├── packages/finance/     # Fórmulas financeiras. TypeScript puro, 124 testes.
└── apps/web/             # Next.js 15 (App Router) + Supabase + PWA
    └── src/
        ├── app/          # Rotas
        ├── components/   # Peças de UI
        └── lib/
            ├── supabase/ # Clientes (navegador, servidor, middleware) e tipos
            ├── auth/      # Schemas Zod e Server Actions de autenticação
            ├── onboarding/
            └── entitlements.ts  # Autorização por plano, no servidor
```

### A regra que sustenta o resto

Nenhuma tela, rota ou relatório calcula indicador por conta própria. **Tudo passa
por `@kmlegal/finance`.** É o que impede o dashboard e o relatório mensal de
mostrarem números diferentes para o mesmo dia.

O pacote não depende de React, Next nem Supabase — por isso dá para testá-lo
sozinho e, mais adiante, reaproveitá-lo num app nativo.

---

## Rodando localmente

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # preencha o que falta
npm run dev
```

| Comando               | O que faz                                  |
| --------------------- | ------------------------------------------ |
| `npm test`            | Testes das fórmulas financeiras            |
| `npm run test:watch`  | Testes em modo observador                  |
| `npm run typecheck`   | Verificação de tipos em todo o workspace   |
| `npm run dev`         | Sobe o app em <http://localhost:3000>      |
| `npm run build`       | Build de produção                          |

Para regenerar os tipos do banco depois de uma migration:

```bash
cd apps/web && npm run db:types
```

---

## Banco de dados

Projeto Supabase em **sa-east-1 (São Paulo)**: `kyevibxvjpexmezjueru`.

### Isolamento entre contas

Duas camadas, de propósito:

1. **RLS em toda tabela de usuário** — `user_id = auth.uid()` no `using` e no
   `with check`. Mesmo que o código tenha um bug, o banco não entrega dado de
   outra conta.
2. **Camada de serviço** — nenhuma rota aceita `user_id` vindo do cliente; o id
   sai sempre da sessão.

O guard do middleware é conveniência, não autorização.

O administrador **não tem policy** nas tabelas financeiras. O painel lê apenas
funções agregadas (`admin_metrics`, `admin_users`), que não devolvem linha de
usuário nem valor financeiro individual.

### Decisões que valem explicar

- **Snapshot no fechamento do turno.** O banco guarda fatos (hodômetro, horário,
  valores) e os indicadores são derivados — com uma exceção: ao fechar o turno,
  custo, distribuição e percentuais usados viram snapshot nas colunas `snap_*`.
  Mudar o consumo ou os percentuais depois não reescreve o passado.
- **Percentuais versionados.** Cada alteração cria uma linha nova em
  `allocation_configs`; o turno aponta para a versão que usou.
- **Livro-razão das reservas.** `reserve_movements` credita quando você reserva e
  debita quando você gasta. Saldo = créditos − débitos. É o que separa
  *dinheiro reservado* de *dinheiro gasto* (R$ 1.500 guardados − R$ 350 de óleo =
  R$ 1.150 de saldo).
- **Personalizar não destrói histórico.** Categoria e campo personalizado se
  **arquivam**, nunca se apagam; os lançamentos antigos continuam exibindo o nome
  que tinham.
- **Custo total por km é indicador, não desconto.** Manutenção e depreciação já
  são pagas pela reserva do veículo. Descontá-las de novo do disponível contaria
  o mesmo custo duas vezes.

---

## Planos e limites

Tudo passa por uma função só: `can('feature')` e `plan_limit('feature')`, que
leem `subscriptions` + `plan_entitlements`.

A interface só pergunta o que pode **mostrar**; quem decide o que pode
**acontecer** é o servidor. Esconder o botão de exportar não é controle de
acesso — qualquer um chama a rota direto.

Nenhum limite fica escrito no código da tela: todos são editáveis pelo admin.

| Recurso                                  | Grátis   | Premium  |
| ---------------------------------------- | -------- | -------- |
| Abastecimentos, turnos, receitas/despesas | ✔        | ✔        |
| Manutenção e reservas                     | ✔        | ✔        |
| Histórico                                 | 60 dias  | completo |
| Veículos                                  | 1        | ilimitado |
| Metas, analisador de corridas, relatórios avançados, exportação, personalização | — | ✔ |

As reservas ficam no grátis de propósito: é o diferencial que prende o usuário.
A monetização está no histórico, nos relatórios e na personalização.

---

## LGPD

- `export_my_data()` devolve tudo em JSON. **Ignora o limite de histórico do
  plano de propósito**: direito de acesso aos próprios dados não é recurso pago.
- `delete_my_account()` apaga a conta; todo o resto cai por `ON DELETE CASCADE`,
  verificado tabela a tabela.
- O aceite aponta para a **versão exata** do documento que o usuário leu, não
  para a versão de hoje.
- O IP do consentimento é guardado como hash, nunca em claro.

---

## Estado atual

**Pronto**

- Etapa 1 — Fundação: schema com RLS, 16 migrations, pacote de fórmulas com 124
  testes, CI.
- Etapa 2 — Autenticação e onboarding: cadastro com aceite, login, recuperação de
  senha, onboarding em três passos, conta e privacidade (exportar/excluir).
- Etapa 3 — Abastecimentos: CRUD, preço real por litro calculado ao vivo enquanto
  o motorista digita, consumo medido entre tanques cheios, formulário
  pré-preenchido com o último posto e combustível.
- Etapa 4 — Turno: iniciar, despesa rápida durante o turno, finalizar com prévia
  do fechamento, snapshot e créditos de reserva. Tela de resumo do dia.
- Etapa 5 (parcial) — Reservas: saldos, extrato, manutenção com débito automático
  e o aviso de reserva subdimensionada.

- Etapa 6 — Relatórios com filtros de período e comparação com o período
  anterior, exportação CSV e Excel, comparador etanol × gasolina pelo consumo
  real, dashboard com cards escolhidos pelo usuário.

- Etapa 7 — Metas com progresso e ritmo necessário, analisador de corridas com
  regras próprias, e painel administrativo com métricas agregadas, lista de
  contas e edição de planos e limites.

- Etapa 8 — PWA instalável com service worker e página de offline, cotas de uso
  no banco, registro de erros com filtro de dados sensíveis, telas de erro e de
  404.

**A seguir**

| Etapa | Entrega                   |
| ----- | ------------------------- |
| 9     | Beta com motoristas reais |

### O service worker não guarda página logada

Ele cacheia CSS, JS e ícones — arquivos com hash no nome, imutáveis. Página
autenticada, nunca: o HTML do app carrega faturamento, reservas e o nome da
pessoa. Num celular compartilhado, cache de página logada é vazamento. Sair da
conta ainda manda o worker apagar tudo que guardou.

Fila de envio offline — registrar abastecimento sem sinal e sincronizar depois —
ficou de fora de propósito. Exige IndexedDB e tratamento de conflito; feita pela
metade, perde lançamento, que é pior do que não ter. A tela de offline orienta o
motorista a anotar e lançar depois, já que o app aceita registro retroativo.

### A cota mora no banco

Contador em memória do processo não funciona na Vercel: cada requisição pode
cair numa instância diferente, e o limite viraria "N por instância". A tabela
`rate_limits` tem RLS ligada e **nenhuma policy** — só a função
`consumir_cota` (SECURITY DEFINER) a toca. Se o usuário pudesse apagar a própria
linha, zeraria o contador.

| Operação            | Cota        | Por quê                       |
| ------------------- | ----------- | ----------------------------- |
| Exportar planilha   | 30 por hora | É a operação mais pesada      |
| Exportar meus dados | 5 por hora  | Lê a base inteira do usuário  |
| Excluir conta       | 3 por hora  | Destrutivo e irreversível     |

Se a checagem de cota falhar por erro de infraestrutura, a chamada **passa**.
Cota é proteção contra abuso, não controle de acesso — esse papel é da RLS e do
`can()`. Travar o motorista por um hiccup do banco troca um problema pequeno por
um grande.

### O log de erros não carrega dinheiro

O painel administrativo exibe os erros. Gravar faturamento no contexto furaria,
pela porta dos fundos, a regra de que o admin não vê dado financeiro. Por isso
`registrarErro` filtra por nome de chave (`valor`, `faturamento`, `saldo`,
`senha`, `email`, `odometro`…) e só aceita tipos simples, já que objeto aninhado
escaparia do filtro.

### Backup

O Supabase faz backup diário automático no plano gratuito, com retenção de 7
dias. Para produção de verdade, ligar o **Point-in-Time Recovery** no painel
(Database → Backups) — ele permite voltar a base a qualquer instante, e não só
ao último backup da noite. As migrations em `supabase_migrations.schema_migrations`
reconstroem o schema do zero; o PITR é o que salva os dados.

### O administrador não vê dinheiro de ninguém

O papel vive em `app_metadata` do JWT, que só o servidor de autenticação
escreve. O painel consome apenas `admin_metrics()` e `admin_users()`, que
devolvem contagens e status — nunca faturamento, despesa ou saldo. E o admin
**não tem policy** nas tabelas financeiras: mesmo que uma tela tentasse, o banco
devolveria zero linhas.

Para promover alguém a administrador, rode no SQL editor do Supabase:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
 where email = 'voce@exemplo.com';
```

O usuário precisa sair e entrar de novo para o JWT carregar o papel novo.

### R$/km só conta o que foi ganho rodando

Receita lançada fora de turno — uma gorjeta recebida em casa, um reembolso —
entra no resultado e no valor disponível, mas **não** no faturamento por km nem
por hora. Somá-la inflaria justamente o indicador que o motorista usa para
decidir se compensa sair para rodar.

### O fechamento do turno é atômico

Fechar um turno grava três coisas: snapshot, faturamento por plataforma e
créditos de reserva. Em três chamadas separadas, uma falha no meio deixaria o
livro-razão mentindo. Por isso existe a função `fechar_turno` no banco, que faz
tudo numa transação — e, ao refechar, **substitui** o fechamento anterior em vez
de duplicar.

---

## Verificação

```
149 testes    ✓   fórmulas financeiras, períodos e invariantes de relatório
  9 cenários  ✓   isolamento entre contas (A não lê, edita nem apaga dado de B)
 14 cenários  ✓   ensaio do turno ponta a ponta, direto no banco
 20 cenários  ✓   ensaio do admin: zero linhas financeiras em toda tabela
 10 cenários  ✓   ensaio das cotas, incluindo tentativa de zerar o contador
 18 migrations ✓  aplicadas em sa-east-1
  build       ✓   33 rotas
```

Dois testes travam a invariante que mais importa num sistema com várias telas:
agregar um único turno devolve exatamente o snapshot daquele turno, e a linha
TOTAL da exportação fecha com a soma das linhas. É isso que impede dashboard,
relatório e planilha de divergirem sobre o mesmo dia.

O ensaio do turno roda o fluxo completo no banco — onboarding, dois tanques
cheios, turno com despesas, fechamento, refechamento e manutenção — e confere
que os números gravados batem, centavo a centavo, com o que o pacote de fórmulas
calcula: R$ 445,15 de faturamento, R$ 225,03 disponíveis, R$ 64,30 e R$ 32,15 de
reserva. Também confere que refechar não duplica, que hodômetro menor que o
inicial é recusado e que um usuário não fecha o turno de outro.

Os exemplos do enunciado estão cobertos por teste: 34,71 L por R$ 135,43 dão
R$ 3,90/L; 42 km a 9,6 km/L custam R$ 17,06 (R$ 0,41/km); R$ 1.500 reservados
menos R$ 350 de óleo dão R$ 1.150; de R$ 4.500 para R$ 5.200 são +15,56%;
R$ 2.850 de uma meta de R$ 4.000 são 71,25%.
