import type { Route } from 'next';

/**
 * Destino interno seguro para redirecionamento.
 *
 * O `proximo` chega pela query string — quem manda o link escolhe o valor. Um
 * destino controlado por quem manda o link é a matéria-prima do
 * redirecionamento aberto: o usuário entra no domínio certo, o app o joga num
 * site clonado, e ele digita a senha achando que ainda está aqui.
 *
 * Conferir só a barra inicial não resolve. `//site-falso.com` começa com barra
 * e o navegador o lê como endereço externo (URL relativa a protocolo); o
 * mesmo vale para `/\site-falso.com`, que alguns navegadores normalizam para
 * `//`. Por isso a segunda barra é recusada.
 *
 * Este é também o único lugar do app que contorna o `typedRoutes`, e é aqui
 * porque o destino só existe em tempo de execução — não há rota literal para o
 * TypeScript conferir. A validação acima é o que paga por esse atalho.
 */
export function rotaInterna(
  proximo: string | null | undefined,
  padrao: Route = '/app',
): Route {
  if (!proximo) return padrao;
  if (!proximo.startsWith('/')) return padrao;
  if (proximo.startsWith('//') || proximo.startsWith('/\\')) return padrao;
  return proximo as Route;
}
