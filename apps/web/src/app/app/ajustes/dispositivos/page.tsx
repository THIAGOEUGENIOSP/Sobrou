import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Aparelhos, type AparelhoNaTela } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Aparelhos conectados — Sobrou' };

const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default async function DispositivosPage() {
  const supabase = await createClient();

  const { data: linhas } = await supabase
    .from('device_tokens')
    .select('id, nome, prefixo, created_at, last_used_at')
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  const aparelhos: AparelhoNaTela[] = (linhas ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    prefixo: l.prefixo,
    criadoEm: data.format(new Date(l.created_at)),
    ultimoUso: l.last_used_at ? dataHora.format(new Date(l.last_used_at)) : null,
  }));

  return (
    <>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-bold">Aparelhos conectados</h1>
        <Link href="/app/ajustes" className="shrink-0 text-sm text-[var(--color-marca)]">
          Ajustes
        </Link>
      </div>

      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        O KM Legal, o app que lê a tela da Uber no seu celular, usa um código daqui para conversar
        com o Sobrou. Ele manda as corridas que você avaliou e puxa o seu custo por km calculado
        pelos abastecimentos de verdade — em vez de decidir com o número que você digitou uma vez.
      </p>

      <Aparelhos aparelhos={aparelhos} />

      <section className="mt-10 rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4 text-sm">
        <h2 className="mb-2 font-semibold">O que o código permite</h2>
        <p className="text-[var(--color-tinta-suave)]">
          Só duas coisas: gravar corrida avaliada e ler o seu custo por km e as suas regras. Ele não
          abre faturamento, não mexe em reserva, não apaga nada e não entra na sua conta pelo
          navegador. Celular é aparelho que se perde — se isso acontecer, revogue aqui e o código
          para de valer na hora, sem afetar os outros aparelhos nem exigir troca de senha.
        </p>
      </section>
    </>
  );
}
