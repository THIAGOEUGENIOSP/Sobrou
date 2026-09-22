import { DocumentoLegal } from '@/components/documento-legal';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Termos de uso — KM Legal' };

export default function TermosPage() {
  return <DocumentoLegal kind="termos" />;
}
