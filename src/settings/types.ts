/**
 * Application settings data contracts and default values.
 */

export interface AppSettings {
  /**
   * Whether to display the individual notes line (e.g. "A · C · E · G") under the chord name.
   * When false, hides the notes line on ListenScreen.
   * Default: true
   */
  showNoteNames: boolean;

  /**
   * Whether to prevent the device display from sleeping while ListenScreen is active.
   * Uses expo-keep-awake to keep the screen awake.
   * Default: true
   */
  keepScreenAwake: boolean;

  /**
   * Microphone detection sensitivity slider value (0.0 to 1.0).
   * Mapped at runtime to the noteStabilizer confidence threshold constant.
   * Higher sensitivity lowers the confidence threshold to pick up softer playing.
   * Default: 0.65 (calibrated to default 0.45 stability threshold)
   */
  sensitivity: number;
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  showNoteNames: true,
  keepScreenAwake: true,
  sensitivity: 0.65,
};
