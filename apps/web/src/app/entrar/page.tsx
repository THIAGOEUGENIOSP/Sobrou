'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useActionState } from 'react';
import { entrar } from '@/lib/auth/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

function FormularioEntrar() {
  const proximo = useSearchParams().get('proximo') ?? '/app';
  const [estado, acao] = useActionState(entrar, {});

  return (
    <form action={acao} noValidate>
      <input type="hidden" name="proximo" value={proximo} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <Campo
        label="E-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        erro={estado.campos?.email}
      />
      <Campo
        label="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        erro={estado.campos?.senha}
      />

      <BotaoEnviar>Entrar</BotaoEnviar>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/recuperar-senha" className="text-[var(--color-marca)]">
          Esqueci minha senha
        </Link>
        <p className="text-[var(--color-tinta-suave)]">
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="text-[var(--color-marca)]">
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function EntrarPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <Link href="/" className="text-sm text-[var(--color-marca)]">
        ← Sobrou
      </Link>
      <h1 className="mt-6 mb-6 text-2xl font-bold">Entrar</h1>
      <Suspense fallback={null}>
        <FormularioEntrar />
      </Suspense>
    </main>
  );
}
