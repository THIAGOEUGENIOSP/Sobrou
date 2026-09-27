import Link from 'next/link';
import { formatMoney } from '@sobrou/finance';
import { carregarSerieMensal, type PontoMensal } from '@/lib/mensal/dados';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Mês a mês — Sobrou' };

function rotuloMesCurto(mes: string): string {
  return new Date(`${mes}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' });
}

function rotuloMesLongo(mes: string): string {
  const texto = new Date(`${mes}-01T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function MensalPage() {
  const dados = await carregarSerieMensal(12);

  const mesesComDado = dados.meses.filter((m) => m.totais.turnos > 0);
  const semDados = mesesComDado.length === 0;

  const totalFaturamento = dados.meses.reduce((a, m) => a + m.totais.faturamento, 0);
  const totalDespesas = dados.meses.reduce(
    (a, m) => a + m.totais.custoCombustivel + m.totais.outrasDespesas,
    0,
  );
  const totalDisponivel = dados.meses.reduce((a, m) => a + m.totais.disponivel, 0);

  const mesesComMovimento = dados.meses.filter(
    (m) => m.totais.turnos > 0 || m.totais.gastoCombustivelReal > 0,
  ).length;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Mês a mês</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Últimos {dados.meses.length} meses · quanto você faturou e quanto gastou, mês a mês.
      </p>

      {semDados ? (
        <div className="rounded-[var(--radius-cartao)] border border-dashed border-[var(--color-borda)] p-6 text-center">
          <p className="font-medium">Nenhum turno fechado nesses meses.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Assim que você fechar turnos em mais de um mês, esta tela mostra a evolução mês a mês.
          </p>
        </div>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4">
              <p className="text-sm text-[var(--color-tinta-suave)]">Faturado no período</p>
              <p className="tabular mt-1 text-2xl font-bold">{formatMoney(totalFaturamento)}</p>
              <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
                Média de {formatMoney(mesesComMovimento > 0 ? totalFaturamento / mesesComMovimento : 0)} por mês
              </p>
            </div>
            <div
              className="rounded-[var(--radius-cartao)] border p-4"
              style={{ borderColor: 'var(--color-marca)' }}
            >
              <p className="text-sm text-[var(--color-tinta-suave)]">Disponível no período</p>
              <p className="tabular mt-1 text-2xl font-bold" style={{ color: 'var(--color-marca)' }}>
                {formatMoney(totalDisponivel)}
              </p>
              <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
                Depois de combustível, despesas e o que foi separado em reserva
              </p>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 font-semibold">Faturamento x despesas</h2>
            <GraficoMensalBarras meses={dados.meses} />
            <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
              Despesas aqui é combustível + outras despesas do período. Manutenção não entra:
              ela sai da reserva do carro, não do resultado do mês — veja em Reservas.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-3 font-semibold">Detalhe por mês</h2>
            <TabelaMensal meses={dados.meses} />
          </section>

          <p className="text-sm text-[var(--color-tinta-suave)]">
            Quer o detalhe de um mês específico — plataforma, categoria de despesa, gráfico de
            evolução dia a dia?{' '}
            <Link href="/app/relatorios" className="text-[var(--color-marca)]">
              Veja em Relatórios
            </Link>
            .
          </p>
        </>
      )}

      {dados.recortadoPeloPlano && (
        <p className="mt-4 text-xs text-[var(--color-tinta-suave)]">
          Seu plano limita o histórico mostrado aqui; os meses mais antigos continuam guardados e
          saem na exportação dos seus dados.
        </p>
      )}
    </>
  );
}

/**
 * Barras agrupadas por mês: faturamento e despesas lado a lado. SVG desenhado
 * à mão, no mesmo espírito do gráfico de evolução dos Relatórios — sem
 * biblioteca de gráfico só para duas barras por mês.
 */
function GraficoMensalBarras({ meses }: { meses: PontoMensal[] }) {
  const largura = 328;
  const altura = 168;
  const margemBaixo = 20;
  const margemTopo = 8;
  const areaUtil = altura - margemBaixo - margemTopo;

  const maior = Math.max(
    1,
    ...meses.map((m) => Math.max(m.totais.faturamento, m.totais.custoCombustivel + m.totais.outrasDespesas)),
  );

  const larguraSlot = largura / meses.length;
  const larguraBarra = Math.min(14, larguraSlot * 0.32);
  const gapBarras = 3;

  return (
    <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4">
      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" role="img" aria-label="Faturamento e despesas por mês">
        <line
          x1="0"
          y1={altura - margemBaixo}
          x2={largura}
          y2={altura - margemBaixo}
          stroke="var(--color-borda)"
          strokeWidth="1"
        />
        {meses.map((m, i) => {
          const despesas = m.totais.custoCombustivel + m.totais.outrasDespesas;
          const centroX = larguraSlot * i + larguraSlot / 2;
          const alturaFat = (m.totais.faturamento / maior) * areaUtil;
          const alturaDesp = (despesas / maior) * areaUtil;
          const baseY = altura - margemBaixo;

          return (
            <g key={m.mes}>
              <rect
                x={centroX - larguraBarra - gapBarras / 2}
                y={baseY - alturaFat}
                width={larguraBarra}
                height={alturaFat}
                rx="2"
                fill="var(--color-marca)"
              />
              <rect
                x={centroX + gapBarras / 2}
                y={baseY - alturaDesp}
                width={larguraBarra}
                height={alturaDesp}
                rx="2"
                fill="var(--color-alerta)"
              />
              <text
                x={centroX}
                y={altura - 5}
                textAnchor="middle"
                fontSize="8.5"
                fill="var(--color-tinta-suave)"
              >
                {rotuloMesCurto(m.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex gap-4 text-xs">
        <Legenda cor="var(--color-marca)" rotulo="Faturamento" />
        <Legenda cor="var(--color-alerta)" rotulo="Despesas" />
      </div>
    </div>
  );
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[var(--color-tinta-suave)]">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: cor }} />
      {rotulo}
    </span>
  );
}

function TabelaMensal({ meses }: { meses: PontoMensal[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-borda)] text-left text-xs text-[var(--color-tinta-suave)]">
            <th className="px-3 py-2 font-medium">Mês</th>
            <th className="px-3 py-2 text-right font-medium">Faturamento</th>
            <th className="px-3 py-2 text-right font-medium">Despesas</th>
            <th className="px-3 py-2 text-right font-medium">Resultado</th>
            <th className="px-3 py-2 text-right font-medium">Disponível</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-borda)]">
          {[...meses].reverse().map((m) => {
            const despesas = m.totais.custoCombustivel + m.totais.outrasDespesas;
            return (
              <tr key={m.mes}>
                <td className="px-3 py-2 font-medium" title={rotuloMesLongo(m.mes)}>
                  {rotuloMesCurto(m.mes)}
                </td>
                <td className="tabular px-3 py-2 text-right">{formatMoney(m.totais.faturamento)}</td>
                <td className="tabular px-3 py-2 text-right text-[var(--color-alerta)]">
                  {formatMoney(despesas)}
                </td>
                <td
                  className="tabular px-3 py-2 text-right font-medium"
                  style={{
                    color: m.totais.resultadoOperacional < 0 ? 'var(--color-alerta)' : undefined,
                  }}
                >
                  {formatMoney(m.totais.resultadoOperacional)}
                </td>
                <td className="tabular px-3 py-2 text-right font-semibold" style={{ color: 'var(--color-marca)' }}>
                  {formatMoney(m.totais.disponivel)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
