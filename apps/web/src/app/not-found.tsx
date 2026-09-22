import Link from 'next/link';

export const metadata = { title: 'Página não encontrada — Sobrou' };

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-2xl font-bold">Página não encontrada</h1>
      <p className="mb-6 text-[var(--color-tinta-suave)]">
        O endereço não existe ou você não tem acesso a ele.
      </p>
      <Link
        href="/app"
        className="w-full rounded-full bg-[var(--color-marca)] px-6 py-3 font-semibold text-white"
      >
        Ir para o início
      </Link>
    </main>
  );
}
