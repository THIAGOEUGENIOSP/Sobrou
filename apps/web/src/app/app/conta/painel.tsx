'use client';

import { useActionState, useState, useTransition } from 'react';
import { excluirMinhaConta, exportarMeusDados } from './acoes';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export function PainelConta({ email }: { email: string }) {
  const [exportando, iniciarExport] = useTransition();
  const [erroExport, setErroExport] = useState<string | null>(null);
  const [estadoExclusao, acaoExclusao] = useActionState(excluirMinhaConta, {});
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  function baixar() {
    setErroExport(null);
    iniciarExport(async () => {
      const r = await exportarMeusDados();
      if ('erro' in r) {
        setErroExport(r.erro);
        return;
      }
      const blob = new Blob([r.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kmlegal-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-1 font-semibold">Exportar meus dados</h2>
        <p className="mb-3 text-sm text-[var(--color-tinta-suave)]">
          Baixa tudo o que o KM Legal guarda sobre você em um arquivo JSON: veículos,
          abastecimentos, turnos, lançamentos, manutenções e reservas.
        </p>
        {erroExport && <Aviso tipo="erro">{erroExport}</Aviso>}
        <button
          type="button"
          onClick={baixar}
          disabled={exportando}
          className="w-full rounded-full border border-[var(--color-borda)] px-6 py-3 font-semibold disabled:opacity-60"
        >
          {exportando ? 'Preparando…' : 'Baixar meus dados'}
        </button>
      </section>

      <section className="rounded-[var(--radius-cartao)] border border-[var(--color-alerta)] p-4">
        <h2 className="mb-1 font-semibold text-[var(--color-alerta)]">Excluir minha conta</h2>
        <p className="mb-3 text-sm text-[var(--color-tinta-suave)]">
          Apaga a conta {email} e todo o histórico associado. Não há como desfazer. Se quiser
          guardar seus números, exporte os dados antes.
        </p>

        {!confirmandoExclusao ? (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="w-full rounded-full border border-[var(--color-alerta)] px-6 py-3 font-semibold text-[var(--color-alerta)]"
          >
            Quero excluir minha conta
          </button>
        ) : (
          <form action={acaoExclusao} noValidate>
            {estadoExclusao.erro && <Aviso tipo="erro">{estadoExclusao.erro}</Aviso>}
            <Campo
              label="Digite EXCLUIR para confirmar"
              name="confirmacao"
              autoComplete="off"
              required
            />
            <BotaoEnviar>Excluir definitivamente</BotaoEnviar>
            <button
              type="button"
              onClick={() => setConfirmandoExclusao(false)}
              className="mt-2 w-full px-6 py-3 text-sm text-[var(--color-tinta-suave)]"
            >
              Cancelar
            </button>
          </form>
        )}
      </section>
    </>
  );
}
