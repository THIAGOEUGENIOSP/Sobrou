import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatConsumo,
  formatHoras,
  formatKm,
  formatLitros,
  formatMoney,
  formatRate,
  safeDiv,
} from '@sobrou/finance';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Resumo do turno — Sobrou' };

/** Tela de resumo do dia (seção 12), lida do snapshot gravado no fechamento. */
export default async function ResumoTurnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: turno } = await supabase.from('shifts').select('*').eq('id', id).maybeSingle();
  if (!turno) notFound();

  const [{ data: receitas }, { data: categorias }] = await Promise.all([
    supabase.from('shift_revenues').select('category_id, valor, qtd_corridas').eq('shift_id', id),
    supabase.from('categories').select('id, name'),
  ]);

  const nome = new Map((categorias ?? []).map((c) => [c.id, c.name]));
  const corridas = (receitas ?? []).reduce((a, r) => a + (r.qtd_corridas ?? 0), 0);

  const km = Number(turno.snap_km ?? 0);
  const faturamento = Number(turno.snap_faturamento ?? 0);
  const horas = Number(turno.snap_horas ?? 0);
  const custoCombustivel = Number(turno.snap_custo_combustivel ?? 0);
  const disponivel = Number(turno.snap_disponivel ?? 0);
  const prejuizo = disponivel < 0;

  return (
    <>
      <Link href="/app" className="text-sm text-[var(--color-marca)]">
        ← Meu dia
      </Link>

      <h1 className="mt-4 mb-1 text-xl font-bold">Resumo do turno</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        {new Date(`${turno.work_date}T12:00:00`).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })}
      </p>

      <section className="mb-6 rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-5">
        <dl className="space-y-1.5 text-sm">
          <Linha rotulo="Faturamento" valor={formatMoney(faturamento)} />
          <Linha rotulo="Horas trabalhadas" valor={formatHoras(horas)} />
          <Linha rotulo="KM rodados" valor={formatKm(km)} />
          <Linha rotulo="Média" valor={formatConsumo(Number(turno.consumo_usado))} />
          <Linha rotulo="Combustível consumido" valor={formatLitros(Number(turno.snap_litros))} />
          <Linha rotulo="Custo do combustível" valor={formatMoney(custoCombustivel)} />
          <Linha rotulo="Custo combustível/km" valor={formatRate(safeDiv(custoCombustivel, km), 'km')} />
          <Linha rotulo="Faturamento/km" valor={formatRate(safeDiv(faturamento, km), 'km')} />
          <Linha rotulo="Faturamento/hora" valor={formatRate(safeDiv(faturamento, horas, 2), 'h')} />
          <Linha rotulo="Outras despesas" valor={formatMoney(Number(turno.snap_outras_despesas))} />
          {corridas > 0 && <Linha rotulo="Corridas" valor={String(corridas)} />}

          <div className="!mt-3 border-t border-[var(--color-borda)] pt-3">
            <Linha rotulo="Reserva do carro" valor={formatMoney(Number(turno.snap_reserva_veiculo))} />
            <Linha rotulo="Reserva de emergência" valor={formatMoney(Number(turno.snap_reserva_emerg))} />
          </div>
        </dl>

        <div className="mt-4 border-t border-[var(--color-borda)] pt-4">
          <p className="text-sm text-[var(--color-tinta-suave)]">
            {prejuizo ? 'Prejuízo do dia' : 'Valor disponível'}
          </p>
          <p
            className="tabular text-3xl font-bold"
            style={{ color: prejuizo ? 'var(--color-alerta)' : 'var(--color-marca)' }}
          >
            {formatMoney(disponivel)}
          </p>
        </div>
      </section>

      {(receitas ?? []).length > 1 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold">Por plataforma</h2>
          <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
            {(receitas ?? []).map((r) => (
              <li key={r.category_id} className="flex justify-between gap-3 px-4 py-3">
                <span>{nome.get(r.category_id) ?? 'Receita'}</span>
                <span className="tabular font-medium">{formatMoney(Number(r.valor))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-[var(--color-tinta-suave)]">
        Estes números foram congelados no fechamento. Mudar o consumo do veículo ou os percentuais
        de distribuição daqui para frente não altera este dia.
      </p>
    </>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--color-tinta-suave)]">{rotulo}</dt>
      <dd className="tabular shrink-0 font-medium">{valor}</dd>
    </div>
  );
}
