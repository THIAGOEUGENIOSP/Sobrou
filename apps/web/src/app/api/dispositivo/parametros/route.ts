import { NextResponse, type NextRequest } from 'next/server';
import { carregarDispositivo, ErroDispositivo } from '@/lib/dispositivos/contexto';

export const dynamic = 'force-dynamic';

/**
 * Parâmetros que o app Android usa para decidir na hora.
 *
 * É o lado mais valioso da integração. Sozinho, o KM Legal decide aceitar ou
 * recusar com um custo por km que o motorista digitou uma vez: R$ 6,35/L,
 * 10,5 km/L, R$ 0,40/km de manutenção. Isso envelhece — o combustível muda de
 * preço, o consumo real do carro não é o do folheto, e a depreciação foi
 * chutada. Aqui o número vem dos abastecimentos que aconteceram de verdade.
 *
 * O app deve guardar a última resposta e continuar funcionando com ela quando
 * estiver sem sinal: recusar corrida por falta de rede seria trocar um
 * problema pequeno por um caro.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await carregarDispositivo(request.headers.get('authorization'));

    return NextResponse.json(
      {
        custo_por_km: ctx.custo.custoPorKm,
        base: ctx.custo.base,
        combustivel_por_km: ctx.custo.combustivelPorKm,
        consumo_km_l: ctx.custo.consumo,
        preco_litro: ctx.custo.precoLitro,
        combustivel: ctx.custo.fuelKind,
        // Os componentes vão separados de propósito. O KM Legal cobra o custo
        // fixo por HORA e o desgaste por KM; se ele recebesse só o total por
        // km e o aplicasse inteiro, o seguro e os fixos entrariam duas vezes —
        // uma no km, outra na hora — e ele passaria a recusar corrida boa.
        manutencao_depreciacao_por_km:
          ctx.custo.breakdown === null
            ? null
            : [ctx.custo.breakdown.manutencao, ctx.custo.breakdown.depreciacao]
                .filter((v): v is number => v !== null)
                .reduce((a, b) => a + b, 0) || null,
        seguro_mensal: ctx.veiculo?.seguro_mensal ?? null,
        custos_fixos_mensais: ctx.veiculo?.custos_fixos_mensais ?? null,
        km_medio_mensal: ctx.veiculo?.km_medio_mensal ?? null,
        // O app precisa saber o que está faltando para avisar o motorista em
        // vez de exibir um custo baixo demais como se fosse o número final.
        componentes_faltando: ctx.custo.breakdown?.faltando ?? ['todos'],
        regras: {
          valor_min: ctx.regras.valorMin ?? null,
          rs_km_min: ctx.regras.rsKmMin ?? null,
          rs_hora_min: ctx.regras.rsHoraMin ?? null,
          dist_max_busca: ctx.regras.distMaxBusca ?? null,
          nota_min: ctx.regras.notaMin ?? null,
          margem_min: ctx.regras.margemMin ?? null,
        },
        analisador_liberado: ctx.permiteAnalisador,
        turno_aberto: ctx.turnoAberto !== null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    if (e instanceof ErroDispositivo) {
      return NextResponse.json({ erro: e.mensagem }, { status: e.status });
    }
    return NextResponse.json({ erro: 'Falha ao carregar os parâmetros.' }, { status: 500 });
  }
}
