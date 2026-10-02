import Link from 'next/link';
import type { Route } from 'next';
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
import { ExcluirTurno } from '@/app/app/turno/historico/excluir-turno';
import { BlocoResumo } from '@/app/app/meta/resumo/bloco';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarResumoDia } from '@/lib/meta/dados';
import { can } from '@/lib/entitlements';

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

  // Cada corrida lançada em tempo real vira sua própria linha em
  // `shift_revenues`, então "Por plataforma" agrupa por categoria antes de
  // mostrar — senão a mesma plataforma apareceria uma vez por corrida.
  const porPlataforma = new Map<string, number>();
  for (const r of receitas ?? []) {
    porPlataforma.set(r.category_id, (porPlataforma.get(r.category_id) ?? 0) + Number(r.valor));
  }

  const km = Number(turno.snap_km ?? 0);
  const faturamento = Number(turno.snap_faturamento ?? 0);
  const horas = Number(turno.snap_horas ?? 0);
  const custoCombustivel = Number(turno.snap_custo_combustivel ?? 0);
  const disponivel = Number(turno.snap_disponivel ?? 0);
  const prejuizo = disponivel < 0;

  // Meta do Mês: depois de encerrar, o resumo já mostra a meta do dia, o
  // progresso do mês e a meta recalculada do próximo dia de trabalho.
  const resumoMeta = (await can('goals')) ? await carregarResumoDia(await carregarContexto(), turno.work_date) : null;

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

      {porPlataforma.size > 1 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold">Por plataforma</h2>
          <ul className="space-y-2">
            {Array.from(porPlataforma.entries()).map(([categoryId, valor]) => (
              <li
                key={categoryId}
                className="flex justify-between gap-3 rounded-[var(--radius-cartao)] px-4 py-3"
                style={{ background: 'var(--color-papel-elevado)' }}
              >
                <span>{nome.get(categoryId) ?? 'Receita'}</span>
                <span className="tabular font-medium">{formatMoney(valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resumoMeta && (resumoMeta.meta || resumoMeta.alvo !== null) && (
        <section className="mb-2">
          <h2 className="mb-3 font-semibold">Meta</h2>
          <BlocoResumo r={resumoMeta} compacto />
          <Link href={`/app/meta/resumo?data=${turno.work_date}` as Route} className="mb-6 block text-sm text-[var(--color-marca)]">
            Resumo completo do dia →
          </Link>
        </section>
      )}

      <p className="mb-4 text-xs text-[var(--color-tinta-suave)]">
        Estes números foram congelados no fechamento. Mudar o consumo do veículo ou os percentuais
        de distribuição daqui para frente não altera este dia.
      </p>

      {turno.status === 'fechado' && (
        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--color-borda)' }}>
          <Link href="/app/turno/historico" className="text-sm text-[var(--color-marca)]">
            Ver histórico de turnos
          </Link>
          <ExcluirTurno id={turno.id} rotulo="este turno" />
        </div>
      )}
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
