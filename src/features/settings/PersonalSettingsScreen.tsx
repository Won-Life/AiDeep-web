'use client';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import SettingsShell from './SettingsShell';
import AccountSettings from './AccountSettings';
import GeneralSettings from './GeneralSettings';
import SubscriptionSettings from './SubscriptionSettings';
import NicknameModal from './NicknameModal';
import ProfilePhotoModal from './ProfilePhotoModal';
import PasswordChangeModal from './PasswordChangeModal';
import AccountDeletionModal from './AccountDeletionModal';
import AccountDeletedScreen from './AccountDeletedScreen';
import { usePersonalSettings } from './usePersonalSettings';
import type { SettingsApi } from './types';

export default function PersonalSettingsScreen({ api }: { api?: SettingsApi }) {
  const settings = usePersonalSettings(api);
  return (
    <SettingsShell
      tab={settings.tab}
      theme={settings.general.theme}
      onTabChange={settings.setTab}
      busy={settings.request.pending}
    >
      {settings.phase === 'deleted' ? (
        <AccountDeletedScreen />
      ) : (
        <>
          {settings.phase === 'loading' && (
            <p role="status" className="settings-load-state">
              설정을 불러오고 있어요
            </p>
          )}
          {settings.phase === 'error' && (
            <div className="settings-load-state">
              <p role="alert">{settings.loadError}</p>
              <Button onClick={settings.retry}>다시 시도</Button>
            </div>
          )}
          {settings.phase === 'ready' && (
            <>
              {settings.tab === 'account' && (
                <AccountSettings settings={settings} />
              )}
              {settings.tab === 'general' && (
                <GeneralSettings settings={settings} />
              )}
              {settings.tab === 'subscription' && (
                <SubscriptionSettings subscription={settings.subscription} />
              )}
              {settings.modal === 'nickname' && (
                <NicknameModal settings={settings} />
              )}
              {settings.modal === 'profile' && (
                <ProfilePhotoModal settings={settings} />
              )}
              {settings.modal === 'password' && (
                <PasswordChangeModal settings={settings} />
              )}
              {settings.modal === 'delete' && (
                <AccountDeletionModal settings={settings} />
              )}
            </>
          )}
          {settings.toast && (
            <Toast key={settings.toast.id} message={settings.toast.message} />
          )}
        </>
      )}
    </SettingsShell>
  );
}
