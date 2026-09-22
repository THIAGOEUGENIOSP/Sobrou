/** Tipos compartilhados pelas fórmulas. Espelham o schema do banco. */

export type FuelKind = 'gasolina' | 'etanol' | 'gnv' | 'diesel' | 'outro';
export type ReserveKind = 'veiculo' | 'emergencia';
export type MovementDirection = 'credito' | 'debito';
export type FuelPriceMode = 'ultimo' | 'media_ponderada_30d';

/** Um abastecimento, como sai da tabela `fuel_entries`. */
export interface FuelEntry {
  id: string;
  filledAt: Date | string;
  fuelKind: FuelKind;
  /** Litros abastecidos. Sempre > 0. */
  litros: number;
  valorBruto: number;
  desconto: number;
  cashback: number;
  /** O que efetivamente saiu do bolso na bomba. */
  valorPago: number;
  odometro: number | null;
  tanqueCheio: boolean;
}

/** Faturamento de uma plataforma dentro do turno. */
export interface ShiftRevenue {
  categoryId: string;
  categoryName?: string;
  valor: number;
  qtdCorridas?: number | null;
}

/** Percentuais de distribuição. A soma precisa ser exatamente 100. */
export interface AllocationConfig {
  pctDisponivel: number;
  pctEmergencia: number;
  pctVeiculo: number;
}

/** Movimento do livro-razão das reservas. */
export interface ReserveMovement {
  reserveKind: ReserveKind;
  direction: MovementDirection;
  valor: number;
  occurredOn?: Date | string;
}

/** Dados do veículo usados no custo por km. */
export interface VehicleCostBasis {
  valorCompra?: number | null;
  valorResidualEstimado?: number | null;
  vidaUtilKm?: number | null;
  seguroMensal?: number | null;
  custosFixosMensais?: number | null;
  kmMedioMensal?: number | null;
  /** Estimativa manual de manutenção por km, usada enquanto não há histórico. */
  manutencaoKmEstimada?: number | null;
}
