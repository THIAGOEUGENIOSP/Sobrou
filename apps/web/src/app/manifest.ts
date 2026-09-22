import type { MetadataRoute } from 'next';

/** Manifest da PWA: o app instala na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sobrou',
    short_name: 'Sobrou',
    description: 'Rentabilidade real para motorista de aplicativo.',
    start_url: '/app',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b1220',
    theme_color: '#0f766e',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icone-mascara.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Iniciar turno', url: '/app/turno/iniciar' },
      { name: 'Abastecimento', url: '/app/abastecimentos/novo' },
      { name: 'Avaliar corrida', url: '/app/corrida' },
    ],
  };
}
