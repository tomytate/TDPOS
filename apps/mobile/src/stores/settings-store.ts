import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { mmkvStorage } from '@/services/storage'
import { DEFAULT_MODULE_STATE, type ModuleName } from '@tdpos/shared'

type ModuleState = Record<ModuleName, boolean>
type Language = 'en' | 'tl'
type ThemeMode = 'system' | 'light' | 'dark'

interface SettingsState {
  modules: ModuleState
  language: Language
  themeMode: ThemeMode
  privacyNoticeAcceptedAt: string | null
  toggleModule: (name: ModuleName) => void
  setLanguage: (language: Language) => void
  setThemeMode: (themeMode: ThemeMode) => void
  recordPrivacyNoticeAccepted: (acceptedAt: string) => void
}

const defaultModules = { ...DEFAULT_MODULE_STATE } as ModuleState

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      modules: defaultModules,
      language: 'en',
      themeMode: 'system',
      privacyNoticeAcceptedAt: null,
      toggleModule: (name) =>
        set((state) => ({
          modules: {
            ...state.modules,
            [name]: !state.modules[name],
          },
        })),
      setLanguage: (language) => set({ language }),
      setThemeMode: (themeMode) => set({ themeMode }),
      recordPrivacyNoticeAccepted: (acceptedAt) => set({ privacyNoticeAcceptedAt: acceptedAt }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        modules: state.modules,
        language: state.language,
        themeMode: state.themeMode,
        privacyNoticeAcceptedAt: state.privacyNoticeAcceptedAt,
      }),
    },
  ),
)
