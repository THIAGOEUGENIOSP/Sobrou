import { redirect } from 'next/navigation';
import { formatMoney, inicioDoMes } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { alvoDoMes, DIAS_PADRAO } from '@/lib/meta/dados';
import { createClient } from '@/lib/supabase/server';
import { can } from '@/lib/entitlements';
import { dataLocal } from '@/lib/numeros';
import { FormularioMetaMes } from '../formularios';
import { Voltar, nomeDoMes } from '../ui';
import { FormularioConfig, SeletorTema } from './formularios';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configurar meta — Sobrou' };

export default async function AjustesMetaPage() {
  const ctx = await carregarContexto();
  if (!(await can('goals'))) redirect('/app/meta');
  const supabase = await createClient();

  const mesAtual = inicioDoMes(dataLocal(new Date(), ctx.timezone));
  const [alvo, { data: s }, { data: meses }] = await Promise.all([
    alvoDoMes(mesAtual, mesAtual),
    supabase.from('meta_settings').select('*').eq('user_id', ctx.userId).maybeSingle(),
    supabase.from('month_targets').select('month, target_value').order('month', { ascending: false }).limit(12),
  ]);

  const manutencaoVeiculo = ctx.veiculo?.manutencao_km_estimada != null ? Number(ctx.veiculo.manutencao_km_estimada) : null;

  return (
    <>
      <Voltar href="/app/meta">Meta do Mês</Voltar>
      <h1 className="mb-5 mt-4 text-xl font-bold">Configurar meta</h1>

      <section className="cartao mb-4 p-5">
        <h2 className="mb-1 font-semibold">Meta mensal</h2>
        <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">Qualquer valor, para qualquer mês. Salvar de novo substitui.</p>
        <FormularioMetaMes mes={mesAtual} valorAtual={alvo} />
        {(meses ?? []).length > 0 && (
          <ul className="mt-4 divide-y divide-[var(--color-borda)] text-sm">
            {(meses ?? []).map((m) => (
              <li key={m.month} className="flex justify-between py-2">
                <span className="capitalize">
                  {nomeDoMes(m.month)} {m.month.slice(0, 4)}
                </span>
                <span className="tabular font-semibold">{formatMoney(Number(m.target_value))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormularioConfig
        manutencaoVeiculo={manutencaoVeiculo}
        v={{
          dias: s?.work_weekdays?.map(Number) ?? DIAS_PADRAO,
          rs_h_vermelho: Number(s?.rs_h_vermelho ?? 30),
          rs_h_verde: Number(s?.rs_h_verde ?? 40),
          rs_km_vermelho: Number(s?.rs_km_vermelho ?? 2),
          rs_km_verde: Number(s?.rs_km_verde ?? 2.8),
          liq_h_vermelho: Number(s?.liq_h_vermelho ?? 20),
          liq_h_verde: Number(s?.liq_h_verde ?? 30),
          custo_manutencao_km: s?.custo_manutencao_km != null ? Number(s.custo_manutencao_km) : null,
          custo_pneus_km: Number(s?.custo_pneus_km ?? 0),
          custo_revisao_km: Number(s?.custo_revisao_km ?? 0),
          custo_outros_km: Number(s?.custo_outros_km ?? 0),
        }}
      />

      <section className="cartao mt-4 p-5">
        <h2 className="mb-1 font-semibold">Tema</h2>
        <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">Vale para o app inteiro, neste aparelho.</p>
        <SeletorTema />
      </section>
    </>
  );
}
