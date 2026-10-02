import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatHoras, formatKm, formatMoney, formatPercent, formatRate, medias } from '@sobrou/finance';
import { carregarContexto } from '@/lib/dados/contexto';
import { carregarPainelMeta, type PainelMeta } from '@/lib/meta/dados';
import { can } from '@/lib/entitlements';
import { BotaoSino } from '@/components/cabecalho';
import { AutoAtualizar, FormularioMetaHoje, FormularioMetaMes } from './formularios';
import { Barra, Cartao, COR_FAROL, Indicador, Linha, nomeDoMes, rotuloData } from './ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meta do Mês — Sobrou' };

export default async function MetaDoMesPage() {
  const ctx = await carregarContexto();
  if (!ctx.veiculo) redirect('/onboarding');

  if (!(await can('goals'))) {
    return (
      <>
        <h1 className="mb-4 text-xl font-bold">Meta do Mês</h1>
        <Cartao className="text-center">
          <p className="font-medium">A Meta do Mês faz parte do plano Premium.</p>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            O painel e os relatórios continuam mostrando tudo o que você registra.
          </p>
        </Cartao>
      </>
    );
  }

  const p = await carregarPainelMeta(ctx);
  const mes = nomeDoMes(p.mes);

  return (
    <>
      <AutoAtualizar />
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Meta do Mês</h1>
        <div className="flex items-center gap-1">
          <Link href="/app/meta/ajustes" aria-label="Configurar meta" className="flex h-9 items-center rounded-full px-3 text-sm text-[var(--color-tinta-suave)]">
            Configurar
          </Link>
          <BotaoSino />
        </div>
      </div>

      <CartaoMetaHoje p={p} />

      {p.alvo === null ? (
        <Cartao className="mb-6">
          <h2 className="mb-1 font-semibold">Qual é a sua meta de {mes}?</h2>
          <p className="mb-4 text-sm text-[var(--color-tinta-suave)]">
            Com ela, o app calcula sozinho quanto falta, a meta de cada dia e a projeção do mês.
          </p>
          <FormularioMetaMes mes={p.mes} valorAtual={null} />
        </Cartao>
      ) : (
        p.plano && <CartaoMetaMes p={p} />
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/app/meta/registrar"
          className="col-span-2 flex min-h-14 items-center justify-center rounded-[var(--radius-botao)] bg-[var(--color-marca)] px-6 text-lg font-bold text-white"
        >
          + Registrar trabalho
        </Link>
        <Link
          href="/app/meta/registrar?print=1"
          className="flex min-h-12 items-center justify-center rounded-[var(--radius-botao)] border border-[var(--color-borda)] px-3 text-center text-sm font-semibold"
        >
          Importar print da Uber
        </Link>
        <Link
          href="/app/meta/historico"
          className="flex min-h-12 items-center justify-center rounded-[var(--radius-botao)] border border-[var(--color-borda)] px-3 text-center text-sm font-semibold"
        >
          Histórico e gráficos
        </Link>
      </div>

      <CardsDoMes p={p} />
      <CartaoLucro p={p} />
      {p.plano && <RitmoEProjecao p={p} />}
    </>
  );
}

function CartaoMetaHoje({ p }: { p: PainelMeta }) {
  const d = p.metaHoje;
  const m = medias({ ...p.totaisHoje, diasTrabalhados: 1 });

  return (
    <Cartao className="mb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-wider text-[var(--color-tinta-suave)]">META DE HOJE</h2>
        {d && (
          <span className="tabular text-sm text-[var(--color-tinta-suave)]">
            {formatMoney(d.meta)} {p.metaManualHoje !== null ? '· manual' : '· automática'}
          </span>
        )}
      </div>

      {!d ? (
        <p className="py-2 text-sm text-[var(--color-tinta-suave)]">
          {p.alvo === null
            ? 'Defina a meta do mês abaixo (ou uma meta só para hoje) para ver quanto falta.'
            : 'Hoje não está nos seus dias de trabalho. Se for rodar, defina uma meta para hoje.'}
        </p>
      ) : d.atingida ? (
        <>
          <p className="text-3xl font-extrabold text-[var(--color-positivo)]">META BATIDA ✅</p>
          <p className="tabular mt-1 text-lg font-semibold">
            {formatMoney(d.faturado)} / {formatMoney(d.meta)} · {formatPercent(d.percentual, 0)}
          </p>
          <p className="tabular text-sm text-[var(--color-positivo)]">Excedente: +{formatMoney(d.excedente)}</p>
        </>
      ) : (
        <>
          <p className="text-sm text-[var(--color-tinta-suave)]">Faltam</p>
          <p className="tabular text-5xl font-extrabold leading-tight">{formatMoney(d.restante)}</p>
          <p className="tabular mb-3 text-sm text-[var(--color-tinta-suave)]">
            {formatMoney(d.faturado)} de {formatMoney(d.meta)} · {formatPercent(d.percentual, 0)}
          </p>
        </>
      )}

      {d && (
        <div className="mt-2">
          <Barra percentual={d.percentual} atingida={d.atingida} rotulo="Progresso da meta de hoje" />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini rotulo="Horas" valor={formatHoras(p.totaisHoje.horas || null)} />
        <Mini rotulo="R$/hora" valor={formatMoney(m.porHora)} farol={p.farois.porHora} />
        <Mini rotulo="R$/km" valor={formatMoney(m.porKm)} farol={p.farois.porKm} />
      </dl>

      {d && !d.atingida && d.horasRestantes !== null && (
        <p className="mt-3 text-center text-sm">
          ≈ <strong className="tabular">{formatHoras(d.horasRestantes)}</strong> para bater no ritmo de hoje
          {p.previsaoHorario && (
            <>
              {' '}
              · previsão <strong className="tabular">{p.previsaoHorario}</strong>
            </>
          )}
        </p>
      )}

      {p.alertas.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {p.alertas.map((a) => (
            <li
              key={a.texto}
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background:
                  a.tipo === 'positivo' ? 'var(--color-positivo-suave)' : a.tipo === 'atencao' ? 'var(--color-alerta-suave)' : 'var(--color-info-suave)',
                color: a.tipo === 'positivo' ? 'var(--color-positivo)' : a.tipo === 'atencao' ? 'var(--color-alerta)' : 'var(--color-info)',
              }}
            >
              {a.texto}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/app/meta/corrida"
          className="flex min-h-12 items-center justify-center rounded-[var(--radius-botao)] bg-[var(--color-papel-suave)] text-sm font-semibold"
        >
          Modo Corrida
        </Link>
        {p.aberto ? (
          <Link
            href="/app/turno/fechar"
            className="flex min-h-12 items-center justify-center rounded-[var(--radius-botao)] bg-[var(--color-papel-suave)] text-sm font-semibold"
          >
            Encerrar trabalho
          </Link>
        ) : (
          <Link
            href="/app/turno"
            className="flex min-h-12 items-center justify-center rounded-[var(--radius-botao)] bg-[var(--color-papel-suave)] text-sm font-semibold"
          >
            Iniciar turno
          </Link>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer py-2 text-center text-sm text-[var(--color-tinta-suave)]">Ajustar meta de hoje</summary>
        <div className="pt-2">
          <FormularioMetaHoje data={p.dia} manual={p.metaManualHoje} automatica={p.plano?.metaHojeAutomatica ?? null} />
        </div>
      </details>
    </Cartao>
  );
}

function Mini({ rotulo, valor, farol }: { rotulo: string; valor: string; farol?: PainelMeta['farois']['porHora'] }) {
  return (
    <div className="rounded-xl py-2" style={{ background: farol ? COR_FAROL[farol].fundo : 'var(--color-papel-suave)' }}>
      <dt className="text-xs text-[var(--color-tinta-suave)]">{rotulo}</dt>
      <dd className="tabular font-bold" style={farol ? { color: COR_FAROL[farol].cor } : undefined}>
        {valor}
      </dd>
    </div>
  );
}

function CartaoMetaMes({ p }: { p: PainelMeta }) {
  const pr = p.plano!.progresso;
  return (
    <Cartao className="mb-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold tracking-wider text-[var(--color-tinta-suave)]">META DE {nomeDoMes(p.mes).toUpperCase()}</h2>
        <Link href="/app/meta/ajustes" className="text-xs text-[var(--color-marca)]">
          Editar
        </Link>
      </div>
      <p className="tabular text-2xl font-extrabold">{formatMoney(pr.alvo)}</p>
      <p className="tabular mb-2 mt-2 text-sm">
        <strong>{formatMoney(pr.realizado)}</strong>
        <span className="text-[var(--color-tinta-suave)]"> / {formatMoney(pr.alvo)}</span>
      </p>
      <Barra percentual={pr.percentual} atingida={pr.atingida} rotulo="Progresso da meta do mês" />
      <p className="mt-2 flex justify-between text-sm">
        <span className="tabular text-[var(--color-tinta-suave)]">{formatPercent(pr.percentual)} concluído</span>
        {pr.atingida ? (
          <strong className="text-[var(--color-positivo)]">Meta do mês batida</strong>
        ) : (
          <span className="tabular font-semibold">Faltam {formatMoney(pr.restante)}</span>
        )}
      </p>
    </Cartao>
  );
}

function CardsDoMes({ p }: { p: PainelMeta }) {
  const t = p.totaisMes;
  const m = medias({ ...t, diasTrabalhados: p.diasTrabalhados });
  return (
    <section className="mb-6">
      <h2 className="mb-3 font-semibold">Desempenho em {nomeDoMes(p.mes)}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Indicador rotulo="Faturamento" valor={formatMoney(t.faturamento)} />
        <Indicador rotulo="Horas online" valor={formatHoras(t.horas || null)} />
        <Indicador rotulo="R$/hora" valor={formatMoney(m.porHora)} farol={p.faroisMes.porHora} />
        <Indicador rotulo="KM rodados" valor={formatKm(t.km || null, 2)} />
        <Indicador rotulo="R$/km" valor={formatMoney(m.porKm)} farol={p.faroisMes.porKm} />
        <Indicador rotulo="Dias trabalhados" valor={String(p.diasTrabalhados)} />
      </div>
      {p.recortadoPeloPlano && (
        <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">Parte do mês ficou fora do histórico do seu plano.</p>
      )}
    </section>
  );
}

function CartaoLucro({ p }: { p: PainelMeta }) {
  const l = p.lucroMes;
  return (
    <Cartao className="mb-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">Lucro real estimado do mês</h2>
        <Link href="/app/meta/ajustes#custos" className="text-xs text-[var(--color-marca)]">
          Custos
        </Link>
      </div>
      <p className="mb-2 text-xs text-[var(--color-tinta-suave)]">Faturamento não é lucro: aqui sai o custo de rodar.</p>
      <dl>
        <Linha rotulo="Receita bruta" valor={formatMoney(l.receitaBruta)} />
        <Linha rotulo="Combustível" valor={`− ${formatMoney(l.combustivel)}`} />
        <Linha rotulo="Outros custos (manutenção, pneus, revisão, despesas)" valor={`− ${formatMoney(l.outrosCustos)}`} />
        <Linha rotulo="Custo total" valor={formatMoney(l.custoTotal)} />
        <div className="my-1 border-t border-[var(--color-borda)]" />
        <Linha
          rotulo="Lucro líquido estimado"
          forte
          valor={<span style={{ color: l.lucro >= 0 ? 'var(--color-positivo)' : 'var(--color-alerta)' }}>{formatMoney(l.lucro)}</span>}
        />
        <Linha rotulo="Lucro por hora" valor={<span className="inline-flex items-center gap-1.5">{formatRate(l.lucroPorHora, 'h')}</span>} />
        <Linha rotulo="Lucro por km" valor={formatRate(l.lucroPorKm, 'km')} />
      </dl>
      {p.config.origemManutencao === 'nenhuma' && p.config.custosPorKm.pneus + p.config.custosPorKm.revisao + p.config.custosPorKm.outros === 0 && (
        <p className="mt-2 text-xs text-[var(--color-aviso)]">
          Só o combustível está sendo descontado.{' '}
          <Link href="/app/meta/ajustes#custos" className="underline">
            Informe os custos por km
          </Link>{' '}
          para um lucro mais real.
        </p>
      )}
    </Cartao>
  );
}

function RitmoEProjecao({ p }: { p: PainelMeta }) {
  const pl = p.plano!;
  const atual = pl.cenarios.find((c) => c.chave === 'atual')!;
  return (
    <>
      <details className="cartao mb-4 p-5" open>
        <summary className="cursor-pointer font-semibold">Ritmo da Meta</summary>
        <dl className="mt-3">
          <Linha rotulo="Meta mensal" valor={formatMoney(pl.progresso.alvo)} />
          <Linha rotulo="Já faturado" valor={formatMoney(pl.progresso.realizado)} />
          <Linha rotulo="Quanto falta" valor={formatMoney(pl.progresso.restante)} forte />
          <Linha rotulo="Dias trabalhados" valor={p.diasTrabalhados} />
          <Linha rotulo="Dias restantes no mês" valor={pl.diasRestantesNoMes} />
          <Linha rotulo="Próximos dias de trabalho" valor={pl.proximosDias.length} />
          <Linha rotulo="Meta por próximo dia" valor={formatMoney(pl.metaPorProximoDia)} forte />
          <Linha rotulo="Horas estimadas necessárias" valor={formatHoras(pl.horasNecessarias)} />
          <Linha rotulo="KM estimados necessários" valor={formatKm(pl.kmNecessarios, 0)} />
        </dl>

        {pl.proximosDias.length > 0 && (
          <>
            <h3 className="mb-2 mt-4 text-sm font-semibold">Próximos dias</h3>
            <ul className="space-y-2">
              {pl.proximosDias.slice(0, 4).map((d) => (
                <li key={d.data} className="rounded-xl p-3" style={{ background: 'var(--color-papel-suave)' }}>
                  <p className="text-sm font-semibold">{rotuloData(d.data)}</p>
                  <p className="tabular text-sm">
                    Mínima <strong>{formatMoney(d.minima)}</strong> · Ideal <strong>{formatMoney(d.ideal)}</strong>
                  </p>
                  <p className="tabular text-xs text-[var(--color-tinta-suave)]">
                    ≈ {formatHoras(d.horasEstimadas)} · {formatKm(d.kmEstimados, 0)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
              Ideal = com folga de um dia para imprevisto. Quem passa da meta hoje diminui as próximas; quem fica abaixo
              redistribui o que faltou. <Link href="/app/meta/ajustes" className="underline">Mudar dias de trabalho</Link>
            </p>
          </>
        )}
      </details>

      <details className="cartao mb-4 p-5">
        <summary className="cursor-pointer font-semibold">Projeção</summary>
        {pl.medias.porHora === null ? (
          <p className="mt-3 text-sm text-[var(--color-tinta-suave)]">Registre pelo menos um dia de trabalho para ver a projeção.</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-[var(--color-tinta-suave)]">No seu ritmo atual</p>
            <dl>
              <Linha rotulo="R$/hora médio" valor={formatMoney(atual.porHora)} />
              <Linha rotulo="R$/km médio" valor={formatMoney(atual.porKm)} />
              <Linha rotulo="Faturamento projetado" valor={formatMoney(atual.faturamentoProjetado)} forte />
              <Linha rotulo="Horas para atingir a meta" valor={formatHoras(atual.horasParaMeta)} />
              <Linha rotulo="KM para atingir a meta" valor={formatKm(atual.kmParaMeta, 0)} />
            </dl>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {pl.cenarios.map((c) => (
                <div key={c.chave} className="rounded-xl p-2" style={{ background: 'var(--color-papel-suave)' }}>
                  <p className="text-xs font-semibold">{c.rotulo}</p>
                  <p className="tabular text-sm font-bold">{formatMoney(c.faturamentoProjetado)}</p>
                  <p className="tabular text-[11px] text-[var(--color-tinta-suave)]">{formatMoney(c.porHora)}/h</p>
                  <p className="tabular text-[11px] text-[var(--color-tinta-suave)]">{formatHoras(c.horasParaMeta)} p/ meta</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--color-tinta-suave)]">
              Conservador e Excelente: 15% abaixo e acima da sua média real. Projeção = já faturado + sua média por dia
              trabalhado × dias de trabalho que faltam.
            </p>
          </>
        )}
      </details>
    </>
  );
}
