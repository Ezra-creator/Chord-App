import { DEFAULT_SETTINGS } from './types';

/**
 * Maps the sensitivity slider value (0.0 to 1.0) to the confidence threshold
 * in noteStabilizer (0.80 to 0.20).
 *
 * Sensitivity 0.0 -> Threshold 0.80 (strict / loud notes only)
 * Sensitivity 0.65 (default) -> Threshold 0.45 (calibrated default)
 * Sensitivity 1.0 -> Threshold 0.20 (picks up soft/pianissimo playing)
 */
export function sensitivityToThreshold(sensitivity: number): number {
  const s = Math.max(
    0,
    Math.min(1, Number.isFinite(sensitivity) ? sensitivity : DEFAULT_SETTINGS.sensitivity)
  );

  if (s <= 0.65) {
    // [0.0, 0.65] maps to [0.80, 0.45]
    const t = 0.80 - (s / 0.65) * 0.35;
    return Number(t.toFixed(3));
  }

  // (0.65, 1.0] maps to (0.45, 0.20]
  const t = 0.45 - ((s - 0.65) / 0.35) * 0.25;
  return Number(t.toFixed(3));
}

/**
 * Inverts confidence threshold back to the sensitivity slider value.
 */
export function thresholdToSensitivity(threshold: number): number {
  const t = Math.max(
    0.20,
    Math.min(0.80, Number.isFinite(threshold) ? threshold : 0.45)
  );

  if (t >= 0.45) {
    const s = ((0.80 - t) / 0.35) * 0.65;
    return Number(s.toFixed(3));
  }

  const s = 0.65 + ((0.45 - t) / 0.25) * 0.35;
  return Number(s.toFixed(3));
}
