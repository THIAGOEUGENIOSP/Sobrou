'use server';

import ExcelJS from 'exceljs';
import { formatConsumo, formatMoney, formatRate } from '@sobrou/finance';
import { carregarPeriodo } from './dados';
import { can } from '@/lib/entitlements';
import { consumirCota, mensagemDeCota } from '@/lib/cota';
import { createClient, requireUser } from '@/lib/supabase/server';

/**
 * Exportação CSV e Excel (seção 19).
 *
 * A checagem de plano acontece AQUI, no servidor. Esconder o botão não é
 * controle de acesso: quem conhece a rota a chama direto.
 */

export type ResultadoExport =
  | { ok: true; nome: string; tipo: string; conteudoBase64: string }
  | { ok: false; erro: string };

interface Linha {
  Data: string;
  KM: number;
  Horas: number;
  Faturamento: number;
  'Custo combustível': number;
  'Outras despesas': number;
  'Resultado operacional': number;
  'Reserva do carro': number;
  'Reserva emergência': number;
  Disponível: number;
}

async function montarLinhas(de: string, ate: string) {
  const dados = await carregarPeriodo(de, ate);

  const linhas: Linha[] = dados.turnos.map((t) => ({
    Data: t.work_date,
    KM: Number(t.snap_km ?? 0),
    Horas: Number(t.snap_horas ?? 0),
    Faturamento: Number(t.snap_faturamento ?? 0),
    'Custo combustível': Number(t.snap_custo_combustivel ?? 0),
    'Outras despesas': Number(t.snap_outras_despesas ?? 0),
    'Resultado operacional': Number(t.snap_resultado_op ?? 0),
    'Reserva do carro': Number(t.snap_reserva_veiculo ?? 0),
    'Reserva emergência': Number(t.snap_reserva_emerg ?? 0),
    Disponível: Number(t.snap_disponivel ?? 0),
  }));

  return { dados, linhas };
}

/** Escapa um campo de CSV: aspas dobradas e o campo entre aspas quando precisa. */
function campoCSV(valor: string | number): string {
  const texto = String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export async function exportarCSV(de: string, ate: string): Promise<ResultadoExport> {
  if (!(await can('export'))) {
    return { ok: false, erro: 'A exportação faz parte do plano Premium.' };
  }

  const cota = await consumirCota('export');
  if (!cota.permitido) return { ok: false, erro: mensagemDeCota(cota) };

  const user = await requireUser();
  const { dados, linhas } = await montarLinhas(de, ate);

  if (linhas.length === 0) return { ok: false, erro: 'Não há turnos neste período.' };

  const cabecalho = Object.keys(linhas[0]!);
  const corpo = linhas.map((l) =>
    cabecalho
      .map((c) => {
        const v = l[c as keyof Linha];
        // Vírgula decimal e ponto e vírgula como separador: é assim que o
        // Excel em português abre o arquivo sem embaralhar as colunas.
        return campoCSV(typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v);
      })
      .join(';'),
  );

  const t = dados.totais;
  const totalLinha = [
    'TOTAL',
    t.km.toFixed(2).replace('.', ','),
    t.horas.toFixed(2).replace('.', ','),
    t.faturamento.toFixed(2).replace('.', ','),
    t.custoCombustivel.toFixed(2).replace('.', ','),
    t.outrasDespesas.toFixed(2).replace('.', ','),
    t.resultadoOperacional.toFixed(2).replace('.', ','),
    t.reservaVeiculo.toFixed(2).replace('.', ','),
    t.reservaEmergencia.toFixed(2).replace('.', ','),
    t.disponivel.toFixed(2).replace('.', ','),
  ].join(';');

  // BOM no início: sem ele o Excel no Windows estraga os acentos.
  const csv = `﻿${cabecalho.join(';')}\n${corpo.join('\n')}\n${totalLinha}\n`;

  const supabase = await createClient();
  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'export_csv' });

  return {
    ok: true,
    nome: `sobrou-${de}-a-${ate}.csv`,
    tipo: 'text/csv;charset=utf-8',
    conteudoBase64: Buffer.from(csv, 'utf-8').toString('base64'),
  };
}

export async function exportarExcel(de: string, ate: string): Promise<ResultadoExport> {
  if (!(await can('export'))) {
    return { ok: false, erro: 'A exportação faz parte do plano Premium.' };
  }

  const cota = await consumirCota('export');
  if (!cota.permitido) return { ok: false, erro: mensagemDeCota(cota) };

  const user = await requireUser();
  const { dados, linhas } = await montarLinhas(de, ate);

  if (linhas.length === 0) return { ok: false, erro: 'Não há turnos neste período.' };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sobrou';
  wb.created = new Date();

  // ---------- Aba 1: resumo ----------
  const resumo = wb.addWorksheet('Resumo');
  const t = dados.totais;

  resumo.columns = [
    { header: 'Indicador', key: 'k', width: 32 },
    { header: 'Valor', key: 'v', width: 20 },
  ];
  resumo.getRow(1).font = { bold: true };

  const itens: Array<[string, string]> = [
    ['Período', `${de} a ${ate}`],
    ['Dias trabalhados', String(t.diasTrabalhados)],
    ['Turnos', String(t.turnos)],
    ['KM rodados', t.km.toFixed(2)],
    ['Horas trabalhadas', t.horas.toFixed(2)],
    ['Corridas', t.qtdCorridas === null ? '—' : String(t.qtdCorridas)],
    ['Faturamento', formatMoney(t.faturamento)],
    ['Receitas fora de turno', formatMoney(t.outrasReceitas)],
    ['Litros abastecidos', t.litrosAbastecidos.toFixed(3)],
    ['Gasto com combustível', formatMoney(t.gastoCombustivelReal)],
    ['Preço médio do litro', formatRate(t.precoMedioLitro, 'L')],
    ['Consumo médio', formatConsumo(t.consumoMedio)],
    ['Faturamento por km', formatRate(t.faturamentoPorKm, 'km')],
    ['Faturamento por hora', formatRate(t.faturamentoPorHora, 'h')],
    ['Custo combustível por km', formatRate(t.custoCombustivelPorKm, 'km')],
    ['Outras despesas', formatMoney(t.outrasDespesas)],
    ['Resultado operacional', formatMoney(t.resultadoOperacional)],
    ['Reservado para o carro', formatMoney(t.reservaVeiculo)],
    ['Reservado para emergência', formatMoney(t.reservaEmergencia)],
    ['Manutenção realizada', formatMoney(t.manutencaoRealizada)],
    ['Valor disponível', formatMoney(t.disponivel)],
  ];
  for (const [k, v] of itens) resumo.addRow({ k, v });
  resumo.getRow(resumo.rowCount).font = { bold: true };

  // ---------- Aba 2: turnos ----------
  const aba = wb.addWorksheet('Turnos');
  aba.columns = Object.keys(linhas[0]!).map((c) => ({
    header: c,
    key: c,
    width: c === 'Data' ? 12 : 18,
  }));
  aba.getRow(1).font = { bold: true };

  for (const l of linhas) aba.addRow(l);

  // Formato de moeda nas colunas de dinheiro, para o Excel somar direito.
  for (let col = 4; col <= 10; col++) {
    aba.getColumn(col).numFmt = 'R$ #,##0.00';
  }
  aba.getColumn(2).numFmt = '#,##0.0';
  aba.getColumn(3).numFmt = '#,##0.00';

  const totalRow = aba.addRow({
    Data: 'TOTAL',
    KM: t.km,
    Horas: t.horas,
    Faturamento: t.faturamento,
    'Custo combustível': t.custoCombustivel,
    'Outras despesas': t.outrasDespesas,
    'Resultado operacional': t.resultadoOperacional,
    'Reserva do carro': t.reservaVeiculo,
    'Reserva emergência': t.reservaEmergencia,
    Disponível: t.disponivel,
  });
  totalRow.font = { bold: true };

  // ---------- Aba 3: por plataforma ----------
  if (dados.porPlataforma.length > 0) {
    const plat = wb.addWorksheet('Plataformas');
    plat.columns = [
      { header: 'Plataforma', key: 'n', width: 24 },
      { header: 'Faturamento', key: 'v', width: 18 },
      { header: 'Corridas', key: 'c', width: 12 },
    ];
    plat.getRow(1).font = { bold: true };
    for (const x of dados.porPlataforma) {
      plat.addRow({ n: x.nome, v: x.valor, c: x.corridas || null });
    }
    plat.getColumn(2).numFmt = 'R$ #,##0.00';
  }

  const buffer = await wb.xlsx.writeBuffer();

  const supabase = await createClient();
  await supabase.from('app_events').insert({ user_id: user.id, event_key: 'export_xlsx' });

  return {
    ok: true,
    nome: `sobrou-${de}-a-${ate}.xlsx`,
    tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    conteudoBase64: Buffer.from(buffer).toString('base64'),
  };
}
