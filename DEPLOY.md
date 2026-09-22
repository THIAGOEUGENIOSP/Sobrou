# Colocar o KM Legal no ar

O projeto na Vercel **já existe e já está configurado**. Falta só o código chegar
lá — e isso precisa sair da sua máquina, porque o ambiente onde ele foi
construído não alcança nem a Vercel nem o seu GitHub.

| Item                        | Valor                                |
| --------------------------- | ------------------------------------ |
| Projeto Vercel              | `kmlegal`                            |
| Conta                       | thiagoeugenio's projects             |
| Região das funções          | `gru1` (São Paulo)                   |
| Node                        | 22.x                                 |
| Diretório raiz              | `apps/web`                           |
| Banco                       | Supabase `kyevibxvjpexmezjueru` (sa-east-1) |

As variáveis de ambiente já estão cadastradas na Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_PROJECT_ID`. A proteção de login
da Vercel foi **desativada** — se ela ficasse ligada, os motoristas do beta
precisariam de conta na Vercel para abrir o app.

---

## Caminho 1 — subir direto da sua máquina (mais rápido)

O `.vercel/project.json` já vem preenchido, então não há etapa de vincular nada.

```bash
cd kmlegal
npm install
npx vercel --prod
```

Na primeira execução o `npx vercel` pede login. Depois disso ele sobe os
arquivos e devolve a URL.

## Caminho 2 — GitHub (recomendado para o dia a dia)

Vale mais a pena: cada `git push` vira um deploy, e você ganha histórico.

```bash
cd kmlegal
git add -A
git commit -m "KM Legal: etapas 1 a 8"
gh repo create kmlegal --private --source=. --push
# sem o gh instalado: crie o repo vazio no site e rode
# git remote add origin https://github.com/THIAGOEUGENIOSP/kmlegal.git
# git branch -M main && git push -u origin main
```

Depois, em **vercel.com → kmlegal → Settings → Git**, conecte o repositório.
O diretório raiz (`apps/web`) já está configurado; não mexa nele.

---

## Depois do primeiro deploy: 2 ajustes obrigatórios

### 1. URLs de autenticação no Supabase

Sem isso, o link de confirmação de cadastro e o de recuperação de senha levam
para `localhost` e não funcionam para ninguém.

Em **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://SEU-DOMINIO.vercel.app`
- **Redirect URLs**: adicione `https://SEU-DOMINIO.vercel.app/auth/callback`

Se usar domínio próprio depois, adicione ele também em vez de trocar.

### 2. Criar sua conta e virar admin

Cadastre-se normalmente pelo app. Depois, no **SQL Editor** do Supabase:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
 where email = 'seu@email.com';
```

Saia e entre de novo — o papel só entra no token na próxima sessão. Aí aparece
o link **Admin** no topo do app.

---

## Opcional, mas vale

- **`NEXT_PUBLIC_APP_URL`**: o app funciona sem ela (descobre o endereço pelos
  cabeçalhos da requisição). Cadastrar ajuda se você usar domínio próprio.
- **Point-in-Time Recovery** no Supabase (Database → Backups): o plano gratuito
  faz backup diário com 7 dias de retenção; o PITR deixa voltar a qualquer
  instante. Quando houver dado real de motorista, ligue.
- **`SUPABASE_SERVICE_ROLE_KEY`**: **não** cadastre agora. Essa chave ignora a
  RLS e hoje nada no código a usa — ela só entra quando o webhook de pagamento
  existir. Chave poderosa parada no ambiente é risco sem contrapartida.

---

## Como saber se deu certo

1. Abrir a URL: a landing carrega e mostra os dois planos vindos do banco.
   Se a seção de planos aparecer vazia, o app não está enxergando o Supabase —
   confira as variáveis de ambiente.
2. `/termos` e `/privacidade` mostram os documentos.
3. Criar conta → confirmar e-mail → cair no onboarding.
4. No celular, o navegador deve oferecer "Adicionar à tela inicial".
5. Ligar o modo avião e recarregar: aparece a tela de "Sem conexão".
