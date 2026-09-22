import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegistrarServiceWorker } from '@/components/registrar-sw';

export const metadata: Metadata = {
  title: 'KM Legal — quanto você realmente ganhou hoje',
  description:
    'Controle de abastecimento, turnos, custos e reservas para motorista de aplicativo. Descubra o que sobra de verdade depois do combustível e do desgaste do carro.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'KM Legal' },
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  );
}
