'use client';

import { useEffect, useState } from 'react';

/**
 * Tempo decorrido do turno.
 *
 * Conta a partir do horário gravado no servidor, não de um contador local:
 * se o motorista fechar o app ou o celular descarregar, ao voltar o número
 * continua certo.
 */
export function Cronometro({ inicio }: { inicio: string }) {
  const desde = new Date(inicio).getTime();
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Na primeira renderização no servidor não há relógio do cliente; mostramos
  // um traço em vez de um valor que mudaria na hidratação.
  const texto = agora === null ? '—' : formatar(Math.max(agora - desde, 0));

  return (
    <div
      className="rounded-[var(--radius-cartao)] p-6 text-center"
      style={{ background: 'var(--color-marca)' }}
    >
      <p className="text-sm font-medium text-black/70">Tempo rodando</p>
      <p className="tabular mt-1 text-4xl font-extrabold text-black">{texto}</p>
    </div>
  );
}

function formatar(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
