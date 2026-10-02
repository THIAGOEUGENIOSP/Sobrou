import Link from 'next/link';
import {
  ALLOCATION_PADRAO,
  compararIndicador,
  formatConsumo,
  formatHoras,
  formatKm,
  formatMoney,
  formatPercent,
  formatRate,
  formatVariacao,
  type ChavePeriodo,
} from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarPeriodo } from '@/lib/relatorios/dados';
import { resolverPeriodoDoUsuario } from '@/lib/relatorios/periodo';
import { carregarMetas } from '@/lib/metas/dados';
import { can } from '@/lib/entitlements';
import { createClient } from '@/lib/supabase/server';
import { BotaoSino, LogoSobrou } from '@/components/cabecalho';
import { Confirmacao } from '@/components/confirmacao';
import { CartaoMetaHojePainel } from '@/app/app/meta/cartao-painel';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Painel — Sobrou' };

/** As 4 abas do painel — um subconjunto de `PERIODOS`, na ordem do painel de bordo. */
const ABAS_PAINEL: Array<{ chave: ChavePeriodo; rotulo: string }> = [
  { chave: 'hoje', rotulo: 'Diário' },
  { chave: 'semana', rotulo: 'Semanal' },
  { chave: 'mes', rotulo: 'Mensal' },
  { chave: 'ano', rotulo: 'Anual' },
];

function divisao(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

function saudacaoPorHora(hora: number): string {
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

const TITULO_SOBROU: Record<ChavePeriodo, string> = {
  hoje: 'Sobrou hoje',
  ontem: 'Sobrou ontem',
  sete_dias: 'Sobrou nos últimos 7 dias',
  trinta_dias: 'Sobrou nos últimos 30 dias',
  semana: 'Sobrou na semana',
  mes: 'Sobrou no mês',
  mes_anterior: 'Sobrou no mês passado',
  ano: 'Sobrou no ano',
  personalizado: 'Sobrou no período',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; ok?: string; valor?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await createClient();

  const chave = (ABAS_PAINEL.some((a) => a.chave === sp.periodo) ? sp.periodo : 'hoje') as ChavePeriodo;
  const periodo = resolverPeriodoDoUsuario(chave, ctx.timezone);
  const atual = await carregarPeriodo(periodo.de, periodo.ate);
  const t = atual.totais;
  const semDados = t.turnos === 0 && t.gastoCombustivelReal === 0;

  const podeComparar = await can('monthly_compare');
  const anterior = podeComparar
    ? (await carregarPeriodo(periodo.anterior.de, periodo.anterior.ate)).totais
    : null;
  const comparacaoDisponivel = anterior ? compararIndicador(t.disponivel, anterior.disponivel) : null;

  const horaLocal = Number(
    new Intl.DateTimeFormat('pt-BR', { timeZone: ctx.timezone, hour: 'numeric', hour12: false }).format(
      new Date(),
    ),
  );

  const { data: turnoAberto } = await supabase
    .from('shifts')
    .select('id, started_at')
    .eq('status', 'aberto')
    .maybeSingle();

  const { data: perfil } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', ctx.userId)
    .maybeSingle();
  const primeiroNome = perfil?.display_name?.trim().split(/\s+/)[0] ?? null;

  const podeUsarMetas = await can('goals');
  const metaDiaria =
    chave === 'hoje' && podeUsarMetas
      ? (await carregarMetas(ctx.timezone)).find((m) => m.meta.kind === 'fat_diaria')
      : undefined;
  const horasParaBaterMeta =
    metaDiaria && !metaDiaria.progresso.atingida && t.faturamentoPorHora && t.faturamentoPorHora > 0
      ? metaDiaria.progresso.restante / t.faturamentoPorHora
      : null;

  const { data: saldos } = await supabase
    .from('v_reserve_balances')
    .select('reserve_kind, saldo, total_creditado, total_gasto');

  const { data: percentuais } = await supabase
    .from('allocation_configs')
    .select('pct_disponivel, pct_emergencia, pct_veiculo')
    .order('valid_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  const saldoVeiculo = saldos?.find((s) => s.reserve_kind === 'veiculo');
  const saldoEmergencia = saldos?.find((s) => s.reserve_kind === 'emergencia');
  const pct = percentuais ?? {
    pct_disponivel: ALLOCATION_PADRAO.pctDisponivel,
    pct_emergencia: ALLOCATION_PADRAO.pctEmergencia,
    pct_veiculo: ALLOCATION_PADRAO.pctVeiculo,
  };

  const despesas = t.custoCombustivel + t.outrasDespesas;
  const margemPct = t.faturamento > 0 ? (t.resultadoOperacional / t.faturamento) * 100 : null;
  const qtd = t.qtdCorridas;

  const linhas = [
    {
      titulo: 'Faturamento',
      porViagem: qtd ? divisao(t.faturamento, qtd) : null,
      porHora: t.faturamentoPorHora,
      porKm: t.faturamentoPorKm,
      cor: 'var(--color-positivo)',
      corSuave: 'var(--color-positivo-suave)',
    },
    {
      titulo: 'Despesas',
      porViagem: qtd ? divisao(despesas, qtd) : null,
      porHora: divisao(despesas, t.horas),
      porKm: divisao(despesas, t.km),
      cor: 'var(--color-alerta)',
      corSuave: 'var(--color-alerta-suave)',
    },
    {
      // Lucro é dinheiro, então usa a mesma cor de "positivo" — verde é
      // sempre o que sobrou, nunca uma cor à parte (seção 2 do design system).
      titulo: 'Lucro',
      porViagem: qtd ? divisao(t.resultadoOperacional, qtd) : null,
      porHora: t.resultadoPorHora,
      porKm: t.resultadoPorKm,
      cor: 'var(--color-positivo)',
      corSuave: 'var(--color-positivo-suave)',
    },
  ];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <LogoSobrou />
        <BotaoSino />
      </div>

      {sp.ok === 'despesa' && sp.valor && (
        <Confirmacao fecharHref="/app">
          Despesa de R$ {sp.valor} lançada — já entra nas suas contas de hoje.
        </Confirmacao>
      )}

      <p className="text-sm" style={{ color: 'var(--color-tinta-suave)' }}>
        {primeiroNome ? `${saudacaoPorHora(horaLocal)}, ${primeiroNome}` : saudacaoPorHora(horaLocal)}
      </p>
      <h1 className="mb-4 text-2xl font-bold">Vamos pra cima hoje? 🚀</h1>

      {podeUsarMetas && <CartaoMetaHojePainel ctx={ctx} />}

      {turnoAberto ? (
        <Link
          href="/app/turno"
          className="cartao mb-5 flex items-center justify-between gap-3 p-4"
          style={{ borderColor: 'var(--color-marca)', background: 'var(--color-marca-suave)' }}
        >
          <span>
            <span className="block font-semibold" style={{ color: 'var(--color-marca-forte)' }}>
              Turno em andamento
            </span>
            <span className="block text-sm text-[var(--color-tinta-suave)]">
              Desde{' '}
              {new Date(turnoAberto.started_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Toque para finalizar.
            </span>
          </span>
          <span aria-hidden style={{ color: 'var(--color-marca-forte)' }}>
            →
          </span>
        </Link>
      ) : (
        <Link
          href="/app/turno"
          className="mb-5 block w-full rounded-full px-6 py-4 text-center font-semibold text-white"
          style={{ background: 'var(--color-marca)', boxShadow: 'var(--sombra-cartao)' }}
        >
          Iniciar turno
        </Link>
      )}

      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--color-tinta-suave)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
        {periodo.rotulo}
      </p>

      {/* Abas de período: mesma ideia de `PERIODOS`, um subconjunto fixo de 4, sem
          precisar de JS no cliente — é só navegação por link. */}
      <div
        className="mb-6 grid grid-cols-4 gap-1 rounded-full p-1"
        style={{ background: 'var(--color-papel-suave)' }}
      >
        {ABAS_PAINEL.map((a) => (
          <Link
            key={a.chave}
            href={`/app?periodo=${a.chave}`}
            className="rounded-full py-2 text-center text-sm font-medium"
            style={
              a.chave === chave
                ? { background: 'var(--color-marca)', color: '#fff' }
                : { color: 'var(--color-tinta-suave)' }
            }
          >
            {a.rotulo}
          </Link>
        ))}
      </div>

      {semDados ? (
        <div
          className="mb-8 rounded-[var(--radius-cartao)] p-6 text-center"
          style={{ background: 'var(--color-papel-suave)' }}
        >
          <p className="font-medium">Nada registrado {periodo.rotulo.toLowerCase()}.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Assim que você fechar um turno neste período, seus resultados aparecem aqui.
          </p>
        </div>
      ) : null}

      {/* Guia dos 4 passos: some assim que o motorista já fechou um turno hoje —
          nesse ponto ele já entendeu o fluxo na prática e não precisa mais do
          lembrete. Enquanto isso, é o primeiro texto que ele vê ao abrir o app. */}
      {chave === 'hoje' && semDados && <GuiaRapido />}

      {!semDados && (
        <>
          {/* Cartão único "Sobrou": a pergunta que importa primeiro é quanto ficou
              disponível, não o faturamento bruto — faturamento e custos+reservas
              entram como subinformação do mesmo cartão (seções 6–7 do script). */}
          <section className="mb-6">
            <div
              className="rounded-[var(--radius-cartao)] p-5"
              style={{ background: 'var(--color-positivo)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-black/70 uppercase">{TITULO_SOBROU[chave]}</p>
                {comparacaoDisponivel?.variacao !== null && comparacaoDisponivel?.variacao !== undefined && (
                  <span className="tabular flex items-center gap-0.5 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold text-black/80">
                    {comparacaoDisponivel.direcao === 'baixa' ? '↓' : '↑'}
                    {formatPercent(Math.abs(comparacaoDisponivel.variacao), 0)}
                  </span>
                )}
              </div>
              <p className="tabular mt-1 text-4xl font-extrabold text-black">
                {formatMoney(t.disponivel)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-3 text-sm text-black/70">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden>
                      <path d="M12 3s6 6.5 6 10.5a6 6 0 1 1-12 0C6 9.5 12 3 12 3Z" />
                    </svg>
                    <strong className="tabular truncate text-black">{formatMoney(t.faturamento)}</strong>
                  </span>
                  <span className="mt-0.5 block truncate">Faturamento</span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none" aria-hidden>
                      <path d="M4 15s1-8 8-12c0 0 3 5-1 9 1 1 2 1 3 0 1 3-1 7-5 7a5 5 0 0 1-5-4Z" />
                    </svg>
                    <strong className="tabular truncate text-black">{formatMoney(t.faturamento - t.disponivel)}</strong>
                  </span>
                  <span className="mt-0.5 block truncate">Custos + reservas</span>
                </span>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-3 gap-2">
            <CelulaIcone
              rotulo="por hora"
              valor={formatRate(t.faturamentoPorHora, 'h')}
              icone={
                <path d="M12 7v5l3.5 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              }
            />
            <CelulaIcone
              rotulo="por km"
              valor={formatRate(t.faturamentoPorKm, 'km')}
              icone={<path d="M4 16l4-8h2l-1.5 5H13l4-8h2l-5 11H12l1-3H9l-1 3H6l-2-3Z" />}
            />
            <CelulaIcone
              rotulo="km rodados"
              valor={formatKm(t.km, 0)}
              icone={<path d="M9 18h6M8 3h8l2 6H6l2-6ZM4 9h16l1 4H3l1-4ZM7 17v3M17 17v3" />}
            />
          </section>

          {chave === 'hoje' && metaDiaria && (
            <section
              className="mb-6 rounded-[var(--radius-cartao)] p-4"
              style={{ background: 'var(--color-papel-suave)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Meta do dia</p>
                <span
                  className="tabular rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={
                    metaDiaria.progresso.atingida
                      ? { background: 'var(--color-positivo-suave)', color: 'var(--color-positivo)' }
                      : { background: 'var(--color-marca-suave)', color: 'var(--color-marca-forte)' }
                  }
                >
                  {formatPercent(metaDiaria.progresso.percentual, 0)}
                </span>
              </div>
              <p className="tabular mt-2 text-lg font-bold">
                {formatMoney(metaDiaria.progresso.realizado)}{' '}
                <span className="text-sm font-normal text-[var(--color-tinta-suave)]">
                  de {formatMoney(metaDiaria.progresso.alvo)}
                </span>
              </p>
              <div
                role="progressbar"
                aria-label="Progresso da meta do dia"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(metaDiaria.progresso.percentual ?? 0))}
                className="mt-2 h-2 overflow-hidden rounded-full"
                style={{ background: 'var(--color-papel-elevado)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, metaDiaria.progresso.percentual ?? 0)}%`,
                    background: metaDiaria.progresso.atingida
                      ? 'var(--color-positivo)'
                      : 'var(--color-marca)',
                  }}
                />
              </div>
              {!metaDiaria.progresso.atingida && (
                <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
                  Faltam {formatMoney(metaDiaria.progresso.restante)}
                  {horasParaBaterMeta !== null && (
                    <> — no seu ritmo atual, ~{formatHoras(horasParaBaterMeta)} de trabalho</>
                  )}
                </p>
              )}
            </section>
          )}

          <section className="mb-6 grid grid-cols-3 gap-2">
            <CelulaResumo titulo="Viagens" valor={qtd !== null ? String(qtd) : '—'} />
            <CelulaResumo titulo="Horas" valor={formatHoras(t.horas)} />
            <CelulaResumo
              titulo="Margem"
              valor={margemPct !== null ? formatPercent(margemPct, 0) : '—'}
            />
          </section>

          <section className="mb-8 space-y-4">
            {linhas.map((l) => (
              <div key={l.titulo}>
                <p className="mb-2 text-sm font-semibold" style={{ color: l.cor }}>
                  {l.titulo}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <CelulaMetrica valor={formatMoney(l.porViagem)} rotulo="Por viagem" cor={l.cor} corSuave={l.corSuave} />
                  <CelulaMetrica valor={formatMoney(l.porHora)} rotulo="Por hora" cor={l.cor} corSuave={l.corSuave} />
                  <CelulaMetrica valor={formatMoney(l.porKm)} rotulo="Por km" cor={l.cor} corSuave={l.corSuave} />
                </div>
              </div>
            ))}
          </section>

          {atual.porPlataforma.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-semibold">Faturamento por aplicativo</h2>
              <ul className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
                {atual.porPlataforma.map((p) => (
                  <li key={p.nome} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: p.cor ?? 'var(--color-tinta-fraca)' }}
                        aria-hidden
                      />
                      <span className="truncate font-medium">{p.nome}</span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{formatMoney(p.valor)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Link
        href="/app/consultor"
        className="cartao mb-8 flex items-center gap-3 p-4"
        style={{ background: 'var(--color-aviso-suave)', borderColor: 'transparent' }}
      >
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[0.65rem]"
          style={{ background: 'var(--color-papel-elevado)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-aviso)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3V16h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" />
          </svg>
        </div>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Seu consultor</span>
          <span className="block text-xs text-[var(--color-tinta-suave)]">
            Leituras do seu histórico: custo, melhor dia, projeção do mês.
          </span>
        </span>
        <span aria-hidden className="flex-none text-[var(--color-aviso)]">→</span>
      </Link>

      <section aria-label="Reservas" className="mb-8">
        <h2 className="mb-3 font-semibold">Reservas</h2>
        <div className="grid grid-cols-2 gap-3">
          <CartaoReserva
            titulo="Reserva do carro"
            valor={formatMoney(saldoVeiculo?.saldo ?? 0)}
            detalhe={`${formatMoney(saldoVeiculo?.total_creditado ?? 0)} guardados · ${formatMoney(
              saldoVeiculo?.total_gasto ?? 0,
            )} já gastos`}
          />
          <CartaoReserva
            titulo="Emergência"
            valor={formatMoney(saldoEmergencia?.saldo ?? 0)}
            detalhe={`${formatMoney(saldoEmergencia?.total_creditado ?? 0)} guardados · ${formatMoney(
              saldoEmergencia?.total_gasto ?? 0,
            )} já gastos`}
          />
        </div>
      </section>

      <section aria-label="Configuração" className="mb-8">
        <h2 className="mb-3 font-semibold">Seu setup</h2>
        <dl className="divide-y divide-[var(--color-borda)] rounded-[var(--radius-cartao)] border border-[var(--color-borda)]">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Veículo</dt>
            <dd className="font-medium">{ctx.veiculo?.nickname ?? '—'}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Consumo de referência</dt>
            <dd className="tabular font-medium">{formatConsumo(ctx.veiculo?.consumo_ref_etanol)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Hodômetro</dt>
            <dd className="tabular font-medium">{formatKm(ctx.veiculo?.odometro_atual, 0)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-[var(--color-tinta-suave)]">Divisão do resultado</dt>
            <dd className="tabular font-medium">
              {pct.pct_disponivel}/{pct.pct_emergencia}/{pct.pct_veiculo}
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-sm text-[var(--color-tinta-suave)]">
        <Link href="/app/relatorios" className="text-[var(--color-marca)]">
          Ver relatório completo do período
        </Link>{' '}
        — plataforma detalhada, evolução dia a dia e comparação com o período anterior.
      </p>

      {atual.recortadoPeloPlano && (
        <p className="mt-4 text-xs text-[var(--color-tinta-suave)]">
          Seu plano mostra o histórico a partir de{' '}
          {new Date(`${atual.deEfetivo}T12:00:00`).toLocaleDateString('pt-BR')}; o período pedido
          começava antes disso.
        </p>
      )}
    </>
  );
}

/** Chip com ícone — usado no trio logo abaixo do cartão "Sobrou hoje". */
function CelulaIcone({
  rotulo,
  valor,
  icone,
}: {
  rotulo: string;
  valor: string;
  icone: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] p-3 text-center"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-marca)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mx-auto mb-1"
        aria-hidden
      >
        {icone}
      </svg>
      <p className="tabular font-bold">{valor}</p>
      <p className="text-xs text-[var(--color-tinta-suave)]">{rotulo}</p>
    </div>
  );
}

function CelulaResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] p-3 text-center"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <p className="text-xs text-[var(--color-tinta-suave)]">{titulo}</p>
      <p className="tabular mt-0.5 font-bold">{valor}</p>
    </div>
  );
}

/** Célula quadrada colorida por identidade da métrica (verde/vermelho/roxo) — usada no
 * bloco Faturamento/Despesas/Lucro × viagem/hora/km, no lugar de uma tabela em lista. */
function CelulaMetrica({
  valor,
  rotulo,
  cor,
  corSuave,
}: {
  valor: string;
  rotulo: string;
  cor: string;
  corSuave: string;
}) {
  return (
    <div className="rounded-[var(--radius-cartao)] p-3 text-center" style={{ background: corSuave }}>
      <p className="tabular font-bold" style={{ color: cor }}>
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-tinta-suave)]">{rotulo}</p>
    </div>
  );
}

function CartaoReserva({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-cartao)] border border-[var(--color-borda)] p-4"
      style={{ background: 'var(--color-papel-suave)' }}
    >
      <p className="text-sm text-[var(--color-tinta-suave)]">{titulo}</p>
      <p className="tabular mt-1 text-2xl font-bold">{valor}</p>
      <p className="mt-1 text-xs text-[var(--color-tinta-suave)]">{detalhe}</p>
    </div>
  );
}

const PASSOS_GUIA = [
  {
    titulo: 'Inicie seu turno',
    texto: 'Toque no botão laranja "Iniciar turno" assim que sair pra rodar.',
  },
  {
    titulo: 'Registre no botão "+"',
    texto: 'A cada corrida, abastecimento ou despesa, toque no "+" da barra de baixo.',
  },
  {
    titulo: 'Encerre no fim do dia',
    texto: 'Na aba "Turno", toque em "Encerrar turno" — o app fecha as contas sozinho.',
  },
  {
    titulo: 'Veja o que sobrou',
    texto: 'Volte pro Início ou toque em "Relatórios" pra entender seu ganho de verdade.',
  },
] as const;

/**
 * Guia dos 4 passos — a resposta pra "o que eu faço agora?" de quem nunca
 * usou um app assim. Fica só na aba "Hoje" e some sozinho assim que o
 * motorista fecha o primeiro turno do dia; não é um tutorial permanente,
 * é o empurrão do início.
 */
function GuiaRapido() {
  return (
    <section
      className="mb-8 rounded-[var(--radius-cartao)] p-4"
      style={{ background: 'var(--color-papel-suave)', border: '1px solid var(--color-borda)' }}
    >
      <h2 className="mb-3 font-semibold">Como usar o Sobrou, em 4 passos</h2>
      <ol className="space-y-3">
        {PASSOS_GUIA.map((passo, i) => (
          <li key={passo.titulo} className="flex items-start gap-3">
            <span
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold"
              style={{ background: 'var(--color-marca-suave)', color: 'var(--color-marca)' }}
              aria-hidden
            >
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-medium">{passo.titulo}</span>
              <span className="block text-sm text-[var(--color-tinta-suave)]">{passo.texto}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
