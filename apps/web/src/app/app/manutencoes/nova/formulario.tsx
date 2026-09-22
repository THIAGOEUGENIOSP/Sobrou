'use client';

import { useActionState, useState } from 'react';
import { formatMoney } from '@sobrou/finance';
import { salvarManutencao } from '@/lib/manutencoes/actions';
import { lerNumeroBR } from '@/lib/numeros';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export function FormularioManutencao({
  veiculos,
  vehicleId,
  categorias,
  hoje,
  odometroSugerido,
  saldoReserva,
}: {
  veiculos: Array<{ id: string; nickname: string }>;
  vehicleId: string;
  categorias: Array<{ id: string; name: string }>;
  hoje: string;
  odometroSugerido: string;
  saldoReserva: number;
}) {
  const [estado, acao] = useActionState(salvarManutencao, {});
  const [comReserva, setComReserva] = useState(true);
  const [valor, setValor] = useState('');

  // O livro-razão aceita saldo negativo — é um fato, não um erro. Mas o
  // motorista precisa saber que está gastando mais do que separou, senão
  // descobre só no extrato.
  const numero = lerNumeroBR(valor);
  const estoura =
    comReserva && Number.isFinite(numero) && numero > saldoReserva && saldoReserva >= 0;
  const falta = estoura ? numero - saldoReserva : 0;

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      {veiculos.length > 1 ? (
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Veículo</span>
          <select
            name="vehicle_id"
            defaultValue={vehicleId}
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
        <input type="hidden" name="vehicle_id" value={vehicleId} />
      )}

      <Campo
        label="O que foi feito"
        name="description"
        placeholder="Troca de óleo e filtro"
        erro={estado.campos?.description}
      />

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium">Categoria</span>
        <select
          name="category_id"
          defaultValue=""
          className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
        >
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Campo
          label="Valor"
          name="valor"
          inputMode="decimal"
          placeholder="350,00"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          erro={estado.campos?.valor}
        />
        <Campo
          label="Data"
          name="performed_at"
          type="date"
          defaultValue={hoje}
          required
          erro={estado.campos?.performed_at}
        />
        <Campo
          label="Hodômetro"
          name="odometro"
          inputMode="decimal"
          defaultValue={odometroSugerido}
          erro={estado.campos?.odometro}
        />
        <Campo
          label="Oficina"
          name="workshop"
          placeholder="Oficina do Zé"
          erro={estado.campos?.workshop}
        />
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium">Próxima troca (opcional)</legend>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Por KM"
            name="next_km"
            inputMode="decimal"
            placeholder="20000"
            erro={estado.campos?.next_km}
          />
          <Campo label="Por data" name="next_date" type="date" erro={estado.campos?.next_date} />
        </div>
      </fieldset>

      <label className="mb-5 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="pago_com_reserva"
          checked={comReserva}
          onChange={(e) => setComReserva(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-marca)]"
        />
        <span>
          Pagar com a reserva do carro
          <span className="block text-xs text-[var(--color-tinta-suave)]">
            {comReserva
              ? 'Debita da reserva. O valor disponível dos seus dias não é afetado — esse dinheiro já tinha sido separado.'
              : 'Sai do seu bolso hoje. A reserva do carro continua intacta.'}
          </span>
        </span>
      </label>

      {estoura && (
        <div className="mb-4 rounded-[var(--radius-cartao)] border border-[var(--color-alerta)] p-4">
          <p className="text-sm font-medium text-[var(--color-alerta)]">
            Esta manutenção é maior que a reserva.
          </p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Há {formatMoney(saldoReserva)} guardados e a conta é de {formatMoney(numero)}. A reserva
            vai ficar em {formatMoney(saldoReserva - numero)} — ou seja, {formatMoney(falta)} saem do
            seu bolso agora e serão repostos nos próximos dias. Se preferir, desmarque a opção acima
            e registre como despesa do dia.
          </p>
        </div>
      )}

      <BotaoEnviar>Registrar manutenção</BotaoEnviar>
    </form>
  );
}
