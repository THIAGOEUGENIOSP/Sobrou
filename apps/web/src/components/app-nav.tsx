'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatMoney } from '@sobrou/finance';
import { BotaoSair } from '@/components/botao-sair';
import type { ItemRegistroRapido } from '@/lib/registro-rapido/dados';

/** Os 3 destinos ao redor do botão "+" central — sempre à mão. Os 2
 * primeiros ficam à esquerda dele, o último à direita. */
const ITENS_PRINCIPAIS = [
  { href: '/app', rotulo: 'Início', icone: 'casa' },
  { href: '/app/turno', rotulo: 'Turno', icone: 'turno' },
  { href: '/app/transacoes', rotulo: 'Transações', icone: 'transacoes' },
] as const;

/**
 * O resto — menos usado no dia a dia — mora atrás do botão "Mais", agrupado
 * por assunto e com uma frase curta em cada item. Motorista sem prática com
 * apps não decifra ícone sozinho; o nome + a frase dizem exatamente o que
 * ele vai encontrar lá dentro, sem precisar adivinhar ou tocar pra descobrir.
 */
type IconeMais = 'relatorios' | 'consultor' | 'metas' | 'reservas' | 'mensal' | 'posto';
type RotaMais =
  | '/app/relatorios'
  | '/app/consultor'
  | '/app/metas'
  | '/app/reservas'
  | '/app/mensal'
  | '/app/abastecimentos';

interface ItemMais {
  href: RotaMais;
  rotulo: string;
  subtitulo: string;
  icone: IconeMais;
}

interface GrupoMais {
  titulo: string;
  itens: ItemMais[];
}

const GRUPOS_MAIS: GrupoMais[] = [
  {
    titulo: 'Seu dia a dia',
    itens: [
      {
        href: '/app/relatorios',
        rotulo: 'Relatórios',
        subtitulo: 'Evolução, comparação com o período anterior',
        icone: 'relatorios',
      },
      {
        href: '/app/consultor',
        rotulo: 'Consultor',
        subtitulo: 'Dicas sobre o seu desempenho',
        icone: 'consultor',
      },
    ],
  },
  {
    titulo: 'Planejamento',
    itens: [
      {
        href: '/app/metas',
        rotulo: 'Metas',
        subtitulo: 'Acompanhe suas metas de ganho',
        icone: 'metas',
      },
      {
        href: '/app/reservas',
        rotulo: 'Reservas',
        subtitulo: 'Dinheiro guardado pro carro e emergência',
        icone: 'reservas',
      },
      {
        href: '/app/mensal',
        rotulo: 'Mês a mês',
        subtitulo: 'Compare seus meses',
        icone: 'mensal',
      },
    ],
  },
  {
    titulo: 'Abastecimento',
    itens: [
      {
        href: '/app/abastecimentos',
        rotulo: 'Postos',
        subtitulo: 'Seu histórico de abastecimentos',
        icone: 'posto',
      },
    ],
  },
];

const ITENS_MAIS: ItemMais[] = GRUPOS_MAIS.flatMap((g) => g.itens);

/** As 4 ações do botão "+" central — o "registro rápido" global do app. */
const ACOES_RAPIDAS = [
  {
    href: '/app/turno/ganho',
    rotulo: 'Adicionar ganho',
    descricao: 'Corrida / Plataforma',
    icone: 'ganho',
    cor: 'var(--color-positivo)',
    fundo: 'var(--color-positivo-suave)',
  },
  {
    href: '/app/abastecimentos/novo',
    rotulo: 'Abastecimento',
    descricao: 'Combustível',
    icone: 'posto',
    cor: 'var(--color-alerta)',
    fundo: 'var(--color-alerta-suave)',
  },
  {
    href: '/app/lancamentos/novo',
    rotulo: 'Despesa',
    descricao: 'Estacionamento, pedágio...',
    icone: 'despesa',
    cor: 'var(--color-info)',
    fundo: 'var(--color-info-suave)',
  },
  {
    href: '/app/manutencoes/nova',
    rotulo: 'Manutenção',
    descricao: 'Revisão, peças...',
    icone: 'manutencao',
    cor: 'var(--color-margem)',
    fundo: 'var(--color-margem-suave)',
  },
] as const;

type Icone =
  | (typeof ITENS_PRINCIPAIS)[number]['icone']
  | IconeMais
  | (typeof ACOES_RAPIDAS)[number]['icone']
  | 'mais';

const ICONES: Record<Icone, React.ReactNode> = {
  casa: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1v-9" />
    </>
  ),
  consultor: (
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.55.42.95.9 1.05 1.5l.05.7h5l.05-.7c.1-.6.5-1.08 1.05-1.5A6 6 0 0 0 12 3Z" />
  ),
  turno: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  posto: <path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3Z" />,
  reservas: (
    <>
      <rect x="3.5" y="10" width="17" height="9" rx="2" />
      <path d="M7 10V8a5 5 0 0 1 10 0v2" />
    </>
  ),
  relatorios: <path d="M4 19V10M10 19V5M16 19v-7M3 19h18" />,
  transacoes: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),
  metas: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  mensal: (
    <>
      <rect x="4" y="12" width="3.4" height="7" rx="0.8" />
      <rect x="10.3" y="7" width="3.4" height="12" rx="0.8" />
      <rect x="16.6" y="3.5" width="3.4" height="15.5" rx="0.8" />
    </>
  ),
  ganho: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="2.5" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M6.5 9v.01M17.5 15v.01" />
    </>
  ),
  despesa: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  manutencao: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
};

function IconeSvg({ id, tamanho = 20 }: { id: Icone; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONES[id]}
    </svg>
  );
}

/**
 * Cabeçalho simples + barra de navegação flutuante com botão "+" central.
 *
 * A barra tem 5 posições: Início, Turno, o "+" (ação rápida global, elevado
 * acima da barra), Relatórios e Mais. O "+" abre um bottom sheet com as 4
 * formas de registrar algo — ganho, abastecimento, despesa, manutenção — em
 * vez de decidir por você. O resto dos destinos, menos usados no dia a dia
 * (incluindo Transações), mora atrás do botão "Mais".
 */
export function AppNav({
  admin,
  registroRapido,
}: {
  admin: boolean;
  registroRapido: ItemRegistroRapido[];
}) {
  const [maisAberto, setMaisAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const pathname = usePathname();

  function ativo(href: string) {
    return href === '/app' ? pathname === '/app' : pathname.startsWith(href);
  }

  const algumItemMaisAtivo =
    ITENS_MAIS.some((i) => ativo(i.href)) ||
    ativo('/app/ajustes') ||
    ativo('/app/conta') ||
    (admin && ativo('/admin'));

  function fecharMais() {
    setMaisAberto(false);
  }

  function fecharNovo() {
    setNovoAberto(false);
  }

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <Link href="/app" className="text-lg font-bold">
          Sobrou
        </Link>
      </header>

      {/* Barra flutuante: não gruda nas bordas nem no rodapé — fica "suspensa",
          com espaço ao redor e sombra funda, pra parecer um objeto por cima do
          conteúdo, não uma tira colada na tela. O botão "+" fica elevado acima
          dela, como ação global de destaque. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }}
        aria-label="Navegação principal"
      >
        <div
          className="relative flex w-full max-w-lg items-stretch gap-1 rounded-[1.5rem] border p-1.5"
          style={{
            background: 'var(--color-papel-elevado)',
            borderColor: 'var(--color-borda)',
            boxShadow: '0 16px 36px -10px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          {ITENS_PRINCIPAIS.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] py-2 text-center"
              style={
                ativo(item.href)
                  ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                  : { color: 'var(--color-tinta-suave)' }
              }
            >
              <IconeSvg id={item.icone} />
              <span className="w-full truncate px-0.5 text-[0.63rem] font-medium leading-tight">
                {item.rotulo}
              </span>
            </Link>
          ))}

          {/* Vão embaixo do botão "+" elevado — sem link, só espaço reservado. */}
          <div className="flex-1" aria-hidden />

          {ITENS_PRINCIPAIS.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] py-2 text-center"
              style={
                ativo(item.href)
                  ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                  : { color: 'var(--color-tinta-suave)' }
              }
            >
              <IconeSvg id={item.icone} />
              <span className="w-full truncate px-0.5 text-[0.63rem] font-medium leading-tight">
                {item.rotulo}
              </span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-label="Mais opções"
            aria-haspopup="dialog"
            aria-expanded={maisAberto}
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] py-2 text-center"
            style={
              algumItemMaisAtivo
                ? { background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }
                : { color: 'var(--color-tinta-suave)' }
            }
          >
            <IconeSvg id="mais" />
            <span className="text-[0.63rem] font-medium leading-tight">Mais</span>
          </button>

          {/* Botão "+": ação rápida global, elevado acima da barra — o anel da
              cor do fundo da página cria o efeito de "recorte" contra a barra. */}
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            aria-label="Novo registro"
            aria-haspopup="dialog"
            aria-expanded={novoAberto}
            className="absolute left-1/2 flex h-14 w-14 items-center justify-center rounded-full text-white"
            style={{
              top: '-1.05rem',
              transform: 'translateX(-50%)',
              background: 'var(--color-marca)',
              border: '4px solid var(--color-papel)',
              boxShadow: '0 10px 26px -6px rgba(255, 107, 61, 0.55)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </nav>

      {novoAberto && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Novo registro">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/50"
            onClick={fecharNovo}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-[1.6rem] p-4 pb-[max(env(safe-area-inset-bottom,0px),1.25rem)] shadow-2xl"
            style={{ background: 'var(--color-papel)' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 flex-none rounded-full" style={{ background: 'var(--color-borda)' }} />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo registro</h2>
              <button type="button" onClick={fecharNovo} aria-label="Fechar" className="p-1" style={{ color: 'var(--color-tinta-suave)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ACOES_RAPIDAS.map((acao) => (
                <Link
                  key={acao.href}
                  href={acao.href}
                  onClick={fecharNovo}
                  className="flex flex-col items-start gap-3 rounded-[var(--radius-cartao)] p-4"
                  style={{ background: acao.fundo }}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[0.8rem]"
                    style={{ background: 'var(--color-papel)', color: acao.cor }}
                  >
                    <IconeSvg id={acao.icone} tamanho={20} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold" style={{ color: 'var(--color-tinta)' }}>
                      {acao.rotulo}
                    </span>
                    <span className="block text-xs" style={{ color: 'var(--color-tinta-suave)' }}>
                      {acao.descricao}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            {registroRapido.length > 0 && (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-tinta-suave)]">
                  Registro rápido
                </h3>
                <ul className="space-y-2">
                  {registroRapido.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-[var(--radius-cartao)] p-3"
                      style={{ background: 'var(--color-papel-suave)' }}
                    >
                      <span
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-[0.65rem] text-xs font-bold text-white"
                        style={{ background: item.cor ?? 'var(--color-tinta-fraca)' }}
                        aria-hidden
                      >
                        {item.titulo.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.titulo}</span>
                        <span className="block truncate text-xs text-[var(--color-tinta-suave)]">
                          {item.subtitulo}
                        </span>
                      </span>
                      <span
                        className="tabular flex-none text-sm font-semibold"
                        style={{
                          color:
                            item.tipo === 'entrada' ? 'var(--color-positivo)' : 'var(--color-alerta)',
                        }}
                      >
                        {item.tipo === 'saida' ? '− ' : ''}
                        {formatMoney(item.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {maisAberto && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Mais opções">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 bg-black/50"
            onClick={fecharMais}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-[1.6rem] p-2 pb-[max(env(safe-area-inset-bottom,0px),1rem)] shadow-2xl"
            style={{ background: 'var(--color-papel)' }}
          >
            <div className="mx-auto mb-1 h-1.5 w-10 flex-none rounded-full" style={{ background: 'var(--color-borda)' }} />

            <div className="flex items-center justify-between px-2 py-2">
              <span className="font-bold">Mais opções</span>
              <button type="button" onClick={fecharMais} aria-label="Fechar" className="p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="mb-1 space-y-4 overflow-y-auto px-1">
              {GRUPOS_MAIS.map((grupo) => (
                <div key={grupo.titulo}>
                  <h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-tinta-suave)]">
                    {grupo.titulo}
                  </h3>
                  <div className="space-y-1.5">
                    {grupo.itens.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={fecharMais}
                        className="flex items-center gap-3 rounded-[var(--radius-cartao)] p-3"
                        style={
                          ativo(item.href)
                            ? { background: 'var(--color-marca-suave)' }
                            : { background: 'var(--color-papel-suave)' }
                        }
                      >
                        <span
                          className="flex h-10 w-10 flex-none items-center justify-center rounded-[0.8rem]"
                          style={{
                            background: 'var(--color-papel-elevado)',
                            color: ativo(item.href) ? 'var(--color-marca)' : 'var(--color-tinta-suave)',
                          }}
                        >
                          <IconeSvg id={item.icone} tamanho={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-sm font-semibold"
                            style={{
                              color: ativo(item.href) ? 'var(--color-marca)' : 'var(--color-tinta)',
                            }}
                          >
                            {item.rotulo}
                          </span>
                          <span className="block truncate text-xs text-[var(--color-tinta-suave)]">
                            {item.subtitulo}
                          </span>
                        </span>
                        <span aria-hidden className="flex-none text-[var(--color-tinta-suave)]">
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <nav className="flex-1 overflow-y-auto p-1 pt-2">
              {/* "Admin" só aparece pra quem tem permissão — nunca pro usuário comum. */}
              {admin && (
                <Link
                  href="/admin"
                  onClick={fecharMais}
                  className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium"
                  style={{ color: 'var(--color-marca)' }}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/app/ajustes"
                onClick={fecharMais}
                className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                Ajustes
              </Link>
              <Link
                href="/app/conta"
                onClick={fecharMais}
                className="block rounded-[0.65rem] px-3 py-2.5 text-sm font-medium"
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                Conta
              </Link>
            </nav>

            <div className="border-t p-3" style={{ borderColor: 'var(--color-borda)' }}>
              <BotaoSair className="text-sm text-[var(--color-tinta-suave)]" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
