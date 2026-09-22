import Link from 'next/link';
import { Suspense } from 'react';
import {
  compararIndicador,
  formatConsumo,
  formatHoras,
  formatKm,
  formatLitros,
  formatMoney,
  formatRate,
  formatVariacao,
  type Comparacao,
} from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarPeriodo } from '@/lib/relatorios/dados';
import { resolverPeriodoDoUsuario, type ChavePeriodo } from '@/lib/relatorios/periodo';
import { can } from '@/lib/entitlements';
import { FiltrosPeriodo } from './filtros';
import { BotoesExportar } from './exportar';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Relatórios — Sobrou' };

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await carregarContexto();

  const chave = (sp.periodo ?? 'mes') as ChavePeriodo;
  const periodo = resolverPeriodoDoUsuario(chave, ctx.timezone, { de: sp.de, ate: sp.ate });

  const atual = await carregarPeriodo(periodo.de, periodo.ate);
  const podeComparar = await can('monthly_compare');
  const anterior = podeComparar
    ? await carregarPeriodo(periodo.anterior.de, periodo.anterior.ate)
    : null;

  const cmp = (a: number, b: number | undefined): Comparacao | null =>
    b === undefined ? null : compararIndicador(a, b);

  const t = atual.totais;
  const p = anterior?.totais;
  const semDados = t.turnos === 0 && t.gastoCombustivelReal === 0;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Relatórios</h1>
      <p className="mb-5 text-sm text-[var(--color-tinta-suave)]">{periodo.rotulo}</p>

      <Suspense fallback={null}>
        <FiltrosPeriodo atual={chave} />
      </Suspense>

      {semDados ? (
        <div className="rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nada registrado neste período.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Escolha outro intervalo ou{' '}
            <Link href="/app/turno" className="text-[var(--color-marca)]">
              feche um turno
            </Link>{' '}
            para começar.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3">
            <Cartao
              titulo="Faturamento"
              valor={formatMoney(t.faturamento)}
              comparacao={cmp(t.faturamento, p?.faturamento)}
            />
            <Cartao
              titulo="Disponível"
              valor={formatMoney(t.disponivel)}
              comparacao={cmp(t.disponivel, p?.disponivel)}
              destaque
            />
            <Cartao titulo="KM rodados" valor={formatKm(t.km)} comparacao={cmp(t.km, p?.km)} />
            <Cartao
              titulo="Horas"
              valor={formatHoras(t.horas)}
              comparacao={cmp(t.horas, p?.horas)}
            />
          </section>

          <section className="mb-6">
            <h2 className="mb-3 font-semibold">Números do período</h2>
            <dl className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)] text-sm">
              <Linha rotulo="Dias trabalhados" valor={String(t.diasTrabalhados)} />
              <Linha rotulo="Turnos" valor={String(t.turnos)} />
              {t.qtdCorridas !== null && (
                <Linha rotulo="Corridas" valor={String(t.qtdCorridas)} />
              )}
              <Linha rotulo="Litros abastecidos" valor={formatLitros(t.litrosAbastecidos)} />
              <Linha rotulo="Gasto com combustível" valor={formatMoney(t.gastoCombustivelReal)} />
              <Linha rotulo="Preço médio do litro" valor={formatRate(t.precoMedioLitro, 'L')} />
              <Linha rotulo="Consumo médio" valor={formatConsumo(t.consumoMedio)} />
              <Linha
                rotulo="Faturamento por km"
                valor={formatRate(t.faturamentoPorKm, 'km')}
                comparacao={cmp(t.faturamentoPorKm ?? 0, p?.faturamentoPorKm ?? undefined)}
              />
              <Linha
                rotulo="Faturamento por hora"
                valor={formatRate(t.faturamentoPorHora, 'h')}
                comparacao={cmp(t.faturamentoPorHora ?? 0, p?.faturamentoPorHora ?? undefined)}
              />
              <Linha
                rotulo="Custo combustível por km"
                valor={formatRate(t.custoCombustivelPorKm, 'km')}
              />
              <Linha rotulo="Outras despesas" valor={formatMoney(t.outrasDespesas)} />
              {t.outrasReceitas > 0 && (
                <Linha rotulo="Receitas fora de turno" valor={formatMoney(t.outrasReceitas)} />
              )}
              <Linha rotulo="Resultado operacional" valor={formatMoney(t.resultadoOperacional)} />
              <Linha rotulo="Reservado para o carro" valor={formatMoney(t.reservaVeiculo)} />
              <Linha rotulo="Reservado para emergência" valor={formatMoney(t.reservaEmergencia)} />
              <Linha rotulo="Manutenção realizada" valor={formatMoney(t.manutencaoRealizada)} />
            </dl>
            <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
              Reservado é o que foi separado no período; manutenção realizada é o que saiu de fato.
              Os dois não se anulam.
            </p>
          </section>

          {atual.porPlataforma.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-semibold">Por plataforma</h2>
              <Barras
                itens={atual.porPlataforma.map((x) => ({
                  nome: x.nome,
                  valor: x.valor,
                  detalhe: x.corridas > 0 ? `${x.corridas} corridas` : undefined,
                }))}
              />
            </section>
          )}

          {atual.porCategoria.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-semibold">Para onde foi o dinheiro</h2>
              <Barras
                itens={atual.porCategoria.map((x) => ({ nome: x.nome, valor: x.valor }))}
                cor="var(--color-alerta)"
              />
            </section>
          )}

          {podeComparar && p && (
            <section className="mb-6 rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4">
              <h2 className="mb-1 font-semibold">Comparado com {periodo.anterior.rotulo}</h2>
              <p className="text-sm text-[var(--color-tinta-suave)]">
                Faturamento {formatMoney(p.faturamento)} → {formatMoney(t.faturamento)} (
                {formatVariacao(compararIndicador(t.faturamento, p.faturamento).variacao)}).
                Disponível {formatMoney(p.disponivel)} → {formatMoney(t.disponivel)} (
                {formatVariacao(compararIndicador(t.disponivel, p.disponivel).variacao)}).
              </p>
            </section>
          )}

          <BotoesExportar de={periodo.de} ate={periodo.ate} rotulo={periodo.rotulo} />
        </>
      )}

      {atual.recortadoPeloPlano && (
        <p className="mt-4 text-xs text-[var(--color-tinta-suave)]">
          Seu plano mostra o histórico a partir de{' '}
          {new Date(`${atual.deEfetivo}T12:00:00`).toLocaleDateString('pt-BR')}; o período pedido
          começava antes disso. Os registros anteriores continuam guardados e saem na exportação dos
          seus dados.
        </p>
      )}
    </>
  );
}

function Cartao({
  titulo,
  valor,
  comparacao,
  destaque,
}: {
  titulo: string;
  valor: string;
  comparacao?: Comparacao | null;
  destaque?: boolean;
}) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] border p-4"
      style={{
        borderColor: destaque ? 'var(--color-marca)' : 'var(--color-borda)',
        background: destaque ? 'transparent' : 'var(--color-papel-suave)',
      }}
    >
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p
        className="tabular mt-1 text-2xl font-bold"
        style={destaque ? { color: 'var(--color-marca)' } : undefined}
      >
        {valor}
      </p>
      {comparacao?.variacao != null && (
        <p
          className="tabular mt-1 text-xs"
          style={{
            color:
              comparacao.direcao === 'alta'
                ? 'var(--color-positivo)'
                : comparacao.direcao === 'baixa'
                  ? 'var(--color-alerta)'
                  : 'var(--color-tinta-suave)',
          }}
        >
          {formatVariacao(comparacao.variacao)}
        </p>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  comparacao,
}: {
  rotulo: string;
  valor: string;
  comparacao?: Comparacao | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className="text-[var(--color-tinta-suave)]">{rotulo}</dt>
      <dd className="tabular shrink-0 font-medium">
        {valor}
        {comparacao?.variacao != null && (
          <span
            className="ml-2 text-xs font-normal"
            style={{
              color:
                comparacao.direcao === 'alta'
                  ? 'var(--color-positivo)'
                  : comparacao.direcao === 'baixa'
                    ? 'var(--color-alerta)'
                    : 'var(--color-tinta-suave)',
            }}
          >
            {formatVariacao(comparacao.variacao)}
          </span>
        )}
      </dd>
    </div>
  );
}

/**
 * Barras proporcionais. Um gráfico só entra quando ajuda a interpretar
 * (seção 19) — aqui, para enxergar de relance qual plataforma ou categoria
 * domina, o que uma lista de números não entrega.
 */
function Barras({
  itens,
  cor = 'var(--color-marca)',
}: {
  itens: Array<{ nome: string; valor: number; detalhe?: string }>;
  cor?: string;
}) {
  const maior = Math.max(...itens.map((i) => i.valor), 1);

  return (
    <ul className="space-y-2.5">
      {itens.map((item) => (
        <li key={item.nome}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {item.nome}
              {item.detalhe && (
                <span className="ml-2 text-xs text-[var(--color-tinta-suave)]">
                  {item.detalhe}
                </span>
              )}
            </span>
            <span className="tabular shrink-0 font-medium">{formatMoney(item.valor)}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: 'var(--color-papel-suave)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.valor / maior) * 100}%`, background: cor }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
