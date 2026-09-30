/**
 * Single source of truth for chord recognition engine types.
 * Pure, framework-independent TypeScript definitions.
 */

export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const PITCH_CLASS_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type PitchClassName = (typeof PITCH_CLASS_NAMES)[number];

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4'
  | '6'
  | 'm6'
  | 'maj7'
  | 'm7'
  | 'dom7'
  | 'dim7'
  | 'm7b5'
  | '9'
  | 'm9'
  | 'maj9'
  | '11'
  | '13'
  | '7#9'
  | '7b9'
  | '7#5'
  | '7b5'
  | 'add9';

export type ToneRole =
  | 'root'
  | 'third'
  | 'fifth'
  | 'seventh'
  | 'extension'
  | 'altered';

export interface ChordToneDef {
  /**
   * Semitones relative to root (0-11 mod 12).
   */
  semitones: number;

  /**
   * Musical harmonic role of this tone.
   */
  role: ToneRole;

  /**
   * Importance weight of this tone in defining the chord quality.
   */
  weight: number;

  /**
   * Whether this tone can be omitted without destroying chord identity (e.g. 5ths, rootless voicings).
   */
  optional?: boolean;
}

export interface ChordTemplate {
  /**
   * Semantic quality identifier.
   */
  quality: ChordQuality;

  /**
   * Standard chord symbol suffix (e.g. '', 'm', 'maj7', '7', 'dim', '7#9').
   */
  symbol: string;

  /**
   * Human-readable full name.
   */
  name: string;

  /**
   * Constituent interval definitions.
   */
  tones: ChordToneDef[];

  /**
   * Whether this chord template supports rootless voicings (omitted root).
   */
  supportsRootless?: boolean;
}

export interface ChordCandidate {
  /**
   * Best-fit root note name (e.g. 'C', 'F#').
   */
  root: string;

  /**
   * Chord quality identifier (e.g. 'major', 'm7', 'maj9').
   */
  quality: ChordQuality;

  /**
   * Lowest note played in the active voicing.
   */
  bassNote: string;

  /**
   * True if the bass note is not the chord root.
   */
  isSlash: boolean;

  /**
   * True if the root was omitted in the voicing (rootless jazz voicing).
   */
  isRootless?: boolean;

  /**
   * Formatted display label (e.g. 'C', 'Am7', 'D/F#', 'Cmaj9').
   */
  displayName: string;

  /**
   * Pitch class note names present in the chord.
   */
  noteNames: string[];

  /**
   * Confidence score from 0.0 to 1.0.
   */
  confidence: number;

  /**
   * Internal raw scoring point value.
   */
  score: number;
}

export interface ChordResult {
  /**
   * Best-fit root note name (empty string if no chord detected).
   */
  root: string;

  /**
   * Chord quality identifier.
   */
  quality: string;

  /**
   * Lowest note in the active voicing.
   */
  bassNote: string;

  /**
   * Whether the chord is an inverted / slash chord.
   */
  isSlash: boolean;

  /**
   * Formatted display name (e.g. 'C', 'Am7', 'D/F#', 'Cmaj9').
   */
  displayName: string;

  /**
   * Constituent pitch class note names.
   */
  noteNames: string[];

  /**
   * Overall confidence score (0.0 to 1.0).
   */
  confidence: number;

  /**
   * Second-best candidate for ambiguity resolution.
   */
  secondBest: ChordCandidate | null;
}
