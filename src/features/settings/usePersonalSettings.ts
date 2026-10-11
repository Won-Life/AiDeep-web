'use client';
import { useEffect, useState } from 'react';
import { clearTokens } from '@/api/client';
import { ApiError } from '@/api/types';
import { settingsApi } from '@/api/settings';
import { useSettingsRequest } from './useSettingsRequest';
import {
  defaultGeneralSettings,
  type SettingsApi,
  type SettingsAccount,
  type SettingsTab,
  type SettingsModal,
  type GeneralSettings,
  type SettingsSubscription,
  type PasswordChange,
} from './types';

/*
 * CONTEXT
 * - Problem      : 개인 설정은 그래프 WS 상태와 수명/저장 대상이 다르다.
 * - Why          : 기존 useState/useRef 컨벤션으로 페이지 단위 상태만 소유한다.
 * - Alternatives : WorkspaceLayoutContext에 추가 → 그래프 초기화와 불필요하게 결합.
 * - Trade-offs   : 재진입 시 사용자 정보를 다시 조회한다.
 * - Edge Case    : 로드 실패/재시도/중복 저장/삭제 성공 후 인증 제거.
 */
export function usePersonalSettings(api: SettingsApi = settingsApi) {
  const [tab, setTab] = useState<SettingsTab>('account');
  const [modal, setModal] = useState<SettingsModal>(null);
  const [account, setAccount] = useState<SettingsAccount | null>(null);
  const [general, setGeneral] = useState(defaultGeneralSettings);
  const [subscription, setSubscription] = useState<SettingsSubscription | null>(
    null,
  );
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error' | 'deleted'>(
    'loading',
  );
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const request = useSettingsRequest();
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() =>
        Promise.all([
          api.loadAccount(),
          api.loadGeneral?.() ?? defaultGeneralSettings,
          api.loadSubscription?.() ?? null,
        ]),
      )
      .then(([user, preferences, plan]) => {
        if (!active) return;
        setAccount(user);
        setGeneral(preferences);
        setSubscription(plan);
        setPhase('ready');
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(
          error instanceof ApiError
            ? error.reason
            : '설정을 불러오지 못했어요. 다시 시도해주세요.',
        );
        setPhase('error');
      });
    return () => {
      active = false;
    };
  }, [api, attempt]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  function notify(message: string) {
    setToast({ id: Date.now(), message });
  }
  function openModal(next: SettingsModal) {
    if (!request.pending) {
      request.clearError();
      setModal(next);
    }
  }
  function closeModal() {
    if (!request.pending) {
      setModal(null);
      request.clearError();
    }
  }
  function updateNickname(username: string) {
    if (api.updateNickname)
      void request.run(
        () => api.updateNickname!(username),
        (user) => {
          setAccount(user);
          setModal(null);
          notify('닉네임을 변경했어요');
        },
      );
  }
  function updateProfile(image: Blob | null) {
    if (api.updateProfile)
      void request.run(
        () => api.updateProfile!(image),
        (user) => {
          setAccount(user);
          setModal(null);
          notify('프로필 사진을 변경했어요');
        },
      );
  }
  function changePassword(values: PasswordChange) {
    if (api.changePassword)
      void request.run(
        () => api.changePassword!(values),
        () => {
          setModal(null);
          notify('비밀번호를 변경했어요');
        },
      );
  }
  function deleteAccount() {
    if (api.deleteAccount)
      void request.run(
        () => api.deleteAccount!(),
        () => {
          clearTokens();
          setModal(null);
          setAccount(null);
          setPhase('deleted');
        },
      );
  }
  function saveGeneral(next: GeneralSettings) {
    if (api.saveGeneral && api.loadGeneral)
      void request.run(
        () => api.saveGeneral!(next),
        (saved) => {
          setGeneral(saved);
          notify('설정이 저장됐어요');
        },
      );
  }
  return {
    api,
    tab,
    setTab,
    modal,
    openModal,
    closeModal,
    account,
    general,
    subscription,
    phase,
    loadError,
    toast,
    request,
    retry: () => {
      setPhase('loading');
      setLoadError('');
      setAttempt((value) => value + 1);
    },
    updateNickname,
    updateProfile,
    changePassword,
    deleteAccount,
    saveGeneral,
  };
}
export type PersonalSettings = ReturnType<typeof usePersonalSettings>;
