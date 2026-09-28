'use client';

import { useActionState, useMemo, useState } from 'react';
import {
  fecharTurno,
  formatConsumo,
  formatHoras,
  formatKm,
  formatLitros,
  formatMoney,
  formatRate,
  segundosTrabalhados,
  type AllocationConfig,
  type ShiftRevenue,
} from '@sobrou/finance';
import { finalizarTurno } from '@/lib/turnos/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

/**
 * Fechamento do dia.
 *
 * O faturamento não é mais digitado aqui — já foi lançado corrida a corrida
 * durante o turno (tela "Adicionar ganho"). Esta tela só confirma o
 * hodômetro final; a prévia usa exatamente `fecharTurno` do pacote de
 * fórmulas, a mesma função que o servidor roda ao salvar, para que o número
 * que aparece aqui seja o número que fica gravado.
 */
export function FormularioFecharTurno({
  shiftId,
  iniciadoEm,
  pausedSeconds,
  pausedAt,
  odoInicial,
  consumo,
  precoCombustivel,
  origemConsumo,
  despesasDoTurno,
  receitas,
  allocation,
}: {
  shiftId: string;
  iniciadoEm: string;
  pausedSeconds: number;
  pausedAt: string | null;
  odoInicial: number;
  consumo: number;
  precoCombustivel: number;
  origemConsumo: 'medido' | 'cadastro' | 'padrao';
  despesasDoTurno: number[];
  receitas: ShiftRevenue[];
  allocation: AllocationConfig;
}) {
  const [estado, acao] = useActionState(finalizarTurno, {});
  const [odoFinal, setOdoFinal] = useState('');
  const [verDetalhes, setVerDetalhes] = useState(false);

  const faturamentoTotal = receitas.reduce((a, r) => a + r.valor, 0);

  const previa = useMemo(() => {
    const odo = lerNumeroBR(odoFinal);
    if (!Number.isFinite(odo) || odo < odoInicial) return null;
    if (receitas.length === 0) return null;

    const fim = new Date();
    const segundosUteis = segundosTrabalhados(iniciadoEm, fim, pausedSeconds, pausedAt);
    const inicioEfetivo = new Date(fim.getTime() - segundosUteis * 1000);

    try {
      return fecharTurno(
        {
          startedAt: inicioEfetivo.toISOString(),
          endedAt: fim.toISOString(),
          odoInicial,
          odoFinal: odo,
          consumo,
          precoCombustivel,
          receitas,
          despesas: despesasDoTurno,
        },
        allocation,
      );
    } catch {
      return null;
    }
  }, [
    odoFinal,
    receitas,
    odoInicial,
    iniciadoEm,
    pausedSeconds,
    pausedAt,
    consumo,
    precoCombustivel,
    despesasDoTurno,
    allocation,
  ]);

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="shift_id" value={shiftId} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      {receitas.length === 0 ? (
        <Aviso tipo="erro">
          Nenhum ganho registrado neste turno ainda.{' '}
          <a href="/app/turno/ganho" className="underline">
            Adicione ao menos uma corrida
          </a>{' '}
          antes de fechar.
        </Aviso>
      ) : (
        <section
          className="mb-4 rounded-[var(--radius-cartao)] p-4"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-[var(--color-tinta-suave)]">
              Faturamento já lançado
            </h2>
            <span className="tabular font-semibold">{formatMoney(faturamentoTotal)}</span>
          </div>
          <ul className="space-y-1 text-sm">
            {receitas.map((r) => (
              <li key={r.categoryId} className="flex justify-between gap-3">
                <span className="text-[var(--color-tinta-suave)]">
                  {r.categoryName ?? 'Receita'}
                  {r.qtdCorridas ? ` · ${r.qtdCorridas} corridas` : ''}
                </span>
                <span className="tabular font-medium">{formatMoney(r.valor)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Campo
        label="Hodômetro agora"
        name="odo_final"
        inputMode="decimal"
        placeholder={String(odoInicial + 42)}
        required
        value={odoFinal}
        onChange={(e) => setOdoFinal(e.target.value)}
        erro={estado.campos?.odo_final}
      />
      {!previa && (
        <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
          Assim que preencher, você já vê quanto sobra hoje — antes de confirmar o fechamento.
        </p>
      )}

      {previa && (
        <>
          {/* Mesma linguagem visual do resumo pós-fechamento e do Painel: o que
              sobra primeiro, com faturamento/combustível como subinformação —
              verde/vermelho carregam o resultado, nunca a cor de marca. */}
          <section className="mb-3">
            <div
              className="rounded-[var(--radius-cartao)] p-5"
              style={{
                background: previa.distribuicao.prejuizo
                  ? 'var(--color-alerta)'
                  : 'var(--color-positivo)',
              }}
            >
              <p className="text-sm font-medium text-black/70">
                {previa.distribuicao.prejuizo ? 'Prejuízo do dia' : 'Sobra hoje'}
              </p>
              <p className="tabular mt-1 text-4xl font-extrabold text-black">
                {formatMoney(previa.distribuicao.disponivel)}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-3 text-sm text-black/70">
                <span>
                  Faturamento{' '}
                  <strong className="text-black">{formatMoney(previa.turno.faturamento)}</strong>
                </span>
                <span>
                  Combustível{' '}
                  <strong className="text-black">
                    {formatMoney(previa.turno.custoCombustivel)}
                  </strong>
                </span>
              </div>
              {previa.distribuicao.prejuizo && (
                <p className="mt-2 text-xs text-black/70">
                  Dia no vermelho: nada é reservado, porque não há o que guardar.
                </p>
              )}
            </div>
          </section>

          <section
            className="mb-6 rounded-[var(--radius-cartao)] p-5"
            style={{ background: 'var(--color-papel-suave)' }}
          >
            <h2 className="mb-3 font-semibold">Pra onde vai esse dinheiro</h2>
            <dl className="space-y-1.5 text-sm">
              <Linha
                rotulo={`Reserva do carro (${allocation.pctVeiculo}%)`}
                valor={formatMoney(previa.distribuicao.reservaVeiculo)}
              />
              <Linha
                rotulo={`Emergência (${allocation.pctEmergencia}%)`}
                valor={formatMoney(previa.distribuicao.reservaEmergencia)}
              />
            </dl>
            <p className="mt-1.5 text-xs text-[var(--color-tinta-suave)]">
              O resto — {formatMoney(previa.distribuicao.disponivel)} — é o que fica disponível pra
              você, mostrado ali em cima.
            </p>

            {!verDetalhes ? (
              <button
                type="button"
                onClick={() => setVerDetalhes(true)}
                className="mt-4 text-sm font-medium text-[var(--color-marca)]"
              >
                + Ver detalhes do turno (horas, km, consumo…)
              </button>
            ) : (
              <dl className="mt-4 space-y-1.5 border-t border-[var(--color-borda)] pt-3 text-sm">
                <Linha rotulo="Horas trabalhadas" valor={formatHoras(previa.turno.horas)} />
                <Linha rotulo="KM rodados" valor={formatKm(previa.turno.km)} />
                <Linha
                  rotulo="Média"
                  valor={`${formatConsumo(consumo)}${origemConsumo === 'medido' ? '' : ' (estimado)'}`}
                />
                <Linha rotulo="Combustível consumido" valor={formatLitros(previa.turno.litros)} />
                <Linha
                  rotulo="Custo combustível/km"
                  valor={formatRate(previa.turno.combustivelPorKm, 'km')}
                />
                <Linha
                  rotulo="Faturamento/km"
                  valor={formatRate(previa.turno.faturamentoPorKm, 'km')}
                />
                <Linha
                  rotulo="Faturamento/hora"
                  valor={formatRate(previa.turno.faturamentoPorHora, 'h')}
                />
                <Linha rotulo="Outras despesas" valor={formatMoney(previa.turno.outrasDespesas)} />
              </dl>
            )}
          </section>
        </>
      )}

      <BotaoEnviar>Fechar o dia</BotaoEnviar>
    </form>
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
