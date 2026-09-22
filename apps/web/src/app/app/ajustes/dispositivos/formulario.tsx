'use client';

import { useActionState, useState } from 'react';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';
import { criarToken, revogarToken, type EstadoToken } from '@/lib/dispositivos/actions';

export interface AparelhoNaTela {
  id: string;
  nome: string;
  prefixo: string;
  criadoEm: string;
  ultimoUso: string | null;
}

/**
 * O token aparece uma vez só.
 *
 * O banco guarda apenas o hash, então nem o servidor consegue mostrá-lo de
 * novo. É de propósito: token que o servidor consegue reler é token que vaza
 * junto com o backup. O preço é este bloco — grande, difícil de ignorar, com
 * botão de copiar — porque quem fechar a tela sem copiar vai ter que gerar
 * outro.
 */
export function Aparelhos({ aparelhos }: { aparelhos: AparelhoNaTela[] }) {
  const [estado, acao] = useActionState<EstadoToken, FormData>(criarToken, {});
  const [copiado, setCopiado] = useState(false);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência o motorista seleciona à mão —
      // o token está visível na tela, então não há o que salvar aqui.
    }
  }

  return (
    <>
      {estado.token && (
        <section className="mb-8 rounded-[var(--radius-cartao)] border-2 border-[var(--color-marca)] p-4">
          <h2 className="font-semibold">Copie agora</h2>
          <p className="mt-1 mb-3 text-sm text-[var(--color-tinta-suave)]">
            Este código não volta a aparecer. Cole no KM Legal em Ajustes → Conectar ao Sobrou.
          </p>
          <code className="block overflow-x-auto rounded-xl bg-[var(--color-papel-suave)] p-3 font-mono text-sm break-all">
            {estado.token}
          </code>
          <button
            type="button"
            onClick={() => copiar(estado.token!)}
            className="mt-3 w-full rounded-full border border-[var(--color-marca)] px-4 py-2 text-sm font-semibold text-[var(--color-marca)]"
          >
            {copiado ? 'Copiado' : 'Copiar código'}
          </button>
        </section>
      )}

      <form action={acao} className="mb-10">
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

        <Campo
          label="Nome do aparelho"
          name="nome"
          placeholder="Meu celular"
          maxLength={60}
          required
          erro={estado.campos?.nome}
        />
        <BotaoEnviar>Conectar aparelho</BotaoEnviar>
      </form>

      <h2 className="mb-3 font-semibold">Aparelhos conectados</h2>

      {aparelhos.length === 0 ? (
        <p className="text-sm text-[var(--color-tinta-suave)]">
          Nenhum ainda. Conecte um para o KM Legal mandar as corridas para cá e puxar o seu custo
          por km real.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          {aparelhos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{a.nome}</span>
                <span className="block text-xs text-[var(--color-tinta-suave)]">
                  {a.prefixo}… · conectado em {a.criadoEm} ·{' '}
                  {a.ultimoUso ? `último envio ${a.ultimoUso}` : 'nunca enviou nada'}
                </span>
              </span>
              <form action={revogarToken} className="shrink-0">
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="rounded-full border border-[var(--color-borda)] px-3 py-1.5 text-sm text-[var(--color-alerta)]"
                >
                  Revogar
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
