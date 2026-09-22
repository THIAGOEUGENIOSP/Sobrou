import { createClient, requireUser } from '@/lib/supabase/server';
import { PainelConta } from './painel';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Conta e privacidade — KM Legal' };

export default async function ContaPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Consultas separadas em vez de join embutido: o join do PostgREST depende
  // de inferência de tipo que não sobrevive bem a mudanças de schema, e aqui
  // são duas linhas, não uma listagem.
  const [{ data: assinatura }, { data: consentimentos }, { data: documentos }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('plan_id, status, trial_ends_at, current_period_end')
      .in('status', ['trialing', 'active', 'past_due'])
      .maybeSingle(),
    supabase.from('consents').select('document_id, accepted_at').order('accepted_at'),
    supabase.from('legal_documents').select('id, title, version'),
  ]);

  const { data: plano } = assinatura
    ? await supabase.from('plans').select('name, code').eq('id', assinatura.plan_id).maybeSingle()
    : { data: null };

  const docPorId = new Map((documentos ?? []).map((d) => [d.id, d]));

  return (
    <>
      <h1 className="mb-6 text-xl font-bold">Conta e privacidade</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Plano</h2>
        <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4">
          <p className="font-medium">{plano?.name ?? 'Grátis'}</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            {assinatura?.status === 'trialing' && assinatura.trial_ends_at
              ? `Período de teste até ${new Date(assinatura.trial_ends_at).toLocaleDateString('pt-BR')}.`
              : assinatura?.status === 'active'
                ? 'Assinatura ativa.'
                : 'Recursos básicos liberados.'}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Consentimentos</h2>
        {consentimentos && consentimentos.length > 0 ? (
          <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
            {consentimentos.map((c) => {
              const doc = docPorId.get(c.document_id);
              return (
                <li key={c.document_id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {doc?.title ?? 'Documento'}
                    <span className="text-[var(--color-tinta-suave)]"> v{doc?.version}</span>
                  </span>
                  <span className="shrink-0 text-[var(--color-tinta-suave)]">
                    {new Date(c.accepted_at).toLocaleDateString('pt-BR')}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-tinta-suave)]">Nenhum aceite registrado.</p>
        )}
      </section>

      <PainelConta email={user.email ?? ''} />
    </>
  );
}
