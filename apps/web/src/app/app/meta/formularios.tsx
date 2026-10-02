'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { salvarMetaDoDia, salvarMetaDoMes } from '@/lib/meta/actions';
import { Aviso, BotaoEnviar, CampoMoeda } from '@/components/formulario';

/** Recarrega os números do servidor de tempos em tempos enquanto a tela está aberta. */
export function AutoAtualizar({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, segundos * 1000);
    const aoVoltar = () => document.visibilityState === 'visible' && router.refresh();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [router, segundos]);
  return null;
}

export function FormularioMetaMes({ mes, valorAtual }: { mes: string; valorAtual: number | null }) {
  const [estado, acao] = useActionState(salvarMetaDoMes, {});
  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <div className="mb-4">
        <label htmlFor="campo-mes" className="mb-1 block text-sm font-medium">
          Mês
        </label>
        <input
          id="campo-mes"
          type="month"
          name="mes"
          defaultValue={mes.slice(0, 7)}
          required
          className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
        />
        {estado.campos?.mes && <p className="mt-1 text-sm text-[var(--color-alerta)]">{estado.campos.mes}</p>}
      </div>
      <CampoMoeda label="Meta de faturamento" name="target_value" valorInicial={valorAtual} required erro={estado.campos?.target_value} />
      <BotaoEnviar>Salvar meta</BotaoEnviar>
    </form>
  );
}

export function FormularioMetaHoje({
  data,
  manual,
  automatica,
}: {
  data: string;
  manual: number | null;
  automatica: number | null;
}) {
  const [estado, acao] = useActionState(salvarMetaDoDia, {});
  return (
    <div>
      <form action={acao} noValidate>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
        <input type="hidden" name="data" value={data} />
        <CampoMoeda label="Meta de hoje (manual)" name="target_value" valorInicial={manual} erro={estado.campos?.target_value} />
        <BotaoEnviar>Definir meta de hoje</BotaoEnviar>
      </form>
      {manual !== null && (
        <form action={acao} className="mt-2">
          <input type="hidden" name="data" value={data} />
          <input type="hidden" name="target_value" value="" />
          <button type="submit" className="w-full text-sm text-[var(--color-tinta-suave)] underline">
            Voltar para a meta automática
            {automatica !== null &&
              ` (${automatica.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`}
          </button>
        </form>
      )}
    </div>
  );
}
