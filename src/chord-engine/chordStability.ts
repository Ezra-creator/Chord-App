import type { ChordResult } from './types';

/**
 * ============================================================================
 * CONFIGURABLE CONSTANTS (CHORD STABILITY DYNAMICS)
 * ============================================================================
 * These constants control how quickly a newly detected chord candidate is
 * "committed", preventing display flicker on passing tones and finger slips.
 */

/**
 * Minimum consecutive updates a candidate chord must remain the top candidate
 * before it is committed to display.
 */
export const DEFAULT_MIN_CHORD_COMMIT_FRAMES = 2;

/**
 * Minimum continuous duration (in milliseconds) a candidate chord must be
 * sustained before it is committed.
 */
export const DEFAULT_MIN_CHORD_COMMIT_MS = 250;

/**
 * Consecutive empty updates required before the committed chord is cleared to silence.
 */
export const DEFAULT_CHORD_CLEAR_FRAMES = 2;

export interface ChordStabilityConfig {
  /**
   * Minimum consecutive frames for chord commit.
   * @default DEFAULT_MIN_CHORD_COMMIT_FRAMES (2)
   */
  minCommitFrames?: number;

  /**
   * Minimum duration in milliseconds for chord commit.
   * @default DEFAULT_MIN_CHORD_COMMIT_MS (250)
   */
  minCommitMs?: number;

  /**
   * Consecutive empty frames before clearing chord.
   * @default DEFAULT_CHORD_CLEAR_FRAMES (2)
   */
  clearFrames?: number;
}

/**
 * Checks if two ChordResult instances represent the same musical chord.
 */
export function areChordsEqual(
  a: ChordResult | null,
  b: ChordResult | null
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  const aEmpty = !a.root || a.confidence === 0;
  const bEmpty = !b.root || b.confidence === 0;
  if (aEmpty && bEmpty) return true;
  if (aEmpty !== bEmpty) return false;

  return (
    a.displayName === b.displayName &&
    a.isSlash === b.isSlash &&
    a.bassNote === b.bassNote
  );
}

/**
 * Hook-free, pure TypeScript state machine that stabilizes raw chord candidates.
 *
 * Prevents rapid visual chord flicker when pianists play passing tones, grace notes,
 * or voice-lead between chords by requiring a candidate to sustain for a minimum
 * duration / consecutive frames before committing.
 */
export class ChordStabilizer {
  private config: Required<ChordStabilityConfig>;
  private committedChord: ChordResult | null = null;
  private pendingCandidate: ChordResult | null = null;
  private pendingFrames: number = 0;
  private pendingStartTime: number = 0;
  private clearFramesCount: number = 0;

  constructor(config: ChordStabilityConfig = {}) {
    this.config = {
      minCommitFrames:
        config.minCommitFrames ?? DEFAULT_MIN_CHORD_COMMIT_FRAMES,
      minCommitMs: config.minCommitMs ?? DEFAULT_MIN_CHORD_COMMIT_MS,
      clearFrames: config.clearFrames ?? DEFAULT_CHORD_CLEAR_FRAMES,
    };
  }

  /**
   * Update stability parameters dynamically.
   */
  public updateConfig(config: Partial<ChordStabilityConfig>): void {
    if (config.minCommitFrames !== undefined) {
      this.config.minCommitFrames = config.minCommitFrames;
    }
    if (config.minCommitMs !== undefined) {
      this.config.minCommitMs = config.minCommitMs;
    }
    if (config.clearFrames !== undefined) {
      this.config.clearFrames = config.clearFrames;
    }
  }

  /**
   * Retrieve current configuration.
   */
  public getConfig(): Readonly<Required<ChordStabilityConfig>> {
    return this.config;
  }

  /**
   * Reset all counters and clear committed state.
   */
  public reset(): void {
    this.committedChord = null;
    this.pendingCandidate = null;
    this.pendingFrames = 0;
    this.pendingStartTime = 0;
    this.clearFramesCount = 0;
  }

  /**
   * Return currently committed chord (null if silence/empty).
   */
  public getCommittedChord(): ChordResult | null {
    return this.committedChord;
  }

  /**
   * Process a new candidate chord result from inferChord.
   *
   * @param candidate - Output of inferChord
   * @param timestamp - Processing timestamp in ms (defaults to Date.now())
   * @returns current committed chord and whether it changed on this invocation
   */
  public processChord(
    candidate: ChordResult,
    timestamp: number = Date.now()
  ): {
    committedChord: ChordResult | null;
    hasChanged: boolean;
  } {
    const isCandidateEmpty = !candidate.root || candidate.confidence === 0;

    // Handle silence / empty input
    if (isCandidateEmpty) {
      this.clearFramesCount++;
      this.pendingCandidate = null;
      this.pendingFrames = 0;

      if (
        this.clearFramesCount >= this.config.clearFrames &&
        this.committedChord !== null
      ) {
        this.committedChord = null;
        return { committedChord: null, hasChanged: true };
      }

      return { committedChord: this.committedChord, hasChanged: false };
    }

    this.clearFramesCount = 0;

    // If candidate matches already committed chord, maintain it
    if (areChordsEqual(candidate, this.committedChord)) {
      this.pendingCandidate = null;
      this.pendingFrames = 0;
      return { committedChord: this.committedChord, hasChanged: false };
    }

    // If candidate matches the one currently pending confirmation
    if (areChordsEqual(candidate, this.pendingCandidate)) {
      this.pendingFrames++;
      const elapsed = timestamp - this.pendingStartTime;

      if (
        this.pendingFrames >= this.config.minCommitFrames ||
        elapsed >= this.config.minCommitMs
      ) {
        this.committedChord = candidate;
        this.pendingCandidate = null;
        this.pendingFrames = 0;
        return { committedChord: candidate, hasChanged: true };
      }

      return { committedChord: this.committedChord, hasChanged: false };
    }

    // New candidate arrived: start tracking it
    this.pendingCandidate = candidate;
    this.pendingFrames = 1;
    this.pendingStartTime = timestamp;

    if (this.config.minCommitFrames <= 1) {
      this.committedChord = candidate;
      this.pendingCandidate = null;
      this.pendingFrames = 0;
      return { committedChord: candidate, hasChanged: true };
    }

    return { committedChord: this.committedChord, hasChanged: false };
  }
}
