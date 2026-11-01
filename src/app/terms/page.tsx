import type { Metadata } from 'next';
import '@/features/landing/landing.css';
import LegalDocument from '@/features/auth/legal/LegalDocument';

export const metadata: Metadata = { title: '서비스 이용약관' };

export default function TermsPage() {
  return <LegalDocument agreement="terms" />;
}
