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
  type AllocationConfig,
} from '@sobrou/finance';
import { finalizarTurno } from '@/lib/turnos/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

type Plataforma = { id: string; name: string; favorita: boolean };

/**
 * Fechamento do dia.
 *
 * A prévia usa exatamente `fecharTurno` do pacote de fórmulas — a mesma
 * função que o servidor vai rodar ao salvar. Por isso o número que o motorista
 * vê aqui é o número que fica gravado, sem surpresa depois do toque.
 */
export function FormularioFecharTurno({
  shiftId,
  iniciadoEm,
  odoInicial,
  consumo,
  precoCombustivel,
  origemConsumo,
  despesasDoTurno,
  plataformas,
  allocation,
}: {
  shiftId: string;
  iniciadoEm: string;
  odoInicial: number;
  consumo: number;
  precoCombustivel: number;
  origemConsumo: 'medido' | 'cadastro' | 'padrao';
  despesasDoTurno: number[];
  plataformas: Plataforma[];
  allocation: AllocationConfig;
}) {
  const [estado, acao] = useActionState(finalizarTurno, {});
  const [odoFinal, setOdoFinal] = useState('');
  const [corridas, setCorridas] = useState('');
  const [valores, setValores] = useState<Record<string, string>>({});

  const previa = useMemo(() => {
    const odo = lerNumeroBR(odoFinal);
    if (!Number.isFinite(odo) || odo < odoInicial) return null;

    const receitas = plataformas
      .map((p) => ({ categoryId: p.id, valor: lerNumeroBR(valores[p.id] ?? '') }))
      .filter((r) => Number.isFinite(r.valor) && r.valor > 0);

    if (receitas.length === 0) return null;

    try {
      return fecharTurno(
        {
          startedAt: iniciadoEm,
          endedAt: new Date().toISOString(),
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
    valores,
    plataformas,
    odoInicial,
    iniciadoEm,
    consumo,
    precoCombustivel,
    despesasDoTurno,
    allocation,
  ]);

  const ordenadas = [...plataformas].sort(
    (a, b) => Number(b.favorita) - Number(a.favorita) || a.name.localeCompare(b.name),
  );

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="shift_id" value={shiftId} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

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

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium">Quanto você faturou</legend>
        <div className="grid gap-2">
          {ordenadas.map((p) => (
            <label key={p.id} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm">{p.name}</span>
              <input
                name={`receita_${p.id}`}
                inputMode="decimal"
                placeholder="0,00"
                value={valores[p.id] ?? ''}
                onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })}
                className="tabular w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <Campo
        label="Quantas corridas (opcional)"
        name="qtd_corridas"
        inputMode="numeric"
        placeholder="16"
        value={corridas}
        onChange={(e) => setCorridas(e.target.value)}
        erro={estado.campos?.qtd_corridas}
      />

      {previa && (
        <section className="mb-6 rounded-[var(--radius-cartao)] border border-[var(--color-marca)] p-5">
          <h2 className="mb-3 font-semibold">Resumo de hoje</h2>

          <dl className="space-y-1.5 text-sm">
            <Linha rotulo="Faturamento" valor={formatMoney(previa.turno.faturamento)} />
            <Linha rotulo="Horas trabalhadas" valor={formatHoras(previa.turno.horas)} />
            <Linha rotulo="KM rodados" valor={formatKm(previa.turno.km)} />
            <Linha
              rotulo="Média"
              valor={`${formatConsumo(consumo)}${origemConsumo === 'medido' ? '' : ' (estimado)'}`}
            />
            <Linha rotulo="Combustível consumido" valor={formatLitros(previa.turno.litros)} />
            <Linha rotulo="Custo do combustível" valor={formatMoney(previa.turno.custoCombustivel)} />
            <Linha
              rotulo="Custo combustível/km"
              valor={formatRate(previa.turno.combustivelPorKm, 'km')}
            />
            <Linha rotulo="Faturamento/km" valor={formatRate(previa.turno.faturamentoPorKm, 'km')} />
            <Linha rotulo="Faturamento/hora" valor={formatRate(previa.turno.faturamentoPorHora, 'h')} />
            <Linha rotulo="Outras despesas" valor={formatMoney(previa.turno.outrasDespesas)} />

            <div className="!mt-3 border-t border-[var(--color-borda)] pt-3">
              <Linha
                rotulo={`Reserva do carro (${allocation.pctVeiculo}%)`}
                valor={formatMoney(previa.distribuicao.reservaVeiculo)}
              />
              <Linha
                rotulo={`Emergência (${allocation.pctEmergencia}%)`}
                valor={formatMoney(previa.distribuicao.reservaEmergencia)}
              />
            </div>
          </dl>

          <div className="mt-4 border-t border-[var(--color-borda)] pt-4">
            <p className="text-sm text-[var(--color-tinta-suave)]">
              {previa.distribuicao.prejuizo ? 'Prejuízo do dia' : 'Valor disponível'}
            </p>
            <p
              className="tabular text-3xl font-bold"
              style={{
                color: previa.distribuicao.prejuizo
                  ? 'var(--color-alerta)'
                  : 'var(--color-marca)',
              }}
            >
              {formatMoney(previa.distribuicao.disponivel)}
            </p>
            {previa.distribuicao.prejuizo && (
              <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">
                Dia no vermelho: nada é reservado, porque não há o que guardar.
              </p>
            )}
          </div>
        </section>
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
