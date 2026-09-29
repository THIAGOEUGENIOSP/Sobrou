import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { turnoAbertoAgora } from '@/lib/turnos/actions';
import { carregarContexto } from '@/lib/dados/contexto';
import { dataLocal } from '@/lib/numeros';
import { FormularioGanho } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Adicionar ganho — Sobrou' };

/**
 * Lançar uma corrida não pode depender de lembrar de apertar "Começar a
 * rodar" antes — quem esquece de abrir o turno não pode perder o registro da
 * viagem por isso. Por isso esta tela mostra o formulário direto mesmo sem
 * turno em andamento: o próprio envio (`adicionarGanho`) abre um turno com o
 * último hodômetro conhecido quando precisa, no mesmo toque em "Salvar" —
 * nenhuma tela extra, nenhum botão a mais antes de lançar.
 *
 * A única checagem feita aqui, no render, é só leitura (`turnoAbertoAgora`):
 * decide se mostra o aviso "turno de hoje ainda não começou" acima do
 * formulário. A abertura em si só acontece dentro da Server Action.
 */
export default async function AdicionarGanhoPage() {
  const supabase = await createClient();
  const ctx = await carregarContexto();

  const shiftId = await turnoAbertoAgora();

  if (!shiftId) {
    const temHodometro =
      ctx.veiculo && ctx.veiculo.odometro_atual !== null && ctx.veiculo.odometro_atual !== undefined;
    // Sem hodômetro cadastrado não tem ponto de partida seguro pra abrir um
    // turno sozinho — aí sim precisa passar pelo fluxo manual uma vez.
    if (!temHodometro) redirect('/app/turno');
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

      {!shiftId && (
        <p
          className="mb-6 rounded-[var(--radius-cartao)] p-3 text-sm"
          style={{ background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }}
        >
          Seu turno de hoje ainda não começou — ao salvar, iniciamos ele com o último hodômetro
          conhecido. Confira depois em Turno se está certo.
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
