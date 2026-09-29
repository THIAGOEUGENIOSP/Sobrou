import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { abrirTurnoAutomatico } from '@/lib/turnos/actions';
import { carregarContexto } from '@/lib/dados/contexto';
import { dataLocal } from '@/lib/numeros';
import { FormularioGanho } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Adicionar ganho — Sobrou' };

/**
 * Lançar uma corrida não pode depender de lembrar de apertar "Começar a
 * rodar" antes — quem esquece de abrir o turno não pode perder o registro da
 * viagem por isso. Sem turno aberto, esta tela abre um automaticamente (com
 * o último hodômetro conhecido) em vez de mandar a pessoa pra tela de
 * início; só cai de volta nela quando não há hodômetro nenhum pra usar como
 * ponto de partida seguro.
 */
export default async function AdicionarGanhoPage() {
  const supabase = await createClient();
  const ctx = await carregarContexto();

  const turno = await abrirTurnoAutomatico();
  if (!turno) redirect('/app/turno');

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

      {turno.iniciadoAgora && (
        <p
          className="mb-6 rounded-[var(--radius-cartao)] p-3 text-sm"
          style={{ background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }}
        >
          Você ainda não tinha iniciado o turno de hoje — iniciei agora, com o último hodômetro
          conhecido. Confira em Turno se está certo.
        </p>
      )}

      <FormularioGanho
        shiftId={turno.id}
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
