'use client';

import { useActionState, useState } from 'react';
import { salvarMeta } from '@/lib/metas/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

const DICAS: Record<string, string> = {
  fat_diaria: 'Quanto você quer faturar em um dia de trabalho.',
  fat_semanal: 'Conta de segunda a domingo e zera na virada da semana.',
  fat_mensal: 'Soma do mês corrente.',
  liquido_mensal: 'O que sobra para você no mês, depois de custos e reservas.',
  rs_km_min: 'Média mínima que você quer manter no mês.',
  rs_h_min: 'Média mínima por hora trabalhada no mês.',
  reserva_emerg: 'Saldo que você quer acumular na reserva de emergência.',
  reserva_veic: 'Saldo que você quer acumular para manutenção e troca do carro.',
};

export function FormularioMeta({
  tipos,
}: {
  tipos: Array<{ chave: string; rotulo: string }>;
}) {
  const [estado, acao] = useActionState(salvarMeta, {});
  const [tipo, setTipo] = useState(tipos[0]?.chave ?? '');

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

      <label className="mb-1 block">
        <span className="mb-1 block text-sm font-medium">Tipo de meta</span>
        <select
          name="kind"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
        >
          {tipos.map((t) => (
            <option key={t.chave} value={t.chave}>
              {t.rotulo}
            </option>
          ))}
        </select>
      </label>
      <p className="mb-4 text-xs text-[var(--color-tinta-suave)]">{DICAS[tipo]}</p>

      <Campo
        label="Valor da meta"
        name="target_value"
        inputMode="decimal"
        placeholder={tipo === 'rs_km_min' ? '2,00' : tipo === 'rs_h_min' ? '40,00' : '4.000,00'}
        required
        erro={estado.campos?.target_value}
      />

      <BotaoEnviar>Salvar meta</BotaoEnviar>
    </form>
  );
}
