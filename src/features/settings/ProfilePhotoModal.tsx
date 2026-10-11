'use client';
import Image from 'next/image';
import { useId, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useProfileCrop } from './useProfileCrop';
import { SettingsError, SettingsFormActions } from './SettingsFormParts';
import type { PersonalSettings } from './usePersonalSettings';

export default function ProfilePhotoModal({
  settings,
}: {
  settings: PersonalSettings;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const crop = useProfileCrop();
  const pending = crop.pending || settings.request.pending;
  const source = crop.url ?? settings.account?.profileImageUrl;
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!pending) settings.closeModal();
      }}
      labelledBy={id}
      className="settings-modal settings-profile-modal"
      closeOnBackdrop={!pending}
    >
      <h2 id={id}>프로필 사진 변경</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (settings.api.updateProfile)
            void crop.apply(settings.updateProfile);
        }}
      >
        <fieldset disabled={pending}>
          <div className="settings-crop-area">
            <div className="settings-crop-square">
              {source ? (
                <div className="settings-crop-window">
                  <Image
                    src={source}
                    alt="프로필 사진 미리보기"
                    width={117}
                    height={117}
                    unoptimized
                    className="settings-crop-image"
                    style={{ transform: `scale(${crop.zoom})` }}
                  />
                </div>
              ) : (
                <>
                  <Image
                    src="/onnode/settings/36d8b.png"
                    width={117}
                    height={117}
                    alt="기본 프로필"
                    className="settings-crop-image"
                  />
                  <span className="settings-avatar-eyes" />
                </>
              )}
            </div>
            <div className="settings-zoom">
              <button
                type="button"
                aria-label="사진 축소"
                disabled={!crop.file || crop.zoom <= 1}
                onClick={() => crop.setZoom(Math.max(1, crop.zoom - 0.1))}
              >
                −
              </button>
              <input
                aria-label="사진 확대"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={crop.zoom}
                disabled={!crop.file}
                onChange={(event) => crop.setZoom(Number(event.target.value))}
              />
              <button
                type="button"
                aria-label="사진 확대"
                disabled={!crop.file || crop.zoom >= 3}
                onClick={() => crop.setZoom(Math.min(3, crop.zoom + 0.1))}
              >
                +
              </button>
            </div>
          </div>
          <div className="settings-file-row">
            <span className="settings-hint">JPG, PNG 최대 5MB</span>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              onChange={(event) => {
                crop.selectFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              className="settings-cancel"
              onClick={() => input.current?.click()}
            >
              다른 사진 선택
            </Button>
          </div>
          <SettingsError message={crop.error || settings.request.error} />
          <SettingsFormActions
            onCancel={settings.closeModal}
            label="적용"
            pending={pending}
            disabled={
              !settings.api.updateProfile || !crop.file || Boolean(crop.error)
            }
          />
        </fieldset>
      </form>
    </Modal>
  );
}
