import Link from 'next/link';
import { formatHoras, formatKm, formatMoney, formatPercent, formatRate, medias, progressoMeta } from '@sobrou/finance';
import type { ResumoDia } from '@/lib/meta/dados';
import { Barra, COR_FAROL, Linha, nomeDoMes, PontoFarol, rotuloData } from '../ui';

/** Resumo do dia + "Como foi seu dia". Usado na tela de resumo e no fim do turno. */
export function BlocoResumo({ r, compacto = false }: { r: ResumoDia; compacto?: boolean }) {
  const t = r.totais;
  const m = medias({ ...t, diasTrabalhados: 1 });
  const mes = r.alvo !== null ? progressoMeta(r.acumuladoMes, r.alvo) : null;
  const geral = r.avaliacao.geral;

  return (
    <>
      {!compacto && (
        <section className="cartao mb-4 p-5">
          <h2 className="mb-2 font-semibold">Resumo de {rotuloData(r.data)}</h2>
          <dl>
            <Linha rotulo="Você trabalhou" valor={formatHoras(t.horas || null)} />
            <Linha rotulo="Rodou" valor={formatKm(t.km || null, 2)} />
            {t.corridas !== null && <Linha rotulo="Viagens" valor={t.corridas} />}
            <Linha rotulo="Faturou" valor={formatMoney(t.faturamento)} forte />
            <Linha rotulo="R$/hora" valor={<Farolado f={r.farois.porHora}>{formatMoney(m.porHora)}</Farolado>} />
            <Linha rotulo="R$/km" valor={<Farolado f={r.farois.porKm}>{formatMoney(m.porKm)}</Farolado>} />
            <Linha rotulo="Custos estimados" valor={formatMoney(r.lucro.custoTotal)} />
            <Linha
              rotulo="Lucro líquido estimado"
              forte
              valor={<span style={{ color: r.lucro.lucro >= 0 ? 'var(--color-positivo)' : 'var(--color-alerta)' }}>{formatMoney(r.lucro.lucro)}</span>}
            />
            <Linha rotulo="Lucro por hora" valor={<Farolado f={r.farois.lucroPorHora}>{formatRate(r.lucro.lucroPorHora, 'h')}</Farolado>} />
          </dl>
        </section>
      )}

      {(r.meta || mes) && (
        <section className="cartao mb-4 p-5">
          {r.meta && (
            <>
              <h2 className="mb-1 font-semibold">Meta do dia</h2>
              <p className="tabular text-sm">
                {formatMoney(r.meta.faturado)} de {formatMoney(r.meta.meta)} ·{' '}
                {r.meta.atingida ? (
                  <strong className="text-[var(--color-positivo)]">+{formatMoney(r.meta.excedente)} acima</strong>
                ) : (
                  <strong className="text-[var(--color-alerta)]">−{formatMoney(r.meta.restante)} abaixo</strong>
                )}
              </p>
              <div className="mb-4 mt-2">
                <Barra percentual={r.meta.percentual} atingida={r.meta.atingida} rotulo="Meta do dia" />
              </div>
            </>
          )}
          {mes && (
            <dl>
              <Linha rotulo={`Meta de ${nomeDoMes(r.mes)}`} valor={formatMoney(mes.alvo)} />
              <Linha rotulo="Acumulado" valor={formatMoney(mes.realizado)} />
              <Linha rotulo="Meta concluída" valor={formatPercent(mes.percentual)} />
              <Linha rotulo="Falta" valor={formatMoney(mes.restante)} forte />
            </dl>
          )}
          {r.proximoDia && mes && !mes.atingida && (
            <p className="mt-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--color-info-suave)', color: 'var(--color-info)' }}>
              Próximo dia de trabalho ({rotuloData(r.proximoDia.data)}): meta de {formatMoney(r.proximoDia.minima)} — já recalculada.
            </p>
          )}
        </section>
      )}

      <section
        className="mb-4 rounded-[var(--radius-cartao)] p-5"
        style={{ background: geral ? COR_FAROL[geral].fundo : 'var(--color-papel-suave)' }}
      >
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-tinta-suave)]">Como foi seu dia</h2>
        <p className="text-xl font-bold" style={geral ? { color: COR_FAROL[geral].cor } : undefined}>
          {geral ? `${COR_FAROL[geral].emoji} ` : ''}
          {r.avaliacao.titulo}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {r.avaliacao.itens.map((i) => (
            <li key={i.chave} className="flex items-center gap-2">
              <PontoFarol farol={i.farol} />
              {i.chave === 'porHora' ? 'R$/hora' : i.chave === 'porKm' ? 'R$/km' : 'Lucro por hora'}:{' '}
              {i.farol ? COR_FAROL[i.farol].rotulo.toLowerCase() : 'sem dado'}
            </li>
          ))}
        </ul>
        <Link href="/app/meta/ajustes#farois" className="mt-2 inline-block text-xs underline text-[var(--color-tinta-suave)]">
          Mudar os limites
        </Link>
      </section>
    </>
  );
}

function Farolado({ f, children }: { f: ResumoDia['farois']['porHora']; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <PontoFarol farol={f} />
      {children}
    </span>
  );
}
