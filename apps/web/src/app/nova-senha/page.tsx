'use client';

import { useActionState } from 'react';
import { definirNovaSenha } from '@/lib/auth/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export default function NovaSenhaPage() {
  const [estado, acao] = useActionState(definirNovaSenha, {});

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-bold">Criar nova senha</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Escolha uma senha com pelo menos 8 caracteres.
      </p>

      <form action={acao} noValidate>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

        <Campo
          label="Nova senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          erro={estado.campos?.senha}
        />
        <Campo
          label="Repita a nova senha"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          erro={estado.campos?.confirmacao}
        />

        <BotaoEnviar>Salvar senha</BotaoEnviar>
      </form>
    </main>
  );
}
