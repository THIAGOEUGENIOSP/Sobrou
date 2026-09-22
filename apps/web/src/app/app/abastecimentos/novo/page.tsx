import Link from 'next/link';
import { redirect } from 'next/navigation';
import { carregarContexto } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { agoraNoFuso } from '@/lib/numeros';
import { FormularioAbastecimento } from '../formulario';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Novo abastecimento — Sobrou' };

/**
 * Formulário pré-preenchido com o último abastecimento (seção 24).
 *
 * Na fila do posto ninguém quer preencher dez campos: posto, combustível e
 * preço vêm do último registro, e o hodômetro sugerido é o do carro.
 */
export default async function NovoAbastecimentoPage() {
  const ctx = await carregarContexto();
  if (!ctx.veiculo) redirect('/onboarding');

  const supabase = await createClient();
  const { data: ultimo } = await supabase
    .from('fuel_entries')
    .select('station, fuel_kind, preco_anunciado')
    .order('filled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, hora } = agoraNoFuso(ctx.timezone);

  return (
    <>
      <Link href="/app/abastecimentos" className="text-sm text-[var(--color-marca)]">
        ← Abastecimentos
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-bold">Novo abastecimento</h1>

      <FormularioAbastecimento
        veiculos={ctx.veiculos.map((v) => ({ id: v.id, nickname: v.nickname }))}
        valores={{
          vehicle_id: ctx.veiculo.id,
          data,
          hora,
          posto: ultimo?.station ?? '',
          fuel_kind: ultimo?.fuel_kind ?? 'etanol',
          preco_anunciado: ultimo?.preco_anunciado
            ? String(ultimo.preco_anunciado).replace('.', ',')
            : '',
          litros: '',
          valor_bruto: '',
          desconto: '',
          cashback: '',
          valor_pago: '',
          odometro: ctx.veiculo.odometro_atual ? String(ctx.veiculo.odometro_atual) : '',
          tanque_cheio: true,
          notes: '',
        }}
      />
    </>
  );
}
