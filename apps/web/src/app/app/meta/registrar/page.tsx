import { redirect } from 'next/navigation';
import { carregarContexto } from '@/lib/dados/contexto';
import { createClient } from '@/lib/supabase/server';
import { dataLocal } from '@/lib/numeros';
import { Voltar } from '../ui';
import { FormularioRegistrar } from './formulario';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Registrar trabalho — Sobrou' };

export default async function RegistrarTrabalhoPage({ searchParams }: { searchParams: Promise<{ print?: string }> }) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  if (!ctx.veiculo) redirect('/onboarding');

  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from('categories')
    .select('id, name')
    .eq('kind', 'receita')
    .is('archived_at', null)
    .order('sort_order');

  const lista = categorias ?? [];
  const uber = lista.find((c) => c.name.toLowerCase() === 'uber') ?? lista[0];
  if (!uber) redirect('/app/ajustes');

  return (
    <>
      <Voltar href="/app/meta">Meta do Mês</Voltar>
      <h1 className="mb-1 mt-4 text-xl font-bold">Registrar trabalho</h1>
      <p className="mb-5 text-sm text-[var(--color-tinta-suave)]">
        Para um dia que já terminou. Rodando agora? Use o{' '}
        <a href="/app/turno" className="underline">
          turno
        </a>{' '}
        — ele conta em tempo real.
      </p>
      <FormularioRegistrar
        hoje={dataLocal(new Date(), ctx.timezone)}
        categorias={lista.map((c) => ({ id: c.id, name: c.name }))}
        categoriaPadrao={uber.id}
        odometroAtual={ctx.veiculo.odometro_atual !== null ? Number(ctx.veiculo.odometro_atual) : null}
        abrirPrint={sp.print === '1'}
      />
    </>
  );
}
