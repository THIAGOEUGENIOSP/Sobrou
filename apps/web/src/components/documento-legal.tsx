import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';

/**
 * Renderiza o documento legal vigente direto do banco.
 *
 * O texto e a versão ficam em `legal_documents`, e o aceite do usuário aponta
 * para a versão exata que ele leu. Guardar o texto no código faria o consentimento
 * apontar para um documento que já mudou.
 */

/** Markdown mínimo: títulos, listas e parágrafos. Não vale a pena uma dependência. */
function renderizar(markdown: string) {
  const blocos = markdown.split('\n\n');

  return blocos.map((bloco, i) => {
    const texto = bloco.trim();
    if (!texto) return null;

    if (texto.startsWith('## ')) {
      return (
        <h2 key={i} className="mt-8 mb-2 text-lg font-semibold">
          {texto.slice(3)}
        </h2>
      );
    }
    if (texto.startsWith('# ')) {
      return (
        <h1 key={i} className="mb-4 text-2xl font-bold">
          {texto.slice(2)}
        </h1>
      );
    }
    if (texto.startsWith('- ')) {
      return (
        <ul key={i} className="my-2 list-disc space-y-1 pl-5">
          {texto.split('\n').map((linha, j) => (
            <li key={j}>{linha.replace(/^-\s*/, '')}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="my-3 leading-relaxed">
        {texto}
      </p>
    );
  });
}

export async function DocumentoLegal({ kind }: { kind: Enums<'legal_doc_kind'> }) {
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('legal_documents')
    .select('title, version, content_md, effective_at')
    .eq('kind', kind)
    .eq('is_current', true)
    .maybeSingle();

  if (!doc) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm text-[var(--color-marca)]">
        ← Voltar
      </Link>

      <article className="mt-6">{renderizar(doc.content_md)}</article>

      <p className="mt-10 border-t border-[var(--color-borda)] pt-4 text-sm text-[var(--color-tinta-suave)]">
        Versão {doc.version}, vigente desde{' '}
        {new Date(doc.effective_at).toLocaleDateString('pt-BR')}.
      </p>
    </main>
  );
}
