'use client';

import { useActionState, useMemo, useState } from 'react';
import { formatRate } from '@sobrou/finance';
import { adicionarGanho } from '@/lib/turnos/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo, CampoMoeda } from '@/components/formulario';

function diaDaSemana(data: string): string {
  if (!data) return '';
  const texto = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "6:30" ou "06:30" viram 6.5 (horas), só pra prévia de R$/hora na tela. */
function horasDecimais(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) + Number(m[2]) / 60;
}

type Plataforma = { id: string; name: string; favorita: boolean };

/**
 * Registro de uma corrida ou de um lote de corridas (mockup: "Adicionar
 * ganho" / "Nova Entrada"). A data vem preenchida com hoje mas é editável —
 * pra quem lembra de lançar só depois — e o dia da semana se calcula sozinho
 * a partir dela.
 */
export function FormularioGanho({
  shiftId,
  hoje,
  plataformas,
}: {
  /** `null` quando ainda não tem turno em andamento — o próprio envio abre
   * um (ver `adicionarGanho`), não é preciso ter o id antes. */
  shiftId: string | null;
  hoje: string;
  plataformas: Plataforma[];
}) {
  const [estado, acao] = useActionState(adicionarGanho, {});
  const ordenadas = [...plataformas].sort((a, b) => Number(b.favorita) - Number(a.favorita));
  const [escolhida, setEscolhida] = useState(ordenadas[0]?.id ?? '');
  const [data, setData] = useState(hoje);
  const [valor, setValor] = useState<number | null>(null);
  const [km, setKm] = useState('');
  const [horasTrabalhadas, setHorasTrabalhadas] = useState('');

  // Prévia ao vivo: só aparece quando dá pra calcular de verdade (valor e o
  // campo em questão preenchidos). É a mesma conta que "Detalhes da corrida"
  // mostra depois — aqui só adianta pro motorista ver antes de salvar.
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
      <input type="hidden" name="shift_id" value={shiftId ?? ''} />
      <input type="hidden" name="category_id" value={escolhida} />

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <Campo
        label="Data"
        name="data"
        type="date"
        required
        value={data}
        onChange={(e) => setData(e.target.value)}
        erro={estado.campos?.data}
      />

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Dia da semana</span>
        <input
          disabled
          value={diaDaSemana(data)}
          className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base text-[var(--color-tinta-suave)]"
        />
      </label>

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
        erro={estado.campos?.valor}
        onValorChange={setValor}
      />

      <Campo
        label="Quantidade de viagens"
        name="qtd_corridas"
        inputMode="numeric"
        placeholder="1"
        erro={estado.campos?.qtd_corridas}
      />
      <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
        Deixe em branco se foi uma corrida só. Preencha aqui só se esse valor for a soma de várias
        corridas juntas.
      </p>

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
        erro={estado.campos?.notes}
      />

      <Campo
        label="Nota do passageiro (opcional)"
        name="nota_passageiro"
        inputMode="decimal"
        placeholder="5"
        erro={estado.campos?.nota_passageiro}
      />

      <BotaoEnviar>Salvar</BotaoEnviar>
    </form>
  );
}
