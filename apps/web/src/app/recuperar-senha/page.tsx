'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { recuperarSenha } from '@/lib/auth/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export default function RecuperarSenhaPage() {
  const [estado, acao] = useActionState(recuperarSenha, {});

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <Link href="/entrar" className="text-sm text-[var(--color-marca)]">
        ← Voltar
      </Link>
      <h1 className="mt-6 mb-1 text-2xl font-bold">Recuperar senha</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Informe o e-mail da conta e enviaremos um link para criar uma senha nova.
      </p>

      <form action={acao} noValidate>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

        <Campo
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          erro={estado.campos?.email}
        />

        <BotaoEnviar>Enviar link</BotaoEnviar>
      </form>
    </main>
  );
}
