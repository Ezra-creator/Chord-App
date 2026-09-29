/**
 * Named constants for audio capture, rolling window, and hop interval.
 * Expose all audio parameters as named constants rather than magic numbers.
 */

/**
 * Audio sampling rate in Hertz.
 * Standard 44.1 kHz for high-fidelity piano harmonics.
 */
export const AUDIO_SAMPLE_RATE = 44100 as const;

/**
 * Number of channels (1 = mono).
 */
export const AUDIO_CHANNELS = 1 as const;

/**
 * PCM encoding format for native capture.
 */
export const AUDIO_ENCODING = 'float32' as const;

/**
 * Target rolling analysis window duration in seconds (1.5s).
 * Sits in the required ~1-2 second target range for chord recognition.
 */
export const WINDOW_DURATION_SEC = 1.5 as const;

/**
 * Hop interval duration in seconds (0.25s = 250ms).
 * New buffer delivered 4 times per second.
 */
export const HOP_DURATION_SEC = 0.25 as const;

/**
 * Fixed sample count of the rolling window (e.g. 44100 * 1.5 = 66,150 samples).
 */
export const WINDOW_SIZE_SAMPLES: number = Math.round(
  AUDIO_SAMPLE_RATE * WINDOW_DURATION_SEC
);

/**
 * Sample count required between buffer dispatches (e.g. 44100 * 0.25 = 11,025 samples).
 */
export const HOP_SIZE_SAMPLES: number = Math.round(
  AUDIO_SAMPLE_RATE * HOP_DURATION_SEC
);
