/**
 * Type definitions for audio streaming and buffer delivery.
 */

export interface AudioBufferWindow {
  /**
   * Fixed-size rolling window of raw PCM audio samples (-1.0 to 1.0).
   * Exact length equals WINDOW_SIZE_SAMPLES.
   */
  samples: Float32Array;

  /**
   * Sample rate in Hz at which these samples were recorded.
   */
  sampleRate: number;

  /**
   * Duration of the window in seconds.
   */
  durationSec: number;

  /**
   * Timestamp in milliseconds when this window was formed.
   */
  timestamp: number;
}

export type AudioBufferListener = (buffer: AudioBufferWindow) => void;
export type AudioStatusListener = (isStreaming: boolean) => void;
