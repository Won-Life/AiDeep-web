import type { Metadata } from 'next';
import '@/features/landing/landing.css';
import LegalDocument from '@/features/auth/legal/LegalDocument';

export const metadata: Metadata = { title: '개인정보 처리방침' };

export default function PrivacyPage() {
  return <LegalDocument agreement="privacy" />;
}
