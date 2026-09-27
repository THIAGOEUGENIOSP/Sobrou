'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PERIODOS, type ChavePeriodo } from '@/lib/relatorios/periodo';

/** Seletor de período. Os atalhos cobrem o uso diário; a data solta é a exceção. */
export function FiltrosPeriodo({ atual }: { atual: ChavePeriodo }) {
  const router = useRouter();
  const params = useSearchParams();
  const [aberto, setAberto] = useState(atual === 'personalizado');
  const [de, setDe] = useState(params.get('de') ?? '');
  const [ate, setAte] = useState(params.get('ate') ?? '');

  function ir(chave: ChavePeriodo) {
    setAberto(false);
    router.push(`/app/relatorios?periodo=${chave}`);
  }

  function aplicar() {
    if (!de || !ate) return;
    router.push(`/app/relatorios?periodo=personalizado&de=${de}&ate=${ate}`);
  }

  return (
    <div className="mb-6">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {PERIODOS.map((p) => (
          <button
            key={p.chave}
            type="button"
            onClick={() => ir(p.chave)}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap"
            style={
              atual === p.chave
                ? { background: 'var(--color-marca)', color: '#fff' }
                : { background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }
            }
          >
            {p.rotulo}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap"
          style={
            atual === 'personalizado'
              ? { background: 'var(--color-marca)', color: '#fff' }
              : { background: 'var(--color-papel-suave)', color: 'var(--color-tinta-suave)' }
          }
        >
          Escolher datas
        </button>
      </div>

      {aberto && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-[var(--color-tinta-suave)]">De</span>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-3 py-2.5 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-[var(--color-tinta-suave)]">Até</span>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-3 py-2.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={aplicar}
            disabled={!de || !ate}
            className="rounded-full bg-[var(--color-marca)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
