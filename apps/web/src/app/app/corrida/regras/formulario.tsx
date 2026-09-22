'use client';

import { useActionState } from 'react';
import { salvarRegras } from '@/lib/corridas/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export interface ValoresRegras {
  valor_min: string;
  rs_km_min: string;
  rs_hora_min: string;
  dist_max_busca: string;
  nota_min: string;
  margem_min: string;
}

/**
 * Regras do analisador (seção 11).
 *
 * Campo em branco significa "não use este critério". É por isso que nenhum
 * campo tem valor padrão sugerido: um piso que o motorista não escolheu faria
 * o app recusar corrida por uma regra que ele nem sabe que existe.
 */
export function FormularioRegras({ valores }: { valores: ValoresRegras }) {
  const [estado, acao] = useActionState(salvarRegras, {});

  return (
    <form action={acao} noValidate>
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

      <Campo
        label="Valor mínimo da corrida"
        name="valor_min"
        inputMode="decimal"
        placeholder="8,00"
        defaultValue={valores.valor_min}
        erro={estado.campos?.valor_min}
      />
      <Campo
        label="R$ por km mínimo"
        name="rs_km_min"
        inputMode="decimal"
        placeholder="1,80"
        defaultValue={valores.rs_km_min}
        erro={estado.campos?.rs_km_min}
      />
      <Campo
        label="R$ por hora mínimo"
        name="rs_hora_min"
        inputMode="decimal"
        placeholder="35,00"
        defaultValue={valores.rs_hora_min}
        erro={estado.campos?.rs_hora_min}
      />
      <Campo
        label="Distância máxima até o passageiro (km)"
        name="dist_max_busca"
        inputMode="decimal"
        placeholder="3"
        defaultValue={valores.dist_max_busca}
        erro={estado.campos?.dist_max_busca}
      />
      <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
        O trecho até buscar o passageiro é km rodado sem ninguém pagando. É onde a corrida
        costuma deixar de valer a pena.
      </p>

      <Campo
        label="Nota mínima do passageiro"
        name="nota_min"
        inputMode="decimal"
        placeholder="4,7"
        defaultValue={valores.nota_min}
        erro={estado.campos?.nota_min}
      />
      <Campo
        label="Margem mínima depois do custo"
        name="margem_min"
        inputMode="decimal"
        placeholder="10,00"
        defaultValue={valores.margem_min}
        erro={estado.campos?.margem_min}
      />
      <p className="-mt-2 mb-5 text-sm text-[var(--color-tinta-suave)]">
        Sem essa regra, o app ainda recusa corrida que dá prejuízo — mas não exige lucro mínimo.
      </p>

      <BotaoEnviar>Salvar regras</BotaoEnviar>
    </form>
  );
}
