'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { cadastrar } from '@/lib/auth/actions';
import { Aviso, BotaoEnviar, Campo } from '@/components/formulario';

export default function CadastroPage() {
  const [estado, acao] = useActionState(cadastrar, {});

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <Link href="/" className="text-sm text-[var(--color-marca)]">
        ← Sobrou
      </Link>
      <h1 className="mt-6 mb-1 text-2xl font-bold">Criar conta</h1>
      <p className="mb-6 text-sm text-[var(--color-tinta-suave)]">
        Leva um minuto. Depois é só registrar o turno e ver o que sobrou.
      </p>

      <form action={acao} noValidate>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}

        <Campo
          label="Como quer ser chamado (opcional)"
          name="nome"
          autoComplete="name"
          erro={estado.campos?.nome}
        />
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
          autoComplete="new-password"
          minLength={8}
          required
          erro={estado.campos?.senha}
        />
        <Campo
          label="Repita a senha"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          erro={estado.campos?.confirmacao}
        />

        <label className="mb-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="aceite"
            required
            className="mt-1 size-5 shrink-0 accent-[var(--color-marca)]"
          />
          <span>
            Li e aceito os{' '}
            <Link href="/termos" className="text-[var(--color-marca)]" target="_blank">
              Termos de uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="text-[var(--color-marca)]" target="_blank">
              Política de privacidade
            </Link>
            .
            {estado.campos?.aceite && (
              <span className="mt-1 block text-[var(--color-alerta)]">{estado.campos.aceite}</span>
            )}
          </span>
        </label>

        <BotaoEnviar>Criar conta</BotaoEnviar>

        <p className="mt-6 text-sm text-[var(--color-tinta-suave)]">
          Já tem conta?{' '}
          <Link href="/entrar" className="text-[var(--color-marca)]">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}
