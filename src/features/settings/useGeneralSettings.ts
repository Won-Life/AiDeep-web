'use client';
import { useState } from 'react';
import type { PersonalSettings } from './usePersonalSettings';

export function useGeneralSettings(settings: PersonalSettings) {
  const [languageMenu, setLanguageMenu] = useState(false);
  const disabled =
    settings.request.pending ||
    !settings.api.saveGeneral ||
    !settings.api.loadGeneral;
  function selectKorean() {
    setLanguageMenu(false);
    if (!disabled)
      settings.saveGeneral({ ...settings.general, language: 'ko' });
  }
  function closeLanguageMenu() {
    setLanguageMenu(false);
  }
  return {
    languageMenu,
    disabled,
    selectKorean,
    closeLanguageMenu,
    toggleLanguageMenu: () => setLanguageMenu((open) => !open),
  };
}
