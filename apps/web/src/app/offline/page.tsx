export const metadata = { title: 'Sem conexão — Sobrou' };

/**
 * Página servida pelo service worker quando não há rede.
 *
 * É estática de propósito: precisa estar no cache antes de acontecer a queda,
 * e não pode depender de nenhum dado do usuário.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12 text-center">
      <h1 className="mb-2 text-2xl font-bold">Sem conexão</h1>
      <p className="mb-6 text-[var(--color-tinta-suave)]">
        Você está numa área sem sinal. O Sobrou precisa de internet para salvar seus
        lançamentos — assim que a rede voltar, é só recarregar.
      </p>

      <div className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] bg-[var(--color-papel-suave)] p-4 text-left text-sm">
        <p className="mb-1 font-medium">Enquanto isso</p>
        <p className="text-[var(--color-tinta-suave)]">
          Anote o hodômetro e o valor no papel ou nas notas do celular. Quando voltar, você lança
          tudo com a data e a hora certas — o app aceita registro retroativo.
        </p>
      </div>
    </main>
  );
}
