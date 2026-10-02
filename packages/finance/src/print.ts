/**
 * Leitura do texto de um print do resumo de ganhos (Uber e parecidos).
 *
 * O OCR roda no navegador e entrega texto cru, com erros. Este parser só
 * devolve um campo quando ele foi encontrado com segurança — perto da palavra
 * que o identifica, ou sem ambiguidade. O que ficar em dúvida volta como
 * `null` (com as opções encontradas, quando houver) e o motorista preenche.
 * Nada daqui é salvo sem passar pela tela de confirmação.
 */

export interface LeituraPrint {
  valor: number | null;
  /** Valores em reais encontrados quando não deu para saber qual é o total. */
  valoresCandidatos: number[];
  minutosOnline: number | null;
  viagens: number | null;
  /** YYYY-MM-DD */
  data: string | null;
  km: number | null;
}

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function numeroBR(texto: string): number {
  return Number(texto.replace(/\./g, '').replace(',', '.'));
}

function normalizar(texto: string): string {
  return texto
    .replace(/[  ]/g, ' ')
    // OCR troca "R$" por "RS", "R5", "R §"...
    .replace(/\bR\s?[S5§$]\s?(?=\d)/g, 'R$ ')
    .replace(/[ \t]+/g, ' ');
}

const RE_VALOR = /R\$ ?(\d{1,3}(?:\.\d{3})*,\d{2})/g;

export function lerTextoDoPrint(textoBruto: string, anoPadrao: number): LeituraPrint {
  const texto = normalizar(textoBruto);
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // --- valor ganho -----------------------------------------------------
  const todos = [...texto.matchAll(RE_VALOR)].map((m) => numeroBR(m[1]!));
  const distintos = [...new Set(todos)];
  let valor: number | null = null;

  const ancora = /(ganhos?|total|faturamento|voc[eê] (?:ganhou|recebeu))/i;
  for (let i = 0; i < linhas.length && valor === null; i++) {
    if (!ancora.test(linhas[i]!)) continue;
    // Valor na mesma linha ou na seguinte (o app costuma pôr o total embaixo).
    for (const alvo of [linhas[i]!, linhas[i + 1] ?? '']) {
      const m = [...alvo.matchAll(RE_VALOR)];
      if (m.length === 1) {
        valor = numeroBR(m[0]![1]!);
        break;
      }
    }
  }
  if (valor === null && distintos.length === 1) valor = distintos[0]!;

  // --- tempo online ----------------------------------------------------
  const reTempo = /(\d{1,2}) ?h(?:oras?)? ?(\d{1,2}) ?m(?:in)?|(\d{1,2}) ?h(?:oras?)?\b|(\d{1,3}) ?min/i;
  const minutosDe = (m: RegExpMatchArray): number => {
    if (m[1] !== undefined) return Number(m[1]) * 60 + Number(m[2]);
    if (m[3] !== undefined) return Number(m[3]) * 60;
    return Number(m[4]);
  };
  let minutosOnline: number | null = null;
  for (let i = 0; i < linhas.length && minutosOnline === null; i++) {
    if (!/online|tempo|conectado/i.test(linhas[i]!)) continue;
    for (const alvo of [linhas[i]!, linhas[i + 1] ?? '']) {
      const m = alvo.match(reTempo);
      if (m) {
        minutosOnline = minutosDe(m);
        break;
      }
    }
  }

  // --- viagens ---------------------------------------------------------
  let viagens: number | null = null;
  const v1 = texto.match(/(\d{1,3}) ?(?:viagens?|corridas?)\b/i);
  const v2 = texto.match(/(?:viagens?|corridas?)\s*[:\n ]\s*(\d{1,3})\b/i);
  if (v1) viagens = Number(v1[1]);
  else if (v2) viagens = Number(v2[1]);

  // --- data ------------------------------------------------------------
  let data: string | null = null;
  const d1 = texto.match(/\b(\d{1,2}) (?:de )?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?(?: (?:de )?(\d{4}))?/i);
  const d2 = texto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  const montar = (dia: number, mes: number, ano: number) =>
    dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12
      ? `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      : null;
  if (d1) {
    data = montar(Number(d1[1]), MESES[d1[2]!.toLowerCase().slice(0, 3)]!, d1[3] ? Number(d1[3]) : anoPadrao);
  } else if (d2) {
    const ano = d2[3] ? (d2[3].length === 2 ? 2000 + Number(d2[3]) : Number(d2[3])) : anoPadrao;
    data = montar(Number(d2[1]), Number(d2[2]), ano);
  }

  // --- km --------------------------------------------------------------
  const kms = [...texto.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?) ?km\b/gi)].map((m) => numeroBR(m[1]!.replace('.', ',')));
  const km = new Set(kms).size === 1 ? kms[0]! : null;

  return {
    valor,
    valoresCandidatos: valor === null ? distintos.sort((a, b) => b - a).slice(0, 4) : [],
    minutosOnline,
    viagens,
    data,
    km,
  };
}
