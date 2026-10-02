import Link from 'next/link';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { formatHoras, formatMoney, formatNumber, inicioDoMes, medias, resolverPeriodo, type ChavePeriodo } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarConfigMeta, carregarPainelMeta, alvoDoMes, linhasPorDia, type LinhaDia } from '@/lib/meta/dados';
import { carregarPeriodo } from '@/lib/relatorios/dados';
import { can } from '@/lib/entitlements';
import { dataLocal } from '@/lib/numeros';
import { rotuloData, Voltar } from '../ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Histórico da meta — Sobrou' };

const ABAS: Array<{ chave: ChavePeriodo; rotulo: string }> = [
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'semana', rotulo: 'Semana' },
  { chave: 'mes', rotulo: 'Mês' },
  { chave: 'personalizado', rotulo: 'Período' },
];

const GRAFICOS = {
  faturamento: { rotulo: 'Faturamento diário', valor: (l: LinhaDia) => l.totais.faturamento, fmt: formatMoney },
  acumulado: { rotulo: 'Acumulado × meta', valor: (l: LinhaDia) => l.totais.faturamento, fmt: formatMoney },
  rsh: { rotulo: 'R$/hora', valor: (l: LinhaDia) => medias({ ...l.totais, diasTrabalhados: 1 }).porHora ?? 0, fmt: formatMoney },
  rskm: { rotulo: 'R$/km', valor: (l: LinhaDia) => medias({ ...l.totais, diasTrabalhados: 1 }).porKm ?? 0, fmt: formatMoney },
  lucro: { rotulo: 'Lucro líquido', valor: (l: LinhaDia) => l.lucro.lucro, fmt: formatMoney },
  km: { rotulo: 'KM rodados', valor: (l: LinhaDia) => l.totais.km, fmt: (v: number) => `${formatNumber(v, 1)} km` },
} as const;
type ChaveGrafico = keyof typeof GRAFICOS;

export default async function HistoricoMetaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string; grafico?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  if (!(await can('goals'))) redirect('/app/meta');

  const hoje = dataLocal(new Date(), ctx.timezone);
  const chave = (ABAS.some((a) => a.chave === sp.periodo) ? sp.periodo : 'mes') as ChavePeriodo;
  const periodo = resolverPeriodo(chave, hoje, { de: sp.de, ate: sp.ate });
  const grafico = (sp.grafico && sp.grafico in GRAFICOS ? sp.grafico : 'faturamento') as ChaveGrafico;

  const [config, dados, painel] = await Promise.all([
    carregarConfigMeta(ctx),
    carregarPeriodo(periodo.de, periodo.ate),
    carregarPainelMeta(ctx),
  ]);
  // O turno aberto ainda não tem snapshot: entra ao vivo se cair no período.
  const vivo = painel.aberto && painel.dia >= periodo.de && painel.dia <= periodo.ate ? { data: painel.dia, totais: painel.aberto.totais } : undefined;
  const linhas = linhasPorDia(dados.turnos, config.custosPorKm, vivo);
  const alvo = chave === 'mes' ? await alvoDoMes(periodo.de, inicioDoMes(hoje)) : null;

  const tot = linhas.reduce(
    (a, l) => ({
      horas: a.horas + l.totais.horas,
      km: a.km + l.totais.km,
      fat: a.fat + l.totais.faturamento,
      custos: a.custos + l.lucro.custoTotal,
      liq: a.liq + l.lucro.lucro,
    }),
    { horas: 0, km: 0, fat: 0, custos: 0, liq: 0 },
  );

  const url = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ periodo: chave, grafico, ...(sp.de ? { de: sp.de } : {}), ...(sp.ate ? { ate: sp.ate } : {}), ...extra });
    return `/app/meta/historico?${q.toString()}` as Route;
  };

  return (
    <>
      <Voltar href="/app/meta">Meta do Mês</Voltar>
      <h1 className="mb-1 mt-4 text-xl font-bold">Histórico</h1>
      <p className="mb-4 text-sm text-[var(--color-tinta-suave)]">{periodo.rotulo}</p>

      <nav className="mb-4 grid grid-cols-4 gap-1 rounded-xl p-1" style={{ background: 'var(--color-papel-suave)' }}>
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={url({ periodo: a.chave })}
            className="rounded-lg py-2 text-center text-sm font-semibold"
            style={a.chave === chave ? { background: 'var(--color-papel-elevado)' } : { color: 'var(--color-tinta-suave)' }}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      {chave === 'personalizado' && (
        <form className="mb-4 grid grid-cols-[1fr_1fr_auto] items-end gap-2" action="/app/meta/historico">
          <input type="hidden" name="periodo" value="personalizado" />
          <input type="hidden" name="grafico" value={grafico} />
          <label className="text-xs">
            De
            <input type="date" name="de" defaultValue={periodo.de} max={hoje} className="mt-1 w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-2 py-2 text-sm" />
          </label>
          <label className="text-xs">
            Até
            <input type="date" name="ate" defaultValue={periodo.ate} max={hoje} className="mt-1 w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-2 py-2 text-sm" />
          </label>
          <button type="submit" className="rounded-xl bg-[var(--color-marca)] px-4 font-semibold text-white">
            Ver
          </button>
        </form>
      )}

      {linhas.length === 0 ? (
        <p className="cartao p-5 text-sm text-[var(--color-tinta-suave)]">Nenhum trabalho registrado neste período.</p>
      ) : (
        <>
          <section className="cartao mb-4 p-4">
            <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto pb-1">
              {(Object.keys(GRAFICOS) as ChaveGrafico[]).map((g) => (
                <Link
                  key={g}
                  href={url({ grafico: g })}
                  className="flex-none rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={
                    g === grafico
                      ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                      : { background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }
                  }
                >
                  {GRAFICOS[g].rotulo}
                </Link>
              ))}
            </div>
            {grafico === 'acumulado' ? (
              <GraficoAcumulado linhas={linhas} alvo={alvo} />
            ) : (
              <GraficoBarras
                pontos={linhas.map((l) => ({ data: l.data, valor: GRAFICOS[grafico].valor(l) }))}
                fmt={GRAFICOS[grafico].fmt}
                rotulo={GRAFICOS[grafico].rotulo}
              />
            )}
          </section>

          <div className="cartao mb-4 overflow-x-auto">
            <table className="tabular w-full min-w-[640px] text-right text-sm">
              <thead className="text-xs text-[var(--color-tinta-suave)]">
                <tr>
                  {['Data', 'Horas', 'KM', 'Faturamento', 'R$/h', 'R$/km', 'Custos', 'Líquido'].map((h, i) => (
                    <th key={h} className={`px-3 py-2 font-medium ${i === 0 ? 'text-left' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...linhas].reverse().map((l) => {
                  const m = medias({ ...l.totais, diasTrabalhados: 1 });
                  return (
                    <tr key={l.data} className="border-t border-[var(--color-borda)]">
                      <td className="px-3 py-2 text-left">
                        <Link href={`/app/meta/resumo?data=${l.data}` as Route} className="underline decoration-[var(--color-borda)]">
                          {rotuloData(l.data)}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{formatHoras(l.totais.horas || null)}</td>
                      <td className="px-3 py-2">{formatNumber(l.totais.km, 1)}</td>
                      <td className="px-3 py-2 font-semibold">{formatMoney(l.totais.faturamento)}</td>
                      <td className="px-3 py-2">{formatMoney(m.porHora)}</td>
                      <td className="px-3 py-2">{formatMoney(m.porKm)}</td>
                      <td className="px-3 py-2">{formatMoney(l.lucro.custoTotal)}</td>
                      <td className="px-3 py-2" style={{ color: l.lucro.lucro >= 0 ? 'var(--color-positivo)' : 'var(--color-alerta)' }}>
                        {formatMoney(l.lucro.lucro)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="font-bold">
                <tr className="border-t border-[var(--color-borda)]">
                  <td className="px-3 py-2 text-left">Total</td>
                  <td className="px-3 py-2">{formatHoras(tot.horas || null)}</td>
                  <td className="px-3 py-2">{formatNumber(tot.km, 1)}</td>
                  <td className="px-3 py-2">{formatMoney(tot.fat)}</td>
                  <td className="px-3 py-2">{formatMoney(tot.horas > 0 ? tot.fat / tot.horas : null)}</td>
                  <td className="px-3 py-2">{formatMoney(tot.km > 0 ? tot.fat / tot.km : null)}</td>
                  <td className="px-3 py-2">{formatMoney(tot.custos)}</td>
                  <td className="px-3 py-2">{formatMoney(tot.liq)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}

const L = 340;
const A = 170;
const M = { t: 12, r: 8, b: 22, l: 8 };

function GraficoBarras({ pontos, fmt, rotulo }: { pontos: Array<{ data: string; valor: number }>; fmt: (v: number) => string; rotulo: string }) {
  const max = Math.max(...pontos.map((p) => p.valor), 0);
  const min = Math.min(...pontos.map((p) => p.valor), 0);
  const faixa = max - min || 1;
  const largura = (L - M.l - M.r) / pontos.length;
  const y = (v: number) => M.t + ((max - v) / faixa) * (A - M.t - M.b);
  const zero = y(0);
  const barra = Math.max(Math.min(largura - 2, 28), 3);
  const maior = pontos.reduce((a, b) => (b.valor > a.valor ? b : a), pontos[0]!);

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label={rotulo}>
      <line x1={M.l} x2={L - M.r} y1={zero} y2={zero} stroke="var(--color-borda)" />
      {pontos.map((p, i) => {
        const x = M.l + i * largura + (largura - barra) / 2;
        const topo = Math.min(y(p.valor), zero);
        const h = Math.max(Math.abs(zero - y(p.valor)), p.valor === 0 ? 0 : 1);
        return (
          <g key={p.data}>
            <title>{`${rotuloData(p.data)}: ${fmt(p.valor)}`}</title>
            <rect x={M.l + i * largura} y={M.t} width={largura} height={A - M.t - M.b} fill="transparent" />
            <rect x={x} y={topo} width={barra} height={h} rx={Math.min(4, barra / 2)} fill={p.valor < 0 ? 'var(--color-alerta)' : 'var(--color-marca)'} />
          </g>
        );
      })}
      {pontos.length > 0 && (
        <>
          <text x={M.l} y={A - 6} fontSize="10" fill="var(--color-tinta-suave)">
            {rotuloData(pontos[0]!.data)}
          </text>
          <text x={L - M.r} y={A - 6} fontSize="10" fill="var(--color-tinta-suave)" textAnchor="end">
            {rotuloData(pontos.at(-1)!.data)}
          </text>
          {maior.valor > 0 && (
            <text
              x={M.l + pontos.indexOf(maior) * largura + largura / 2}
              y={Math.max(y(maior.valor) - 4, 10)}
              fontSize="10"
              fill="var(--color-tinta)"
              textAnchor="middle"
            >
              {fmt(maior.valor)}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

function GraficoAcumulado({ linhas, alvo }: { linhas: LinhaDia[]; alvo: number | null }) {
  let soma = 0;
  const pontos = linhas.map((l) => ({ data: l.data, valor: (soma += l.totais.faturamento) }));
  const max = Math.max(soma, alvo ?? 0) || 1;
  const x = (i: number) => M.l + (pontos.length === 1 ? (L - M.l - M.r) / 2 : (i / (pontos.length - 1)) * (L - M.l - M.r));
  const y = (v: number) => M.t + ((max - v) / max) * (A - M.t - M.b);
  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');

  return (
    <>
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Faturamento acumulado comparado à meta">
        <line x1={M.l} x2={L - M.r} y1={y(0)} y2={y(0)} stroke="var(--color-borda)" />
        {alvo !== null && (
          <>
            <line x1={M.l} x2={L - M.r} y1={y(alvo)} y2={y(alvo)} stroke="var(--color-tinta-suave)" strokeDasharray="4 4" />
            <text x={L - M.r} y={y(alvo) - 4} fontSize="10" fill="var(--color-tinta-suave)" textAnchor="end">
              Meta {formatMoney(alvo)}
            </text>
          </>
        )}
        <path d={caminho} fill="none" stroke="var(--color-positivo)" strokeWidth="2" strokeLinejoin="round" />
        {pontos.map((p, i) => (
          <g key={p.data}>
            <title>{`${rotuloData(p.data)}: ${formatMoney(p.valor)}`}</title>
            <circle cx={x(i)} cy={y(p.valor)} r="10" fill="transparent" />
            <circle cx={x(i)} cy={y(p.valor)} r="4" fill="var(--color-positivo)" stroke="var(--color-papel-elevado)" strokeWidth="2" />
          </g>
        ))}
        <text x={x(pontos.length - 1)} y={Math.max(y(soma) - 8, 10)} fontSize="10" fill="var(--color-tinta)" textAnchor="end">
          {formatMoney(soma)}
        </text>
      </svg>
      {alvo === null && <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">A linha da meta aparece na aba Mês.</p>}
    </>
  );
}
