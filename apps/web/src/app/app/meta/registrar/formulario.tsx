'use client';

import { useActionState, useMemo, useState } from 'react';
import { formatHoras, formatMoney, lerTextoDoPrint, type LeituraPrint } from '@sobrou/finance';
import { registrarSessao } from '@/lib/meta/actions';
import { Aviso, BotaoEnviar, Campo, CampoMoeda } from '@/components/formulario';

type Modo = 'horario' | 'direto';

function minutosEntre(inicio: string, fim: string): number | null {
  const a = inicio.match(/^(\d{2}):(\d{2})$/);
  const b = fim.match(/^(\d{2}):(\d{2})$/);
  if (!a || !b) return null;
  let m = Number(b[1]) * 60 + Number(b[2]) - (Number(a[1]) * 60 + Number(a[2]));
  if (m <= 0) m += 24 * 60;
  return m;
}

function lerNum(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function paraHHMM(min: number): string {
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

export function FormularioRegistrar({
  hoje,
  categorias,
  categoriaPadrao,
  odometroAtual,
  abrirPrint,
}: {
  hoje: string;
  categorias: Array<{ id: string; name: string }>;
  categoriaPadrao: string;
  odometroAtual: number | null;
  abrirPrint: boolean;
}) {
  const [estado, acao] = useActionState(registrarSessao, {});
  const [modo, setModo] = useState<Modo>('direto');
  // `chave` remonta os campos quando o print preenche valores novos.
  const [chave, setChave] = useState(0);
  const [inicial, setInicial] = useState<{ data: string; valor: number | null; tempo: string; viagens: string; km: string }>({
    data: hoje,
    valor: null,
    tempo: '',
    viagens: '',
    km: '',
  });
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [odoIni, setOdoIni] = useState(odometroAtual !== null ? String(odometroAtual) : '');
  const [odoFim, setOdoFim] = useState('');
  const [valor, setValor] = useState<number | null>(null);
  const [tempo, setTempo] = useState('');
  const [km, setKm] = useState('');

  const minutos = modo === 'horario' && inicio && fim ? minutosEntre(inicio, fim) : null;
  const kmCalc = modo === 'horario' ? (() => {
    const a = lerNum(odoIni);
    const b = lerNum(odoFim);
    return a !== null && b !== null && b >= a ? Math.round((b - a) * 100) / 100 : null;
  })() : null;

  const previa = useMemo(() => {
    const t = tempo.trim() ? lerTempo(tempo) : minutos;
    const k = kmCalc ?? lerNum(km);
    if (!valor) return null;
    return {
      porHora: t ? valor / (t / 60) : null,
      porKm: k ? valor / k : null,
      horas: t ? t / 60 : null,
    };
  }, [valor, tempo, minutos, kmCalc, km]);

  function aplicarPrint(r: LeituraPrint) {
    setInicial({
      data: r.data ?? hoje,
      valor: r.valor,
      tempo: r.minutosOnline !== null ? paraHHMM(r.minutosOnline) : '',
      viagens: r.viagens !== null ? String(r.viagens) : '',
      km: r.km !== null ? String(r.km).replace('.', ',') : '',
    });
    setValor(r.valor);
    setTempo(r.minutosOnline !== null ? paraHHMM(r.minutosOnline) : '');
    setKm(r.km !== null ? String(r.km).replace('.', ',') : '');
    setModo('direto');
    setChave((c) => c + 1);
  }

  return (
    <>
      <LeitorDePrint abrir={abrirPrint} ano={Number(hoje.slice(0, 4))} aoConfirmar={aplicarPrint} />

      <form action={acao} noValidate key={chave}>
        {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl p-1" style={{ background: 'var(--color-papel-suave)' }} role="tablist">
          {(
            [
              ['direto', 'Tempo + KM'],
              ['horario', 'Início e fim'],
            ] as const
          ).map(([m, r]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modo === m}
              onClick={() => setModo(m)}
              className="rounded-lg py-2 text-sm font-semibold"
              style={modo === m ? { background: 'var(--color-papel-elevado)' } : { color: 'var(--color-tinta-suave)' }}
            >
              {r}
            </button>
          ))}
        </div>

        <Campo label="Data" name="data" type="date" max={hoje} defaultValue={inicial.data} required erro={estado.campos?.data} />

        <CampoMoeda
          label="Faturamento Uber"
          name="valor"
          required
          valorInicial={inicial.valor}
          onValorChange={setValor}
          erro={estado.campos?.valor}
        />

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Plataforma</span>
          <select
            name="category_id"
            defaultValue={categoriaPadrao}
            className="w-full rounded-xl border border-[var(--color-borda)] bg-[var(--color-papel-suave)] px-4 py-3 text-base"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {modo === 'horario' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Hora de início" name="hora_inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              <Campo label="Hora de término" name="hora_fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="KM inicial do veículo" name="odo_inicial" inputMode="decimal" value={odoIni} onChange={(e) => setOdoIni(e.target.value)} erro={estado.campos?.odo_inicial} />
              <Campo label="KM final do veículo" name="odo_final" inputMode="decimal" value={odoFim} onChange={(e) => setOdoFim(e.target.value)} erro={estado.campos?.odo_final} />
            </div>
            <p className="-mt-2 mb-4 text-sm text-[var(--color-tinta-suave)]">
              Tempo trabalhado: <strong className="tabular">{minutos ? formatHoras(minutos / 60) : '—'}</strong> · KM rodados:{' '}
              <strong className="tabular">{kmCalc !== null ? `${kmCalc.toLocaleString('pt-BR')} km` : '—'}</strong>
            </p>
          </>
        )}

        <Campo
          label={modo === 'horario' ? 'Tempo online (se diferente do horário)' : 'Tempo online'}
          name="tempo_online"
          placeholder="2:21"
          inputMode="numeric"
          defaultValue={inicial.tempo}
          onChange={(e) => setTempo(e.target.value)}
          erro={estado.campos?.tempo_online}
        />

        {(
          <Campo
            label={modo === 'direto' ? 'KM rodados' : 'KM rodados (se não tiver o KM do veículo)'}
            name="km"
            inputMode="decimal"
            placeholder="28,82"
            defaultValue={inicial.km}
            onChange={(e) => setKm(e.target.value)}
            erro={estado.campos?.km}
          />
        )}

        <Campo label="Quantidade de viagens (opcional)" name="qtd_corridas" inputMode="numeric" defaultValue={inicial.viagens} erro={estado.campos?.qtd_corridas} />

        <CampoMoeda label="Combustível abastecido no dia (opcional)" name="combustivel" erro={estado.campos?.combustivel} />
        <p className="-mt-3 mb-4 text-xs text-[var(--color-tinta-suave)]">
          Em branco, o combustível é estimado pelo seu consumo e pelo preço do último abastecimento.
        </p>

        <Campo label="Observações" name="notes" maxLength={240} />

        {previa && (
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl p-3 text-center" style={{ background: 'var(--color-papel-suave)' }}>
            <div>
              <p className="text-xs text-[var(--color-tinta-suave)]">Horas</p>
              <p className="tabular font-bold">{formatHoras(previa.horas)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-tinta-suave)]">R$/hora</p>
              <p className="tabular font-bold">{formatMoney(previa.porHora)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-tinta-suave)]">R$/km</p>
              <p className="tabular font-bold">{formatMoney(previa.porKm)}</p>
            </div>
          </div>
        )}

        <BotaoEnviar>Salvar e ver o resumo</BotaoEnviar>
      </form>
    </>
  );
}

function lerTempo(t: string): number | null {
  const s = t.trim().toLowerCase().replace(/\s/g, '');
  let m = s.match(/^(\d{1,2})[:h](\d{1,2})(?:min|m)?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = s.match(/^(\d{1,2})h$/);
  if (m) return Number(m[1]) * 60;
  m = s.match(/^(\d{1,4})(?:min|m)?$/);
  return m ? Number(m[1]) : null;
}

/**
 * Importar print: o OCR roda no próprio celular (tesseract.js), a imagem não
 * sai do aparelho. O que foi lido aparece para conferir — só o que foi
 * identificado com segurança vai para o formulário, e nada é salvo sem o
 * motorista apertar "Salvar".
 */
function LeitorDePrint({ abrir, ano, aoConfirmar }: { abrir: boolean; ano: number; aoConfirmar: (r: LeituraPrint) => void }) {
  const [aberto, setAberto] = useState(abrir);
  const [status, setStatus] = useState<'parado' | 'lendo' | 'pronto' | 'erro'>('parado');
  const [progresso, setProgresso] = useState(0);
  const [leitura, setLeitura] = useState<LeituraPrint | null>(null);

  async function ler(arquivo: File) {
    setStatus('lendo');
    setProgresso(0);
    setLeitura(null);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgresso(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(arquivo);
      await worker.terminate();
      setLeitura(lerTextoDoPrint(data.text, ano));
      setStatus('pronto');
    } catch {
      setStatus('erro');
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mb-4 w-full rounded-[var(--radius-botao)] border border-dashed border-[var(--color-borda)] py-3 text-sm font-semibold"
      >
        📷 Importar print da Uber
      </button>
    );
  }

  const campos: Array<[string, string | null]> = leitura
    ? [
        ['Valor ganho', leitura.valor !== null ? formatMoney(leitura.valor) : null],
        ['Tempo online', leitura.minutosOnline !== null ? formatHoras(leitura.minutosOnline / 60) : null],
        ['Viagens', leitura.viagens !== null ? String(leitura.viagens) : null],
        ['Data', leitura.data ? leitura.data.split('-').reverse().join('/') : null],
        ['Quilometragem', leitura.km !== null ? `${leitura.km.toLocaleString('pt-BR')} km` : null],
      ]
    : [];

  return (
    <section className="cartao mb-5 p-4">
      <h2 className="mb-1 font-semibold">Importar print da Uber</h2>
      <p className="mb-3 text-xs text-[var(--color-tinta-suave)]">
        Envie a captura do resumo de ganhos. A leitura acontece no seu celular.
      </p>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ler(f);
        }}
        className="mb-3 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-marca)] file:px-4 file:py-2 file:font-semibold file:text-white"
      />
      {status === 'lendo' && <p className="text-sm">Lendo o print… {progresso > 0 && `${progresso}%`}</p>}
      {status === 'erro' && (
        <p className="text-sm text-[var(--color-alerta)]">Não consegui ler a imagem. Confira a conexão (o leitor baixa na 1ª vez) ou preencha à mão.</p>
      )}
      {status === 'pronto' && leitura && (
        <>
          <p className="mb-2 text-sm font-medium">Confira o que foi identificado:</p>
          <dl className="mb-3 space-y-1 text-sm">
            {campos.map(([rotulo, v]) => (
              <div key={rotulo} className="flex justify-between gap-3">
                <dt className="text-[var(--color-tinta-suave)]">{rotulo}</dt>
                <dd className={v ? 'tabular font-semibold' : 'text-[var(--color-tinta-suave)]'}>{v ?? 'não identificado'}</dd>
              </div>
            ))}
          </dl>
          {leitura.valor === null && leitura.valoresCandidatos.length > 0 && (
            <p className="mb-3 text-xs text-[var(--color-aviso)]">
              Encontrei {leitura.valoresCandidatos.map(formatMoney).join(', ')} e não deu para saber qual é o total — digite o
              valor no formulário.
            </p>
          )}
          <button
            type="button"
            onClick={() => aoConfirmar(leitura)}
            className="w-full rounded-full bg-[var(--color-marca)] px-6 py-3 font-semibold text-white"
          >
            Usar estes valores
          </button>
          <p className="mt-2 text-center text-xs text-[var(--color-tinta-suave)]">
            Só os itens identificados vão para o formulário. Você ainda confere antes de salvar.
          </p>
        </>
      )}
    </section>
  );
}
