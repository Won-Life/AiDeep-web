'use client';
import Image from 'next/image';
import { useGeneralSettings } from './useGeneralSettings';
import Switch from '@/components/ui/Switch';
import SettingsGraphPreview from './SettingsGraphPreview';
import { SettingsError } from './SettingsFormParts';
import type { PersonalSettings } from './usePersonalSettings';

export default function GeneralSettings({
  settings,
}: {
  settings: PersonalSettings;
}) {
  const language = useGeneralSettings(settings);
  const { languageMenu, disabled } = language;
  const { general, request } = settings;
  return (
    <>
      <div className="settings-heading">
        <h1>일반</h1>
        <p>앱 환경과 알림을 설정해요</p>
      </div>
      <h2 className="settings-section-title">환경</h2>
      <section className="settings-card settings-environment">
        <div className="settings-general-row">
          <span>언어</span>
          <div
            className="settings-language"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                language.closeLanguageMenu();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                language.closeLanguageMenu();
                event.currentTarget.querySelector('button')?.focus();
              }
            }}
          >
            <span>한국어</span>
            <button
              type="button"
              className="settings-text-button"
              aria-expanded={languageMenu}
              aria-controls={
                languageMenu ? 'settings-language-options' : undefined
              }
              onClick={language.toggleLanguageMenu}
            >
              변경
            </button>
            {languageMenu && (
              <div
                id="settings-language-options"
                className="settings-language-menu"
              >
                <button type="button" onClick={language.selectKorean}>
                  한국어 <span aria-hidden="true">✓</span>
                </button>
                <button type="button" disabled>
                  English{' '}
                  <span className="settings-planned">추후 추가 예정</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="settings-general-row">
          <div>
            <span>테마</span>
            <p className="settings-hint">
              화면 테마를 선택해요. 시스템은 기기 설정을 따라가요
            </p>
          </div>
          <div
            role="group"
            aria-label="화면 테마"
            className="settings-theme-control"
          >
            {(
              [
                ['light', '라이트'],
                ['dark', '다크'],
                ['system', '시스템'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={general.theme === value}
                disabled={disabled}
                onClick={() =>
                  settings.saveGeneral({ ...general, theme: value })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <h2 className="settings-section-title">그래프</h2>
      <section className="settings-card settings-start-view">
        <h3>시작 화면</h3>
        <p className="settings-hint">
          다시 접속했을 때 그래프를 어떤 범위로 보여줄지 선택해요
        </p>
        <div
          role="group"
          aria-label="그래프 시작 화면"
          className="settings-view-options"
        >
          <button
            type="button"
            className="settings-view-card settings-view-selected"
            aria-pressed="true"
            disabled={disabled}
            onClick={() =>
              settings.saveGeneral({ ...general, startView: 'overview' })
            }
          >
            <div className="settings-view-preview">
              <SettingsGraphPreview />
            </div>
            <h4>
              <Image
                src="/onnode/settings/02d26.svg"
                width={14}
                height={14}
                alt=""
              />
              전체 보기
            </h4>
            <p>
              모든 프로젝트와 노드가
              <br />한 화면에 보이도록 맞춰요
            </p>
          </button>
          {[
            {
              title: '이어서 보기 · 넓게',
              art: 'b2428.svg',
              description:
                '프로젝트 노드까지 보이게, 마지막으로 작업한 위치로 살짝 확대해요',
            },
            {
              title: '이어서 보기 · 집중',
              art: '7e020.svg',
              description:
                '마지막으로 작업한 타이틀 노드와 하위 콘텐츠 노드만 크게 보여줘요',
            },
          ].map((item) => (
            <button
              type="button"
              key={item.art}
              className="settings-view-card settings-view-planned"
              disabled
            >
              <div className="settings-view-preview">
                <Image
                  src={`/onnode/settings/${item.art}`}
                  width={184}
                  height={100}
                  alt=""
                />
                <span className="settings-view-badge">추후 추가 예정</span>
              </div>
              <h4>
                <Image
                  src="/onnode/settings/50c48.svg"
                  width={14}
                  height={14}
                  alt=""
                />
                {item.title}
              </h4>
              <p>{item.description}</p>
            </button>
          ))}
        </div>
      </section>
      <h2 className="settings-section-title">알림</h2>
      <section className="settings-card settings-notifications">
        <div className="settings-general-row">
          <div>
            <h3>
              브라우저 알림{' '}
              <span className="settings-planned">추후 추가 예정</span>
            </h3>
            <p className="settings-hint">
              회의 봇 녹음이 끝나고 노드가 만들어지면 브라우저로 알려드려요
            </p>
          </div>
          <Switch
            checked={false}
            onChange={() => {}}
            label="브라우저 알림"
            disabled
          />
        </div>
        <div className="settings-general-row">
          <div>
            <h3>이메일 알림</h3>
            <p className="settings-hint">
              계정 · 구독 관련 주요 안내를 메일로 받아요
            </p>
          </div>
          <Switch
            checked={general.emailNotifications}
            disabled={disabled}
            label="이메일 알림"
            onChange={(value) =>
              settings.saveGeneral({ ...general, emailNotifications: value })
            }
          />
        </div>
      </section>
      <SettingsError message={request.error} />
    </>
  );
}
