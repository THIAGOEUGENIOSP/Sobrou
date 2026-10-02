import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegistrarServiceWorker } from '@/components/registrar-sw';

export const metadata: Metadata = {
  title: 'Sobrou — quanto você realmente ganhou hoje',
  description:
    'Controle de abastecimento, turnos, custos e reservas para motorista de aplicativo. Descubra o que sobra de verdade depois do combustível e do desgaste do carro.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Sobrou' },
  // O iOS ignora o manifest: precisa do ícone declarado aqui.
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Dark é o único tema agora — a cor da barra do navegador/status bar
  // acompanha o novo fundo (--color-papel), sem variante clara.
  themeColor: '#0c1016',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema escolhido antes da primeira pintura, sem piscar. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('sobrou-tema');if(t==='claro'||(t==='sistema'&&matchMedia('(prefers-color-scheme: light)').matches))document.documentElement.dataset.tema='claro'}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  );
}
