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

      {/* Cartão único: o que sobrou primeiro, com faturamento/km/horas como
          subinformação — mesma linguagem visual do Painel (verde = dinheiro
          disponível, vermelho = prejuízo; nunca a cor de marca). */}
      <section className="mb-6">
        <div
          className="rounded-[var(--radius-cartao)] p-5"
          style={{ background: prejuizo ? 'var(--color-alerta)' : 'var(--color-positivo)' }}
        >
          <p className="text-sm font-medium text-black/70">
            {prejuizo ? 'Prejuízo do dia' : 'Sobrou nesse turno'}
          </p>
          <p className="tabular mt-1 text-4xl font-extrabold text-black">
            {formatMoney(disponivel)}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-sm text-black/70">
            <span>
              Faturamento <strong className="text-black">{formatMoney(faturamento)}</strong>
            </span>
            <span>
              Combustível <strong className="text-black">{formatMoney(custoCombustivel)}</strong>
            </span>
          </div>
        </div>
      </section>

      <section
        className="mb-6 rounded-[var(--radius-cartao)] p-5"
        style={{ background: 'var(--color-papel-suave)' }}
      >
        <dl className="space-y-1.5 text-sm">
          <Linha rotulo="Horas trabalhadas" valor={formatHoras(horas)} />
          <Linha rotulo="KM rodados" valor={formatKm(km)} />
          <Linha rotulo="Média" valor={formatConsumo(Number(turno.consumo_usado))} />
          <Linha rotulo="Combustível consumido" valor={formatLitros(Number(turno.snap_litros))} />
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
      </section>

      {(receitas ?? []).length > 1 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold">Por plataforma</h2>
          <ul className="space-y-2">
            {(receitas ?? []).map((r) => (
              <li
                key={r.category_id}
                className="flex justify-between gap-3 rounded-[var(--radius-cartao)] px-4 py-3"
                style={{ background: 'var(--color-papel-elevado)' }}
              >
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
