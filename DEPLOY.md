# Publicar o Sobrou

O projeto já está no ar. Este arquivo é o roteiro para republicar e a lista do
que precisa existir fora do código.

| Item                 | Valor                                       |
| -------------------- | ------------------------------------------- |
| Endereço principal   | `https://quantosobrou.vercel.app`           |
| Endereço antigo      | `https://kmlegal.vercel.app` (ainda de pé)  |
| Projeto Vercel       | `sobrou`                                    |
| Conta                | thiagoeugenio's projects                    |
| Região das funções   | `gru1` (São Paulo)                          |
| Node                 | 22.x                                        |
| Diretório raiz       | `apps/web`                                  |
| Banco                | Supabase `kyevibxvjpexmezjueru` (sa-east-1) |

As variáveis de ambiente já estão cadastradas: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_PROJECT_ID`. A proteção de
login da Vercel está **desativada** — ligada, os motoristas do beta precisariam
de conta na Vercel para abrir o app.

---

## Republicar

```bash
npm install
npx vercel --prod
```

O `.vercel/project.json` já aponta para o projeto certo. Renomear o projeto na
Vercel não muda o id, então o vínculo continua valendo.

### Pelo GitHub (melhor para o dia a dia)

Cada `git push` vira um deploy, e você ganha histórico.

```bash
git add -A
git commit -m "Sobrou: renomeação e correção de segurança"
gh repo create sobrou --private --source=. --push
# sem o gh instalado: crie o repo vazio no site e rode
# git remote add origin https://github.com/THIAGOEUGENIOSP/sobrou.git
# git branch -M main && git push -u origin main
```

Depois, em **vercel.com → sobrou → Settings → Git**, conecte o repositório. O
diretório raiz (`apps/web`) já está configurado; não mexa nele.

---

## O que precisa existir fora do código

### 1. URLs de autenticação no Supabase

Sem isso, o link de confirmação de cadastro e o de recuperação de senha levam
para `localhost` e não funcionam para ninguém.

Em **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://quantosobrou.vercel.app`
- **Redirect URLs**: `https://quantosobrou.vercel.app/auth/callback`
  e também `https://kmlegal.vercel.app/auth/callback`, enquanto o endereço
  antigo continuar de pé.

Domínio próprio depois: **adicione**, não troque.

### 2. Virar administrador

Cadastre-se pelo app. Depois, no **SQL Editor** do Supabase:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
 where email = 'seu@email.com';
```

Saia e entre de novo — o papel só entra no token na próxima sessão.

---

## Opcional, mas vale

- **`NEXT_PUBLIC_APP_URL`**: o app funciona sem ela (descobre o endereço pelos
  cabeçalhos da requisição). Cadastrar ajuda quando houver domínio próprio.
- **Point-in-Time Recovery** no Supabase (Database → Backups): o plano gratuito
  faz backup diário com 7 dias de retenção; o PITR deixa voltar a qualquer
  instante. Quando houver dado real de motorista, ligue.
- **`SUPABASE_SERVICE_ROLE_KEY`**: **não** cadastre. Essa chave ignora a RLS e
  hoje nada no código a usa — ela só entra quando o webhook de pagamento
  existir. Chave poderosa parada no ambiente é risco sem contrapartida.

---

## Como saber se deu certo

1. A landing carrega e mostra os dois planos vindos do banco. Seção de planos
   vazia significa que o app não está enxergando o Supabase — confira as
   variáveis de ambiente.
2. `/termos` e `/privacidade` mostram os documentos.
3. Criar conta → confirmar e-mail → cair no onboarding.
4. No celular, o navegador oferece "Adicionar à tela inicial", e o ícone que
   aparece é o velocímetro com **R$**. Se ainda aparecer "KM", é cache: remova
   o ícone antigo e instale de novo.
5. Ligar o modo avião e recarregar: aparece a tela de "Sem conexão".
