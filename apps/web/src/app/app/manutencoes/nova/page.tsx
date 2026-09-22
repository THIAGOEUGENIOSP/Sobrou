import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatMoney } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { dataLocal } from '@/lib/numeros';
import { FormularioManutencao } from './formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Nova manutenção — Sobrou' };

export default async function NovaManutencaoPage() {
  const ctx = await carregarContexto();
  if (!ctx.veiculo) redirect('/onboarding');

  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from('categories')
    .select('id, name')
    .eq('kind', 'despesa')
    .is('archived_at', null)
    .order('sort_order');

  const { data: saldo } = await supabase
    .from('v_reserve_balances')
    .select('saldo')
    .eq('reserve_kind', 'veiculo')
    .maybeSingle();

  return (
    <>
      <Link href="/app/reservas" className="text-sm text-[var(--color-marca)]">
        ← Reservas
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-bold">Nova manutenção</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Há {formatMoney(Number(saldo?.saldo ?? 0))} guardados na reserva do carro.
      </p>

      <FormularioManutencao
        veiculos={ctx.veiculos.map((v) => ({ id: v.id, nickname: v.nickname }))}
        vehicleId={ctx.veiculo.id}
        categorias={(categorias ?? []).map((c) => ({ id: c.id, name: c.name }))}
        hoje={dataLocal(new Date(), ctx.timezone)}
        odometroSugerido={ctx.veiculo.odometro_atual ? String(ctx.veiculo.odometro_atual) : ''}
        saldoReserva={Number(saldo?.saldo ?? 0)}
      />
    </>
  );
}
