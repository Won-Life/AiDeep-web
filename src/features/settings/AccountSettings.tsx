'use client';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import type { PersonalSettings } from './usePersonalSettings';
import { SettingsError } from './SettingsFormParts';

export default function AccountSettings({
  settings,
}: {
  settings: PersonalSettings;
}) {
  const user = settings.account;
  if (!user) return null;
  const { pending, error } = settings.request;
  return (
    <>
      <div className="settings-heading">
        <h1>계정</h1>
        <p>프로필과 로그인 정보를 관리해요</p>
      </div>
      <section
        className="settings-card settings-account-card"
        aria-label="프로필"
      >
        <div className="settings-profile-row">
          <div className="settings-avatar">
            <Image
              src={user.profileImageUrl ?? '/onnode/settings/dc50b.svg'}
              alt="프로필 사진"
              width={56}
              height={56}
              unoptimized
              className={user.profileImageUrl ? 'settings-photo' : ''}
            />
            {!user.profileImageUrl && <span className="settings-avatar-eyes" />}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="settings-photo-button"
            disabled={pending}
            onClick={() => settings.openModal('profile')}
          >
            사진 변경
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="settings-remove-photo"
            disabled={
              pending || !user.profileImageUrl || !settings.api.updateProfile
            }
            onClick={() => settings.updateProfile(null)}
          >
            삭제
          </Button>
        </div>
        <div className="settings-account-row">
          <span>닉네임</span>
          <div>
            <span>{user.username}</span>
            <button
              type="button"
              disabled={pending}
              className="settings-text-button"
              onClick={() => settings.openModal('nickname')}
            >
              수정
            </button>
          </div>
        </div>
        <div className="settings-account-row">
          <span>이메일</span>
          <span className="settings-muted">{user.email}</span>
        </div>
      </section>
      <section
        className="settings-card settings-login-card"
        aria-label="로그인 정보"
      >
        <div className="settings-account-row">
          <span>로그인 방식</span>
          <span className="settings-muted">
            {user.loginMethod === 'GOOGLE'
              ? '구글'
              : user.loginMethod === 'EMAIL'
                ? '이메일'
                : '—'}
          </span>
        </div>
        {user.loginMethod === 'GOOGLE' ? (
          <div className="settings-account-row">
            <span>이메일</span>
            <span className="settings-muted">구글 계정으로 연결됨</span>
          </div>
        ) : (
          <div className="settings-account-row">
            <span>비밀번호</span>
            <button
              type="button"
              disabled={pending}
              className="settings-text-button"
              onClick={() => settings.openModal('password')}
            >
              변경
            </button>
          </div>
        )}
      </section>
      <section className="settings-card settings-danger-card">
        <div>
          <h2>계정 삭제</h2>
          <p>
            모든 프로젝트와 노드, 녹음 파일이 영구 삭제되며 복구할 수 없어요
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="settings-delete-button"
          disabled={pending}
          onClick={() => settings.openModal('delete')}
        >
          계정 삭제하기
        </Button>
      </section>
      {!settings.modal && <SettingsError message={error} />}
    </>
  );
}
