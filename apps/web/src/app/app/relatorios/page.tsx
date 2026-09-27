import Link from 'next/link';
import { Suspense } from 'react';
import {
  compararIndicador,
  formatConsumo,
  formatHoras,
  formatKm,
  formatLitros,
  formatMoney,
  formatPercent,
  formatRate,
  formatVariacao,
  type Comparacao,
  type PontoDiario,
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
        <div
          className="rounded-[var(--radius-cartao)] p-6 text-center"
          style={{ background: 'var(--color-papel-suave)' }}
        >
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
              titulo="Sobrou"
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
            <h2 className="mb-3 font-semibold">Seu desempenho</h2>
            <div className="grid grid-cols-3 gap-2">
              <CartaoNumero
                rotulo="R$/hora"
                valor={formatRate(t.faturamentoPorHora, 'h')}
                comparacao={cmp(t.faturamentoPorHora ?? 0, p?.faturamentoPorHora ?? undefined)}
              />
              <CartaoNumero
                rotulo="R$/km"
                valor={formatRate(t.faturamentoPorKm, 'km')}
                comparacao={cmp(t.faturamentoPorKm ?? 0, p?.faturamentoPorKm ?? undefined)}
              />
              <CartaoNumero
                rotulo="Margem"
                valor={
                  t.faturamento > 0
                    ? formatPercent((t.resultadoOperacional / t.faturamento) * 100, 0)
                    : '—'
                }
                comparacao={
                  t.faturamento > 0 && p && p.faturamento > 0
                    ? cmp(
                        (t.resultadoOperacional / t.faturamento) * 100,
                        (p.resultadoOperacional / p.faturamento) * 100,
                      )
                    : null
                }
              />
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 font-semibold">Números do período</h2>
            <div className="grid grid-cols-2 gap-2">
              <CartaoNumero rotulo="Dias trabalhados" valor={String(t.diasTrabalhados)} />
              <CartaoNumero rotulo="Turnos" valor={String(t.turnos)} />
              {t.qtdCorridas !== null && (
                <CartaoNumero rotulo="Corridas" valor={String(t.qtdCorridas)} />
              )}
              <CartaoNumero rotulo="Litros abastecidos" valor={formatLitros(t.litrosAbastecidos)} />
              <CartaoNumero rotulo="Gasto com combustível" valor={formatMoney(t.gastoCombustivelReal)} />
              <CartaoNumero rotulo="Preço médio do litro" valor={formatRate(t.precoMedioLitro, 'L')} />
              <CartaoNumero rotulo="Consumo médio" valor={formatConsumo(t.consumoMedio)} />
              <CartaoNumero
                rotulo="Faturamento por km"
                valor={formatRate(t.faturamentoPorKm, 'km')}
                comparacao={cmp(t.faturamentoPorKm ?? 0, p?.faturamentoPorKm ?? undefined)}
              />
              <CartaoNumero
                rotulo="Faturamento por hora"
                valor={formatRate(t.faturamentoPorHora, 'h')}
                comparacao={cmp(t.faturamentoPorHora ?? 0, p?.faturamentoPorHora ?? undefined)}
              />
              <CartaoNumero
                rotulo="Custo combustível por km"
                valor={formatRate(t.custoCombustivelPorKm, 'km')}
              />
              <CartaoNumero rotulo="Outras despesas" valor={formatMoney(t.outrasDespesas)} />
              {t.outrasReceitas > 0 && (
                <CartaoNumero rotulo="Receitas fora de turno" valor={formatMoney(t.outrasReceitas)} />
              )}
              <CartaoNumero rotulo="Resultado operacional" valor={formatMoney(t.resultadoOperacional)} />
              <CartaoNumero rotulo="Reservado para o carro" valor={formatMoney(t.reservaVeiculo)} />
              <CartaoNumero rotulo="Reservado para emergência" valor={formatMoney(t.reservaEmergencia)} />
              <CartaoNumero rotulo="Manutenção realizada" valor={formatMoney(t.manutencaoRealizada)} />
            </div>
            <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
              Reservado é o que foi separado no período; manutenção realizada é o que saiu de fato.
              Os dois não se anulam.
            </p>
          </section>

          {atual.serie.length > 1 && (
            <section className="mb-6">
              <h2 className="mb-3 font-semibold">Evolução no período</h2>
              <GraficoEvolucao pontos={atual.serie} />
            </section>
          )}

          {atual.porPlataforma.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 font-semibold">Por plataforma</h2>
              <div
                className="rounded-[var(--radius-cartao)] p-4"
                style={{ background: 'var(--color-papel-suave)' }}
              >
                <DonutPlataformas itens={atual.porPlataforma} />
              </div>
            </section>
          )}

          {atual.porPlataformaDetalhado.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-1 font-semibold">Onde seu trabalho rendeu mais</h2>
              <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">
                O custo de cada turno é rateado entre as plataformas na proporção da receita que
                cada uma trouxe naquele turno — é uma estimativa, não uma medição exata.
              </p>
              <TabelaRentabilidade itens={atual.porPlataformaDetalhado} />
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
            <section
              className="mb-6 rounded-[var(--radius-cartao)] p-4"
              style={{ background: 'var(--color-papel-suave)' }}
            >
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
        borderColor: destaque ? 'var(--color-positivo)' : 'var(--color-borda)',
        background: destaque ? 'transparent' : 'var(--color-papel-suave)',
      }}
    >
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p
        className="tabular mt-1 text-2xl font-bold"
        style={destaque ? { color: 'var(--color-positivo)' } : undefined}
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

/** Card quadrado pra um número do período — mesmo padrão do bloco de métricas
 * do Painel, no lugar da lista em linhas que ficava alta e monótona de rolar. */
function CartaoNumero({
  rotulo,
  valor,
  comparacao,
}: {
  rotulo: string;
  valor: string;
  comparacao?: Comparacao | null;
}) {
  return (
    <div className="rounded-[var(--radius-cartao)] p-3" style={{ background: 'var(--color-papel-suave)' }}>
      <p className="text-xs text-[var(--color-tinta-suave)]">{rotulo}</p>
      <p className="tabular mt-0.5 font-bold">{valor}</p>
      {comparacao?.variacao != null && (
        <p
          className="tabular mt-0.5 text-xs"
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

/**
 * Rosca de composição: qual fração do faturamento veio de cada plataforma.
 * Cada fatia usa a mesma cor da categoria em todo o app (Painel, Transações),
 * então a identidade nunca muda de tela pra tela — e a legenda ao lado nomeia
 * cada cor, pra não depender só da cor pra diferenciar (seção 6 do guia de
 * gráficos).
 */
function DonutPlataformas({
  itens,
}: {
  itens: Array<{ nome: string; valor: number; cor: string | null; corridas: number }>;
}) {
  const total = itens.reduce((a, i) => a + i.valor, 0);
  if (total <= 0) return null;

  const raio = 54;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;
  const fatias = itens.map((item) => {
    const fracao = item.valor / total;
    const comprimento = fracao * circunferencia;
    const fatia = { ...item, fracao, comprimento, offset: acumulado };
    acumulado += comprimento;
    return fatia;
  });

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" width="128" height="128" className="flex-none">
        <g transform="translate(70,70) rotate(-90)">
          <circle r={raio} fill="none" stroke="var(--color-papel-elevado)" strokeWidth="20" />
          {fatias.map((f) => (
            <circle
              key={f.nome}
              r={raio}
              fill="none"
              stroke={f.cor ?? 'var(--color-tinta-fraca)'}
              strokeWidth="20"
              strokeDasharray={`${f.comprimento} ${circunferencia - f.comprimento}`}
              strokeDashoffset={-f.offset}
            />
          ))}
        </g>
        <text
          x="70"
          y="66"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="var(--color-tinta)"
        >
          {formatMoney(total)}
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="var(--color-tinta-suave)">
          faturamento
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {fatias.map((f) => (
          <li key={f.nome} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: f.cor ?? 'var(--color-tinta-fraca)' }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{f.nome}</span>
            <span className="tabular shrink-0 font-medium text-[var(--color-tinta-suave)]">
              {formatPercent(f.fracao * 100, 0)}
            </span>
          </li>
        ))}
      </ul>
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

/**
 * Margem por plataforma — não só o quanto cada uma pagou, mas o que sobrou
 * depois do custo rateado do turno. Ordenado pela mesma ordem que já vem de
 * `porPlataforma` (maior receita primeiro).
 */
function TabelaRentabilidade({
  itens,
}: {
  itens: Array<{
    nome: string;
    valor: number;
    corridas: number;
    margem: number;
    margemPorKm: number | null;
    margemPorHora: number | null;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-borda)] text-left text-xs text-[var(--color-tinta-suave)]">
            <th className="px-3 py-2 font-medium">Plataforma</th>
            <th className="px-3 py-2 text-right font-medium">Margem</th>
            <th className="px-3 py-2 text-right font-medium">Por km</th>
            <th className="px-3 py-2 text-right font-medium">Por hora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-borda)]">
          {itens.map((item) => (
            <tr key={item.nome}>
              <td className="px-3 py-2">
                <span className="font-medium">{item.nome}</span>
                {item.corridas > 0 && (
                  <span className="ml-2 text-xs text-[var(--color-tinta-suave)]">
                    {item.corridas} corridas
                  </span>
                )}
              </td>
              <td
                className="tabular px-3 py-2 text-right font-medium"
                style={{ color: item.margem < 0 ? 'var(--color-alerta)' : undefined }}
              >
                {formatMoney(item.margem)}
              </td>
              <td className="tabular px-3 py-2 text-right text-[var(--color-tinta-suave)]">
                {formatRate(item.margemPorKm, 'km')}
              </td>
              <td className="tabular px-3 py-2 text-right text-[var(--color-tinta-suave)]">
                {formatRate(item.margemPorHora, 'h')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Gráfico de evolução (seção 19): resultado operacional e disponível dia a
 * dia. SVG desenhado à mão, sem biblioteca — são só duas linhas.
 */
function GraficoEvolucao({ pontos }: { pontos: PontoDiario[] }) {
  const largura = 320;
  const altura = 132;
  const margemY = 14;

  const valores = pontos.flatMap((p) => [p.resultadoOperacional, p.disponivel]);
  const minValor = Math.min(0, ...valores);
  const maxValor = Math.max(0, ...valores);
  const alcance = maxValor - minValor || 1;

  const posX = (i: number) =>
    pontos.length <= 1 ? largura / 2 : (i / (pontos.length - 1)) * largura;
  const posY = (v: number) =>
    altura - margemY - ((v - minValor) / alcance) * (altura - margemY * 2);

  const linha = (chave: 'resultadoOperacional' | 'disponivel') =>
    pontos
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${posX(i).toFixed(1)} ${posY(p[chave]).toFixed(1)}`)
      .join(' ');

  const zeroY = posY(0);
  const ultimo = pontos[pontos.length - 1];

  return (
    <div
      className="rounded-[var(--radius-cartao)] p-4"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        role="img"
        aria-label="Evolução do resultado operacional e do disponível ao longo do período"
      >
        {minValor < 0 && maxValor > 0 && (
          <line
            x1="0"
            y1={zeroY}
            x2={largura}
            y2={zeroY}
            stroke="var(--color-borda)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        <path d={linha('disponivel')} fill="none" stroke="var(--color-positivo)" strokeWidth="2" />
        <path
          d={linha('resultadoOperacional')}
          fill="none"
          stroke="var(--color-aviso)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      </svg>
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex gap-4">
          <Legenda cor="var(--color-positivo)" rotulo="Disponível" />
          <Legenda cor="var(--color-aviso)" rotulo="Resultado operacional" tracejado />
        </div>
        <span className="tabular text-[var(--color-tinta-suave)]">
          hoje: {formatMoney(ultimo.disponivel)}
        </span>
      </div>
    </div>
  );
}

function Legenda({
  cor,
  rotulo,
  tracejado,
}: {
  cor: string;
  rotulo: string;
  tracejado?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--color-tinta-suave)]">
      <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true">
        <line
          x1="0"
          y1="4"
          x2="14"
          y2="4"
          stroke={cor}
          strokeWidth="2"
          strokeDasharray={tracejado ? '3 2' : undefined}
        />
      </svg>
      {rotulo}
    </span>
  );
}
