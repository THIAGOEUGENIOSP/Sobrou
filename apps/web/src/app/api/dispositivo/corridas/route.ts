import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createAnonClient } from '@/lib/supabase/server';
import { carregarDispositivo, ErroDispositivo } from '@/lib/dispositivos/contexto';
import { avaliar } from '@/lib/corridas/custo';

export const dynamic = 'force-dynamic';

/**
 * Entrada das corridas avaliadas no celular.
 *
 * O app manda o que ele **observou** na tela da Uber — valor, distância,
 * tempo, e se o motorista aceitou. Não manda o veredito. Quem recalcula é
 * aqui, com as regras e o custo que estão no banco neste instante, usando a
 * mesma função da tela do navegador.
 *
 * Isso não é desconfiança do app; é o que faz o histórico valer alguma coisa.
 * Um registro que carrega o julgamento do próprio cliente não prova nada
 * depois — e três meses adiante, quando o motorista quiser saber se as regras
 * dele estavam boas, é esse histórico que responde.
 *
 * Aceita lote porque o celular pode ter ficado sem sinal: guardar as corridas
 * e mandar dez de uma vez tem que ser normal, não exceção.
 */

const corridaSchema = z.object({
  valor: z.number().finite().min(0).max(100000),
  km_busca: z.number().finite().min(0).max(2000).default(0),
  km_viagem: z.number().finite().min(0).max(2000).default(0),
  min_busca: z.number().finite().min(0).max(1440).default(0),
  min_viagem: z.number().finite().min(0).max(1440).default(0),
  nota_passageiro: z.number().finite().min(0).max(5).nullable().default(null),
  regiao_destino: z.string().trim().max(60).nullable().default(null),
  categoria: z.string().trim().max(40).nullable().default(null),
  aceita: z.boolean().nullable().default(null),
  evaluated_at: z.string().datetime({ offset: true }).nullable().default(null),
  /** Id gerado no celular. Volta na resposta para o app saber o que já subiu. */
  ref: z.string().trim().max(64).nullable().default(null),
});

const corpoSchema = z.object({
  corridas: z.array(corridaSchema).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await carregarDispositivo(request.headers.get('authorization'));

    if (!ctx.permiteAnalisador) {
      return NextResponse.json(
        { erro: 'O analisador de corridas faz parte do plano Premium.' },
        { status: 402 },
      );
    }

    const corpo = corpoSchema.safeParse(await request.json().catch(() => null));
    if (!corpo.success) {
      return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const supabase = createAnonClient();
    const resultados: Array<{ ref: string | null; id: string | null; erro?: string }> = [];

    // Uma a uma, de propósito: uma corrida com dado estranho não pode levar
    // junto as outras nove que estavam certas e some do celular.
    for (const c of corpo.data.corridas) {
      const avaliacao = avaliar(
        {
          valor: c.valor,
          kmBusca: c.km_busca,
          kmViagem: c.km_viagem,
          minBusca: c.min_busca,
          minViagem: c.min_viagem,
          notaPassageiro: c.nota_passageiro,
        },
        ctx.regras,
        ctx.custo.custoPorKm,
      );

      const { data, error } = await supabase.rpc('dispositivo_registrar_corrida', {
        p_hash: ctx.hash,
        p_dados: {
          valor: c.valor,
          km_busca: c.km_busca,
          km_viagem: c.km_viagem,
          min_busca: c.min_busca,
          min_viagem: c.min_viagem,
          nota_passageiro: c.nota_passageiro,
          regiao_destino: c.regiao_destino,
          categoria: c.categoria,
          rs_km: avaliacao.rsKm,
          rs_hora: avaliacao.rsHora,
          custo_estimado: avaliacao.custoEstimado,
          margem_estimada: avaliacao.margemEstimada,
          veredito: avaliacao.veredito === 'indefinido' ? null : avaliacao.veredito,
          motivos: avaliacao.motivos,
          aceita: c.aceita,
          evaluated_at: c.evaluated_at,
        },
      });

      resultados.push(
        error
          ? { ref: c.ref, id: null, erro: 'Não foi possível gravar.' }
          : { ref: c.ref, id: data as string },
      );
    }

    const gravadas = resultados.filter((r) => r.id !== null).length;

    // 207 quando parte falhou: o app precisa distinguir "tudo subiu, pode
    // apagar da fila" de "subiu metade".
    return NextResponse.json(
      { gravadas, resultados, custo_por_km: ctx.custo.custoPorKm },
      { status: gravadas === resultados.length ? 201 : 207 },
    );
  } catch (e) {
    if (e instanceof ErroDispositivo) {
      return NextResponse.json({ erro: e.mensagem }, { status: e.status });
    }
    return NextResponse.json({ erro: 'Falha ao registrar as corridas.' }, { status: 500 });
  }
}
