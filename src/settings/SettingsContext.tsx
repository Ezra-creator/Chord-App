import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { AppSettings, DEFAULT_SETTINGS } from './types';
import {
  loadPersistedSettings,
  savePersistedSettings,
  applySettingsRuntime,
} from './settingsService';

export interface SettingsContextValue {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
  updateSettings: async () => {},
  resetSettings: async () => {},
});

export interface SettingsProviderProps {
  children: ReactNode;
  initialSettings?: AppSettings;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<AppSettings>(
    () => initialSettings ?? DEFAULT_SETTINGS
  );
  const [isLoaded, setIsLoaded] = useState<boolean>(() => Boolean(initialSettings));

  useEffect(() => {
    if (initialSettings) {
      applySettingsRuntime(initialSettings);
      return;
    }

    let isMounted = true;
    loadPersistedSettings().then((loaded) => {
      if (isMounted) {
        setSettings(loaded);
        setIsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [initialSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next: AppSettings = {
          ...prev,
          ...partial,
        };
        // Apply runtime changes immediately
        applySettingsRuntime(next);
        // Persist asynchronously in background
        savePersistedSettings(next).catch((err) => {
          console.warn('Failed to persist settings:', err);
        });
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    applySettingsRuntime(DEFAULT_SETTINGS);
    await savePersistedSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isLoaded,
      updateSettings,
      resetSettings,
    }),
    [settings, isLoaded, updateSettings, resetSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
