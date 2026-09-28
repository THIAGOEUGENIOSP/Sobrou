'use client';

import { useEffect, useState } from 'react';
import { segundosTrabalhados } from '@sobrou/finance';

/**
 * Tempo decorrido do turno, descontando pausas.
 *
 * Conta a partir do horário gravado no servidor, não de um contador local:
 * se o motorista fechar o app ou o celular descarregar, ao voltar o número
 * continua certo. Quando o turno está pausado, o relógio para de andar sem
 * precisar de nada especial no servidor — a pausa em si já é o que impede o
 * segundo de subir.
 *
 * Sem cartão colorido: no mockup o cronômetro é só texto, junto do resto do
 * cabeçalho — quem carrega cor é o cartão de faturamento, embaixo.
 */
export function Cronometro({
  inicio,
  pausedSeconds,
  pausedAt,
}: {
  inicio: string;
  pausedSeconds: number;
  pausedAt: string | null;
}) {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    setAgora(Date.now());
    if (pausedAt) return; // parado: não precisa de intervalo re-renderizando à toa.
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pausedAt]);

  // Na primeira renderização no servidor não há relógio do cliente; mostramos
  // um traço em vez de um valor que mudaria na hidratação.
  const segundos =
    agora === null ? null : segundosTrabalhados(inicio, new Date(agora), pausedSeconds, pausedAt);
  const texto = segundos === null ? '—' : formatar(segundos);

  return (
    <div className="py-2 text-center">
      <p className="tabular text-5xl font-extrabold tracking-tight">{texto}</p>
      <p className="mt-1 text-sm font-medium text-[var(--color-tinta-suave)]">
        {pausedAt ? 'Pausado' : 'Tempo de turno'}
      </p>
    </div>
  );
}

function formatar(segundos: number): string {
  const total = Math.floor(segundos);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
