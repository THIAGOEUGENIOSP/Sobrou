/**
 * Formatação pt-BR. Fica aqui, junto das fórmulas, para que todas as telas
 * mostrem o mesmo número do mesmo jeito.
 *
 * Toda função aceita `null` e devolve "—". É o par do `safeDiv`: onde não há
 * resposta, a tela mostra um travessão em vez de um zero mentiroso.
 */

const VAZIO = '—';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * O Intl separa "R$" do número com espaço não quebrável (U+00A0). Ele some em
 * comparação de texto, em CSV e em teste. Normalizamos para espaço comum.
 */
function normalizar(texto: string): string {
  return texto.replace(/ /g, ' ').replace(/ /g, ' ');
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return normalizar(brl.format(value));
}

export function formatNumber(value: number | null | undefined, casas = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return normalizar(
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    }).format(value),
  );
}

/** R$ 0,41/km — preços por unidade usam 2 casas na tela, ainda que 4 no cálculo. */
export function formatRate(value: number | null | undefined, unidade: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return `${formatMoney(value)}/${unidade}`;
}

export function formatPercent(value: number | null | undefined, casas = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return `${formatNumber(value, casas)}%`;
}

/** +15,56% — com sinal explícito, para comparações entre períodos. */
export function formatVariacao(value: number | null | undefined, casas = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  const sinal = value > 0 ? '+' : '';
  return `${sinal}${formatNumber(value, casas)}%`;
}

export function formatKm(value: number | null | undefined, casas = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return `${formatNumber(value, casas)} km`;
}

export function formatLitros(value: number | null | undefined, casas = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return `${formatNumber(value, casas)} L`;
}

export function formatConsumo(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  return `${formatNumber(value, 1)} km/L`;
}

/** 4,25 horas → "4h15". */
export function formatHoras(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return VAZIO;
  const total = Math.round(value * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
