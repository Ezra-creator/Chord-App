import { useState, useEffect, useRef } from 'react';
import { audioCapture } from './AudioCapture';
import { noteDetectionModel } from './model';
import { PIANO } from '../theme/tokens';

/**
 * ============================================================================
 * CONFIGURABLE CONSTANTS (TUNING PARAMETERS)
 * ============================================================================
 * These constants control note onset and offset dynamics between raw model
 * inference scores and downstream chord recognition.
 */

/**
 * Default confidence threshold (0.0 to 1.0) above which raw model activations
 * are treated as candidate note events. Discards low-confidence background noise
 * and spurious spectral artifacts.
 */
export const DEFAULT_STABILITY_THRESHOLD = 0.45;

/**
 * Minimum consecutive frames above the confidence threshold required before a
 * note is considered active ("on").
 * Debounces rapid transient onsets and prevents single-frame noise spikes
 * (e.g., piano key thuds, bench clicks) from falsely triggering notes.
 */
export const DEFAULT_MIN_ON_FRAMES = 2;

/**
 * Number of consecutive frames below the confidence threshold required before
 * an active note is considered inactive ("off").
 * Acts as a hysteresis window so notes survive brief acoustic/spectral dips
 * during sustained chord playing without flickering off.
 */
export const DEFAULT_HYSTERESIS_OFF_FRAMES = 2;

console.log(
  `[STARTUP-CONFIG] noteStabilizer default constants: threshold=${DEFAULT_STABILITY_THRESHOLD}, minOnFrames=${DEFAULT_MIN_ON_FRAMES}, hysteresisOffFrames=${DEFAULT_HYSTERESIS_OFF_FRAMES}`
);

/**
 * Configuration options for note stabilization logic.
 */
export interface NoteStabilizerConfig {
  /**
   * Confidence threshold (0.0 to 1.0) for considering an activation candidate.
   * @default DEFAULT_STABILITY_THRESHOLD (0.45)
   */
  threshold?: number;

  /**
   * Minimum consecutive frames above threshold before a note activates.
   * @default DEFAULT_MIN_ON_FRAMES (2)
   */
  minOnFrames?: number;

  /**
   * Consecutive frames below threshold before an active note deactivates.
   * @default DEFAULT_HYSTERESIS_OFF_FRAMES (2)
   */
  hysteresisOffFrames?: number;
}

/**
 * Compare two sorted number arrays for element-by-element equality.
 */
export function areNoteSetsEqual(
  a: readonly number[],
  b: readonly number[]
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * State machine that stabilizes raw per-buffer note activations.
 * Maintains onset debounce counters and offset hysteresis counters across
 * the 88 piano keys (MIDI 21 to 108).
 */
export class NoteStabilizer {
  private config: Required<NoteStabilizerConfig>;
  private onCounters: Uint8Array;
  private offCounters: Uint8Array;
  private activeFlags: Uint8Array;
  private currentActiveNotes: number[] = [];

  constructor(config: NoteStabilizerConfig = {}) {
    this.config = {
      threshold: config.threshold ?? DEFAULT_STABILITY_THRESHOLD,
      minOnFrames: config.minOnFrames ?? DEFAULT_MIN_ON_FRAMES,
      hysteresisOffFrames:
        config.hysteresisOffFrames ?? DEFAULT_HYSTERESIS_OFF_FRAMES,
    };
    this.onCounters = new Uint8Array(PIANO.totalKeys);
    this.offCounters = new Uint8Array(PIANO.totalKeys);
    this.activeFlags = new Uint8Array(PIANO.totalKeys);
  }

  /**
   * Update tuning parameters dynamically.
   */
  public updateConfig(config: Partial<NoteStabilizerConfig>): void {
    if (config.threshold !== undefined) {
      this.config.threshold = config.threshold;
    }
    if (config.minOnFrames !== undefined) {
      this.config.minOnFrames = config.minOnFrames;
    }
    if (config.hysteresisOffFrames !== undefined) {
      this.config.hysteresisOffFrames = config.hysteresisOffFrames;
    }
  }

  /**
   * Retrieve current tuning configuration.
   */
  public getConfig(): Readonly<Required<NoteStabilizerConfig>> {
    return this.config;
  }

  /**
   * Reset all onset/offset counters and active note state.
   */
  public reset(): void {
    this.onCounters.fill(0);
    this.offCounters.fill(0);
    this.activeFlags.fill(0);
    this.currentActiveNotes = [];
  }

  /**
   * Process a single buffer frame of 88-element confidence scores.
   *
   * @param scores - 88-element Float32Array of pitch activations (index 0 = A0 / MIDI 21)
   * @returns current stabilized active MIDI note numbers (sorted ascending) and whether the active set changed
   */
  public processFrame(scores: Float32Array): {
    activeNotes: number[];
    hasChanged: boolean;
  } {
    const { threshold, minOnFrames, hysteresisOffFrames } = this.config;
    let hasChanged = false;

    for (let i = 0; i < PIANO.totalKeys; i++) {
      const conf = scores[i] ?? 0;
      const isCurrentlyActive = this.activeFlags[i] === 1;

      if (conf >= threshold) {
        // Signal above threshold: reset drop counter
        this.offCounters[i] = 0;

        if (!isCurrentlyActive) {
          // Debounce onset: must sustain above threshold for minOnFrames
          this.onCounters[i]++;
          if (this.onCounters[i] >= minOnFrames) {
            this.activeFlags[i] = 1;
            hasChanged = true;
          }
        } else {
          // Maintain saturated onset counter while active
          this.onCounters[i] = minOnFrames;
        }
      } else {
        // Signal below threshold: reset onset counter
        this.onCounters[i] = 0;

        if (isCurrentlyActive) {
          // Hysteresis window: must stay below threshold for hysteresisOffFrames before turning off
          this.offCounters[i]++;
          if (this.offCounters[i] >= hysteresisOffFrames) {
            this.activeFlags[i] = 0;
            this.offCounters[i] = 0;
            hasChanged = true;
          }
        }
      }
    }

    if (hasChanged) {
      const nextNotes: number[] = [];
      for (let i = 0; i < PIANO.totalKeys; i++) {
        if (this.activeFlags[i] === 1) {
          nextNotes.push(PIANO.minMidi + i);
        }
      }
      this.currentActiveNotes = nextNotes;

      console.log(
        `[3-STABILIZED] activeNotes=[${this.currentActiveNotes.join(', ')}] | threshold=${threshold} | minOnFrames=${minOnFrames} | hysteresisOffFrames=${hysteresisOffFrames}`
      );
    }

    return {
      activeNotes: this.currentActiveNotes,
      hasChanged,
    };
  }

  /**
   * Return the current array of stabilized active MIDI numbers.
   */
  public getActiveNotes(): number[] {
    return this.currentActiveNotes;
  }
}

/**
 * Singleton instance of NoteStabilizer for shared audio pipelines.
 */
export const noteStabilizer = new NoteStabilizer();

/**
 * Options for the useStableNotes hook.
 */
export interface UseStableNotesOptions extends NoteStabilizerConfig {
  /**
   * Optional raw per-buffer note confidence scores (88 piano keys).
   * If omitted, useStableNotes subscribes directly to live audio capture and model inference.
   */
  scores?: Float32Array;

  /**
   * Whether audio stream and note detection should be active in live mode.
   * @default true
   */
  autoStart?: boolean;

  /**
   * Callback fired ONLY when the stabilized set of active notes actually changes.
   */
  onStableNotesChange?: (activeNotes: number[]) => void;
}

/**
 * React hook that applies onset debouncing and drop hysteresis to note activations.
 * Returns the current stabilized set of active MIDI notes, updating ONLY when the
 * stabilized set actually changes (not on every raw frame).
 */
export function useStableNotes(
  scoresOrOptions?: Float32Array | UseStableNotesOptions,
  maybeOptions?: UseStableNotesOptions
): number[] {
  let providedScores: Float32Array | undefined;
  let options: UseStableNotesOptions = {};

  if (scoresOrOptions instanceof Float32Array) {
    providedScores = scoresOrOptions;
    if (maybeOptions) {
      options = maybeOptions;
    }
  } else if (scoresOrOptions && typeof scoresOrOptions === 'object') {
    options = scoresOrOptions;
    providedScores = options.scores;
  }

  const {
    threshold = DEFAULT_STABILITY_THRESHOLD,
    minOnFrames = DEFAULT_MIN_ON_FRAMES,
    hysteresisOffFrames = DEFAULT_HYSTERESIS_OFF_FRAMES,
    autoStart = true,
    onStableNotesChange,
  } = options;

  const [stableNotes, setStableNotes] = useState<number[]>([]);

  const [stabilizer] = useState(
    () =>
      new NoteStabilizer({
        threshold,
        minOnFrames,
        hysteresisOffFrames,
      })
  );

  // Keep config in sync with options
  useEffect(() => {
    stabilizer.updateConfig({
      threshold,
      minOnFrames,
      hysteresisOffFrames,
    });
  }, [stabilizer, threshold, minOnFrames, hysteresisOffFrames]);

  // Log active configuration once at startup
  const loggedStartupRef = useRef(false);
  useEffect(() => {
    if (!loggedStartupRef.current) {
      loggedStartupRef.current = true;
      console.log(
        `[STARTUP-CONFIG] NoteStabilizer in effect: threshold=${threshold}, minOnFrames=${minOnFrames}, hysteresisOffFrames=${hysteresisOffFrames}`
      );
    }
  }, [threshold, minOnFrames, hysteresisOffFrames]);

  const onStableNotesChangeRef = useRef(onStableNotesChange);
  useEffect(() => {
    onStableNotesChangeRef.current = onStableNotesChange;
  }, [onStableNotesChange]);

  const isInferringRef = useRef(false);

  // Live audio capture & on-device model inference pipeline
  useEffect(() => {
    if (providedScores) {
      return;
    }
    if (!autoStart) {
      return;
    }

    let isMounted = true;

    // Ensure model is loaded once
    noteDetectionModel.loadModel().catch((err) => {
      console.warn('Failed to load note detection model in useStableNotes:', err);
    });

    // Subscribe directly to audio capture buffers at the hop interval
    const unsubBuffer = audioCapture.subscribe(async (buffer) => {
      if (!isMounted) return;
      if (isInferringRef.current) {
        // Skip frame if inference is still busy to prevent backlog lag
        return;
      }

      isInferringRef.current = true;
      try {
        const result = await noteDetectionModel.predictNotes(buffer);
        if (!isMounted) return;

        // Process raw scores through onset debouncing and offset hysteresis
        const { activeNotes, hasChanged } = stabilizer.processFrame(result.scores);

        // Update React state ONLY when the stabilized set actually changes
        if (hasChanged && isMounted) {
          setStableNotes(activeNotes);
        }
      } catch (err) {
        console.warn('Inference error in useStableNotes:', err);
      } finally {
        isInferringRef.current = false;
      }
    });

    audioCapture.start().catch((err) => {
      console.warn('Audio capture start error in useStableNotes:', err);
    });

    return () => {
      isMounted = false;
      unsubBuffer();
      stabilizer.reset();
    };
  }, [autoStart, providedScores, stabilizer]);

  // Adjust state during render when providedScores changes (React 19 pattern)
  const [prevScores, setPrevScores] = useState<Float32Array | undefined>(
    providedScores
  );
  if (providedScores && providedScores !== prevScores) {
    setPrevScores(providedScores);
    const { activeNotes, hasChanged } = stabilizer.processFrame(providedScores);
    if (hasChanged) {
      setStableNotes(activeNotes);
    }
  }

  // Notify consumer whenever stabilized notes set updates
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onStableNotesChangeRef.current?.(stableNotes);
  }, [stableNotes]);

  return stableNotes;
}
