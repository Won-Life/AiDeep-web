import { PRIVACY_URL, TERMS_URL } from '@/lib/legalLinks';
import { NAV_ITEMS } from './landingNav';

export type FooterLink = {
  label: string;
  href: string;
  /** 새 탭이나 메일 앱으로 열리는 링크 */
  external?: boolean;
};

export type FooterColumn = {
  title: string;
  links: readonly FooterLink[];
};

/** 개인정보처리방침에 적힌 문의처. 로그인 화면에는 문의 링크가 없어 이 메일을 쓴다. */
export const CONTACT_EMAIL = 'contact.onnode@gmail.com';

export const INSTAGRAM_URL = 'https://www.instagram.com/onnode.official';

/* 서비스 열은 상단 메뉴에서 '추천 대상'만 뺀 세 개(시안). 약관 링크는 로그인 화면과 같은 주소다. */
export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: '서비스',
    links: NAV_ITEMS.filter((item) => item.targetId !== 'target').map(({ label, targetId }) => ({
      label,
      href: `#${targetId}`,
    })),
  },
  { title: '고객 지원', links: [{ label: '문의하기', href: `mailto:${CONTACT_EMAIL}`, external: true }] },
  {
    title: '약관',
    links: [
      { label: '개인정보 처리방침', href: PRIVACY_URL, external: true },
      { label: '서비스 이용약관', href: TERMS_URL, external: true },
    ],
  },
];
