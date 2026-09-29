import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { abrirTurnoEIrParaGanho, turnoAbertoAgora } from '@/lib/turnos/actions';
import { carregarContexto } from '@/lib/dados/contexto';
import { dataLocal } from '@/lib/numeros';
import { FormularioGanho } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Adicionar ganho — Sobrou' };

/**
 * Lançar uma corrida não pode depender de lembrar de apertar "Começar a
 * rodar" antes — quem esquece de abrir o turno não pode perder o registro da
 * viagem por isso. Sem turno aberto, esta tela mostra um botão pra abrir um
 * automaticamente (com o último hodômetro conhecido) em vez de mandar a
 * pessoa pra tela de início manual.
 *
 * A checagem aqui é só leitura — a abertura em si (`abrirTurnoEIrParaGanho`)
 * roda como Server Action de verdade, disparada pelo toque no botão, nunca
 * direto no corpo do render: `revalidatePath` não pode ser chamado durante o
 * render de uma Server Component.
 */
export default async function AdicionarGanhoPage({
  searchParams,
}: {
  searchParams: Promise<{ iniciado?: string }>;
}) {
  const { iniciado } = await searchParams;
  const supabase = await createClient();
  const ctx = await carregarContexto();

  const shiftId = await turnoAbertoAgora();

  if (!shiftId) {
    const temHodometro =
      ctx.veiculo && ctx.veiculo.odometro_atual !== null && ctx.veiculo.odometro_atual !== undefined;

    if (!temHodometro) redirect('/app/turno');

    return (
      <>
        <Link href="/app/turno" className="text-sm text-[var(--color-marca)]">
          ← Turno
        </Link>
        <h1 className="mt-4 mb-1 text-xl font-bold">Adicionar ganho</h1>
        <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
          Você ainda não iniciou o turno de hoje. Iniciamos agora com o último hodômetro
          conhecido — confira depois em Turno se está certo.
        </p>
        <form action={abrirTurnoEIrParaGanho}>
          <button
            type="submit"
            className="w-full rounded-[var(--radius-cartao)] py-3 text-center text-base font-semibold text-white"
            style={{ background: 'var(--color-marca)' }}
          >
            Começar a rodar e lançar corrida
          </button>
        </form>
      </>
    );
  }

  const { data: plataformas } = await supabase
    .from('categories')
    .select('id, name, is_favorite, sort_order')
    .eq('kind', 'receita')
    .is('archived_at', null)
    .order('is_favorite', { ascending: false })
    .order('sort_order');

  return (
    <>
      <Link href="/app/turno" className="text-sm text-[var(--color-marca)]">
        ← Turno
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Adicionar ganho</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Uma corrida por toque — o faturamento do dia se soma sozinho.
      </p>

      {iniciado === '1' && (
        <p
          className="mb-6 rounded-[var(--radius-cartao)] p-3 text-sm"
          style={{ background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }}
        >
          Você ainda não tinha iniciado o turno de hoje — iniciei agora, com o último hodômetro
          conhecido. Confira em Turno se está certo.
        </p>
      )}

      <FormularioGanho
        shiftId={shiftId}
        hoje={dataLocal(new Date(), ctx.timezone)}
        plataformas={(plataformas ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          favorita: p.is_favorite,
        }))}
      />
    </>
  );
}
