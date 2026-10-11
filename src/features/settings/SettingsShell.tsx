'use client';
import Image from 'next/image';
import Link from 'next/link';
import localFont from 'next/font/local';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import type { SettingsTab, SettingsTheme } from './types';
import './settings.css';

const pretendard = localFont({
  src: '../../../public/onnode/fonts/PretendardVariable.woff2',
  variable: '--font-onnode',
  weight: '100 900',
  display: 'swap',
});
const navItems = [
  { id: 'account', label: '계정', normal: 'd6ba3.svg', active: '83d37.svg' },
  { id: 'general', label: '일반', normal: '0d148.svg', active: 'e6ba8.svg' },
  {
    id: 'subscription',
    label: '구독 플랜',
    normal: '8a91f.svg',
    active: '319dc.svg',
  },
] as const;

export default function SettingsShell({
  tab,
  theme,
  onTabChange,
  busy,
  children,
}: {
  tab: SettingsTab;
  theme: SettingsTheme;
  onTabChange: (tab: SettingsTab) => void;
  busy: boolean;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <div
      className={`${pretendard.variable} settings-screen`}
      data-theme={theme}
    >
      <header className="settings-header">
        <Link href="/workspace">← 설정</Link>
        <Image
          src="/onnode/settings/10ce9.svg"
          width={23.3431}
          height={25}
          style={{ width: 'auto', height: 'auto' }}
          alt=""
        />
      </header>
      <aside className="settings-sidebar">
        <nav aria-label="개인 설정">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={tab === item.id ? 'page' : undefined}
              disabled={busy}
              onClick={() => onTabChange(item.id)}
            >
              <Image
                src={`/onnode/settings/${tab === item.id ? item.active : item.normal}`}
                width={34}
                height={34}
                alt=""
              />
              {item.label}
            </button>
          ))}
          <div className="settings-nav-divider" />
          <button type="button" disabled>
            <Image
              src="/onnode/settings/b27cd.svg"
              width={34}
              height={34}
              alt=""
            />
            멤버 · 초대
          </button>
        </nav>
      </aside>
      <main key={tab} className={`settings-content settings-content-${tab}`}>
        {children}
      </main>
      <div className="settings-mascots" aria-hidden="true">
        <motion.div
          className="settings-pink"
          initial={{ rotate: 16.153 }}
          animate={
            reducedMotion
              ? undefined
              : { rotate: [16.153, 1.086, 18.465, -3.027] }
          }
          transition={{
            rotate: {
              duration: 5.051,
              times: [0, 0.2489, 0.5458, 1],
              ease: [0.5, 0, 0.5, 1],
              repeat: Infinity,
            },
          }}
        >
          <Image
            src="/onnode/settings/6fe06.svg"
            width={36.4637}
            height={30.9599}
            alt=""
          />
        </motion.div>
        <div className="settings-blue">
          <Image
            src="/onnode/settings/41554.svg"
            width={70.2317}
            height={64.2779}
            alt=""
          />
        </div>
      </div>
      <Image
        className="settings-footer-logo"
        src="/onnode/settings/22db8.svg"
        width={88}
        height={16.7819}
        style={{ width: 'auto', height: 'auto' }}
        alt="On:Node"
      />
    </div>
  );
}
