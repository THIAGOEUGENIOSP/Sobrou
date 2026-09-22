'use client';

import { useState, useTransition } from 'react';
import { exportarCSV, exportarExcel, type ResultadoExport } from '@/lib/relatorios/exportar';
import { Aviso } from '@/components/formulario';

/**
 * Botões de exportação.
 *
 * O botão aparece para todo mundo e a negativa vem do servidor. É de
 * propósito: quem está no plano grátis descobre que o recurso existe, e a
 * regra continua sendo aplicada onde importa.
 */
export function BotoesExportar({
  de,
  ate,
  rotulo,
}: {
  de: string;
  ate: string;
  rotulo: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function baixar(gerar: () => Promise<ResultadoExport>) {
    setErro(null);
    iniciar(async () => {
      const r = await gerar();
      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      const binario = atob(r.conteudoBase64);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

      const url = URL.createObjectURL(new Blob([bytes], { type: r.tipo }));
      const a = document.createElement('a');
      a.href = url;
      a.download = r.nome;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <section className="mb-4">
      <h2 className="mb-1 font-semibold">Exportar</h2>
      <p className="mb-3 text-sm text-[var(--color-tinta-suave)]">
        {rotulo}, dia a dia, com os totais conferidos.
      </p>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={pendente}
          onClick={() => baixar(() => exportarCSV(de, ate))}
          className="rounded-full border border-[var(--color-borda)] px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {pendente ? 'Gerando…' : 'CSV'}
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => baixar(() => exportarExcel(de, ate))}
          className="rounded-full border border-[var(--color-borda)] px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {pendente ? 'Gerando…' : 'Excel'}
        </button>
      </div>
    </section>
  );
}
