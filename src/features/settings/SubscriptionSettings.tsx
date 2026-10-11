'use client';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import type { SettingsSubscription } from './types';

export default function SubscriptionSettings({
  subscription,
}: {
  subscription: SettingsSubscription | null;
}) {
  return (
    <>
      <div className="settings-heading">
        <h1>구독 플랜</h1>
        <p>
          현재 플랜 :{' '}
          {subscription
            ? subscription.plan === 'FREE'
              ? '무료'
              : '프로'
            : '—'}
        </p>
      </div>
      <div className="settings-plan-banner">
        유료 플랜의 가격과 기능은 곧 안내해 드릴게요.
        <span className="settings-planned">추후 추가 예정</span>
      </div>
      <div className="settings-plan-cards">
        {(['FREE', 'PRO'] as const).map((plan) => (
          <section
            key={plan}
            className={`settings-card settings-plan-card ${plan === 'PRO' ? 'settings-pro-card' : ''}`}
          >
            <h2>
              {plan === 'FREE' ? '무료' : '프로'}{' '}
              {subscription?.plan === plan && (
                <span className="settings-planned">현재 플랜</span>
              )}
            </h2>
            <p className="settings-plan-price">
              {plan === 'FREE' ? '₩0' : '가격 준비 중'}
            </p>
            <div
              className="settings-plan-features"
              aria-label="플랜 상세 안내 준비 중"
            >
              {(
                [
                  ['6eacf.svg', 160],
                  ['49931.svg', 130],
                  ['c91d3.svg', 145],
                ] as const
              ).map(([asset, width]) => (
                <Image
                  key={asset}
                  src={`/onnode/settings/${asset}`}
                  width={width}
                  height={8}
                  alt=""
                />
              ))}
            </div>
            <Button
              variant={plan === 'FREE' ? 'secondary' : 'primary'}
              disabled
              className={plan === 'FREE' ? 'settings-cancel' : ''}
            >
              {subscription?.plan === plan
                ? '사용 중'
                : plan === 'PRO'
                  ? '업그레이드'
                  : '무료'}
            </Button>
          </section>
        ))}
      </div>
      <h2 className="settings-section-title">
        이번 달 사용량 <span className="settings-planned">추후 추가 예정</span>
      </h2>
      <div className="settings-usage">
        {[
          ['그래프 노드', subscription?.nodeCount, '개'],
          ['AI 챗봇 질의', subscription?.chatCount, '회'],
          ['회의 봇 녹음', subscription?.recordingMinutes, '분'],
        ].map(([label, amount, unit]) => (
          <div key={label}>
            <div>
              <span>{label}</span>
              <span className="settings-muted">
                {amount === undefined ? '—' : `${amount}${unit}`}
              </span>
            </div>
            <div className="settings-usage-track" />
          </div>
        ))}
      </div>
      <h2 className="settings-section-title">
        결제 수단 · 결제 내역{' '}
        <span className="settings-planned">추후 추가 예정</span>
      </h2>
      <div className="settings-payment-note">
        결제 수단, 결제 내역, 구독 해지는 유료 플랜과 함께 추가돼요
      </div>
    </>
  );
}
