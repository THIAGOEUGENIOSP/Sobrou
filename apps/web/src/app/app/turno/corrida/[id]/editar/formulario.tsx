'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { formatRate } from '@sobrou/finance';
import { atualizarGanho } from '@/lib/turnos/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo, CampoMoeda } from '@/components/formulario';

type Plataforma = { id: string; name: string; favorita: boolean };

function horasDecimais(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

/** "Editar Entrada" do mockup — mesmos campos de "Adicionar ganho", já
 * preenchidos com o que está salvo. Data e dia da semana não aparecem aqui:
 * `occurred_at` não muda por edição (ver `atualizarGanho`). */
export function FormularioEdicaoGanho({
  corridaId,
  plataformas,
  valorInicial,
}: {
  corridaId: string;
  plataformas: Plataforma[];
  valorInicial: {
    categoryId: string;
    valor: number;
    qtdCorridas: string;
    km: string;
    horasTrabalhadas: string;
    notaPassageiro: string;
    notes: string;
  };
}) {
  const [estado, acao] = useActionState(atualizarGanho, {});
  const ordenadas = [...plataformas].sort((a, b) => Number(b.favorita) - Number(a.favorita));
  const [escolhida, setEscolhida] = useState(valorInicial.categoryId);
  const [valor, setValor] = useState<number | null>(valorInicial.valor);
  const [km, setKm] = useState(valorInicial.km);
  const [horasTrabalhadas, setHorasTrabalhadas] = useState(valorInicial.horasTrabalhadas);

  const rsKm = useMemo(() => {
    const k = lerNumeroBR(km);
    return valor !== null && Number.isFinite(k) && k > 0 ? valor / k : null;
  }, [valor, km]);
  const rsHora = useMemo(() => {
    const h = horasDecimais(horasTrabalhadas);
    return valor !== null && h !== null && h > 0 ? valor / h : null;
  }, [valor, horasTrabalhadas]);

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="id" value={corridaId} />
      <input type="hidden" name="category_id" value={escolhida} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Origem</span>
        <select
          value={escolhida}
          onChange={(e) => setEscolhida(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
        >
          {ordenadas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {estado.campos?.category_id && (
        <p className="-mt-3 mb-3 text-sm text-[var(--color-alerta)]">{estado.campos.category_id}</p>
      )}

      <CampoMoeda
        label="Valor entrada"
        name="valor"
        required
        valorInicial={valorInicial.valor}
        erro={estado.campos?.valor}
        onValorChange={setValor}
      />

      <Campo
        label="Quantidade de viagens"
        name="qtd_corridas"
        inputMode="numeric"
        placeholder="1"
        defaultValue={valorInicial.qtdCorridas}
        erro={estado.campos?.qtd_corridas}
      />

      <div className="grid grid-cols-2 gap-3">
        <Campo
          label="Km rodados"
          name="km"
          inputMode="decimal"
          placeholder="8,4"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          erro={estado.campos?.km}
        />
        <Campo
          label="Horas trabalhadas"
          name="horas_trabalhadas"
          type="time"
          value={horasTrabalhadas}
          onChange={(e) => setHorasTrabalhadas(e.target.value)}
          erro={estado.campos?.horas_trabalhadas}
        />
      </div>

      {(rsKm !== null || rsHora !== null) && (
        <div
          className="mb-4 flex gap-4 rounded-[var(--radius-cartao)] p-3 text-sm"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          {rsKm !== null && (
            <span>
              <span className="block text-xs text-[var(--color-tinta-suave)]">R$ por km</span>
              <strong className="tabular">{formatRate(rsKm, 'km')}</strong>
            </span>
          )}
          {rsHora !== null && (
            <span>
              <span className="block text-xs text-[var(--color-tinta-suave)]">R$ por hora</span>
              <strong className="tabular">{formatRate(rsHora, 'h')}</strong>
            </span>
          )}
        </div>
      )}

      <Campo
        label="Observação (opcional)"
        name="notes"
        placeholder="Ex.: corrida longa, evento na cidade..."
        defaultValue={valorInicial.notes}
        erro={estado.campos?.notes}
      />

      <Campo
        label="Nota do passageiro (opcional)"
        name="nota_passageiro"
        inputMode="decimal"
        placeholder="5"
        defaultValue={valorInicial.notaPassageiro}
        erro={estado.campos?.nota_passageiro}
      />

      <BotaoEnviar>Salvar alterações</BotaoEnviar>

      <Link
        href={`/app/turno/corrida/${corridaId}`}
        className="mt-3 block w-full py-3 text-center text-sm text-[var(--color-tinta-suave)]"
      >
        Cancelar
      </Link>
    </form>
  );
}
