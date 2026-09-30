import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, DEFAULT_SETTINGS } from './types';
import { noteStabilizer } from '../audio/noteStabilizer';

export const SETTINGS_STORAGE_KEY = '@chord_app_settings';

import {
  sensitivityToThreshold,
  thresholdToSensitivity,
} from './sensitivityMapping';

export { sensitivityToThreshold, thresholdToSensitivity };

/**
 * Applies runtime side-effects of settings, such as updating the noteStabilizer's
 * confidence threshold live without requiring an app restart.
 */
export function applySettingsRuntime(settings: AppSettings): void {
  const threshold = sensitivityToThreshold(settings.sensitivity);
  try {
    if (noteStabilizer && typeof noteStabilizer.updateConfig === 'function') {
      noteStabilizer.updateConfig({ threshold });
    }
  } catch {
    // In headless test environments where audio capture / native modules aren't loaded
  }
}

/**
 * Load settings from persistent local storage.
 * Gracefully falls back to DEFAULT_SETTINGS on first run or read errors.
 */
export async function loadPersistedSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const settings: AppSettings = {
        showNoteNames:
          typeof parsed.showNoteNames === 'boolean'
            ? parsed.showNoteNames
            : DEFAULT_SETTINGS.showNoteNames,
        keepScreenAwake:
          typeof parsed.keepScreenAwake === 'boolean'
            ? parsed.keepScreenAwake
            : DEFAULT_SETTINGS.keepScreenAwake,
        sensitivity:
          typeof parsed.sensitivity === 'number' && Number.isFinite(parsed.sensitivity)
            ? Math.max(0, Math.min(1, parsed.sensitivity))
            : DEFAULT_SETTINGS.sensitivity,
      };

      applySettingsRuntime(settings);
      return settings;
    }
  } catch (err) {
    console.warn('Failed to load persisted settings from AsyncStorage:', err);
  }

  applySettingsRuntime(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

/**
 * Save settings to persistent local storage and apply runtime updates immediately.
 */
export async function savePersistedSettings(settings: AppSettings): Promise<void> {
  applySettingsRuntime(settings);
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save settings to AsyncStorage:', err);
  }
}
