'use client';

import { useActionState, useState } from 'react';
import { iniciarTurno } from '@/lib/turnos/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export function FormularioIniciarTurno({
  veiculos,
  vehicleId,
  odometroSugerido,
}: {
  veiculos: Array<{ id: string; nickname: string }>;
  vehicleId: string;
  odometroSugerido: string;
}) {
  const [estado, acao] = useActionState(iniciarTurno, {});
  const [veiculo, setVeiculo] = useState(vehicleId);

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      {veiculos.length > 1 ? (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Veículo</span>
          <select
            name="vehicle_id"
            value={veiculo}
            onChange={(e) => setVeiculo(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
          >
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nickname}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="vehicle_id" value={veiculo} />
      )}

      <Campo
        label="Hodômetro agora"
        name="odo_inicial"
        inputMode="decimal"
        defaultValue={odometroSugerido}
        required
        erro={estado.campos?.odo_inicial}
      />
      <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
        Já vem preenchido com o último valor conhecido. Confira no painel e ajuste se precisar.
      </p>

      <BotaoEnviar>Começar a rodar</BotaoEnviar>
    </form>
  );
}
