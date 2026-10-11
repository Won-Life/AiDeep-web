import { termsMarkdown } from './terms';
import { privacyMarkdown } from './privacy';
import { marketingMarkdown } from './marketing';

export const AGREEMENTS = {
  terms: { title: '(필수) 이용약관', markdown: termsMarkdown },
  privacy: { title: '(필수) 개인정보 수집 및 이용 동의', markdown: privacyMarkdown },
  marketing: { title: '(선택) 마케팅 정보 수신 동의', markdown: marketingMarkdown },
} as const;

export type AgreementKey = keyof typeof AGREEMENTS;
export type Agreements = Record<AgreementKey, boolean>;

export function agreeToDocument(value: Agreements, key: AgreementKey): Agreements {
  return { ...value, [key]: true };
}
