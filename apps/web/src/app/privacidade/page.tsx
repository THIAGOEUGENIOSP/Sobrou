import { DocumentoLegal } from '@/components/documento-legal';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Política de privacidade — Sobrou' };

export default function PrivacidadePage() {
  return <DocumentoLegal kind="privacidade" />;
}
