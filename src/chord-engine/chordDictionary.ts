import type { ChordTemplate } from './types';

/**
 * Root-independent interval templates for all standard chord qualities.
 *
 * Weighting philosophy:
 * - 3rds, 7ths, and defining extensions/alterations have the highest weights (3.5)
 *   because they uniquely identify the harmonic quality.
 * - Roots have weight (2.5) as the primary harmonic anchor, but can be omitted in
 *   extended rootless voicings.
 * - Perfect 5ths have lower weight (1.0) and are optional, reflecting standard
 *   pianistic practice where the 5th is routinely omitted without altering the chord identity.
 */
export const CHORD_TEMPLATES: readonly ChordTemplate[] = [
  // --------------------------------------------------------------------------
  // 1. Basic Triads
  // --------------------------------------------------------------------------
  {
    quality: 'major',
    symbol: '',
    name: 'Major',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
    ],
  },
  {
    quality: 'minor',
    symbol: 'm',
    name: 'Minor',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
    ],
  },
  {
    quality: 'diminished',
    symbol: 'dim',
    name: 'Diminished',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 6, role: 'fifth', weight: 3.0 },
    ],
  },
  {
    quality: 'augmented',
    symbol: 'aug',
    name: 'Augmented',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 8, role: 'fifth', weight: 3.0 },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. Suspended Chords
  // --------------------------------------------------------------------------
  {
    quality: 'sus2',
    symbol: 'sus2',
    name: 'Suspended 2nd',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 2, role: 'extension', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
    ],
  },
  {
    quality: 'sus4',
    symbol: 'sus4',
    name: 'Suspended 4th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 5, role: 'extension', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. Sixth Chords
  // --------------------------------------------------------------------------
  {
    quality: '6',
    symbol: '6',
    name: 'Major 6th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.5 },
      { semitones: 9, role: 'extension', weight: 3.5 },
    ],
  },
  {
    quality: 'm6',
    symbol: 'm6',
    name: 'Minor 6th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.5 },
      { semitones: 9, role: 'extension', weight: 3.5 },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. Seventh Chords
  // --------------------------------------------------------------------------
  {
    quality: 'maj7',
    symbol: 'maj7',
    name: 'Major 7th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 11, role: 'seventh', weight: 3.5 },
    ],
  },
  {
    quality: 'm7',
    symbol: 'm7',
    name: 'Minor 7th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
    ],
  },
  {
    quality: 'dom7',
    symbol: '7',
    name: 'Dominant 7th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
    ],
  },
  {
    quality: 'dim7',
    symbol: 'dim7',
    name: 'Diminished 7th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 6, role: 'fifth', weight: 3.0 },
      { semitones: 9, role: 'seventh', weight: 3.5 },
    ],
  },
  {
    quality: 'm7b5',
    symbol: 'm7b5',
    name: 'Half-Diminished 7th',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 6, role: 'fifth', weight: 3.0 },
      { semitones: 10, role: 'seventh', weight: 3.5 },
    ],
  },

  // --------------------------------------------------------------------------
  // 5. Extended Chords (9th, 11th, 13th)
  // --------------------------------------------------------------------------
  {
    quality: 'add9',
    symbol: 'add9',
    name: 'Added 9th',
    tones: [
      { semitones: 0, role: 'root', weight: 3.0 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.5, optional: true },
      { semitones: 2, role: 'extension', weight: 3.5 },
    ],
  },
  {
    quality: 'maj9',
    symbol: 'maj9',
    name: 'Major 9th',
    supportsRootless: true,
    tones: [
      { semitones: 0, role: 'root', weight: 2.5, optional: true },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 11, role: 'seventh', weight: 3.5 },
      { semitones: 2, role: 'extension', weight: 3.5 },
    ],
  },
  {
    quality: 'm9',
    symbol: 'm9',
    name: 'Minor 9th',
    supportsRootless: true,
    tones: [
      { semitones: 0, role: 'root', weight: 2.5, optional: true },
      { semitones: 3, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
      { semitones: 2, role: 'extension', weight: 3.5 },
    ],
  },
  {
    quality: '9',
    symbol: '9',
    name: 'Dominant 9th',
    supportsRootless: true,
    tones: [
      { semitones: 0, role: 'root', weight: 2.5, optional: true },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
      { semitones: 2, role: 'extension', weight: 3.5 },
    ],
  },
  {
    quality: '11',
    symbol: '11',
    name: 'Dominant 11th',
    supportsRootless: true,
    tones: [
      { semitones: 0, role: 'root', weight: 2.5, optional: true },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
      { semitones: 2, role: 'extension', weight: 3.0, optional: true },
      { semitones: 5, role: 'extension', weight: 3.5 },
    ],
  },
  {
    quality: '13',
    symbol: '13',
    name: 'Dominant 13th',
    supportsRootless: true,
    tones: [
      { semitones: 0, role: 'root', weight: 2.5, optional: true },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
      { semitones: 2, role: 'extension', weight: 2.5, optional: true },
      { semitones: 9, role: 'extension', weight: 3.5 },
    ],
  },

  // --------------------------------------------------------------------------
  // 6. Common Altered Dominants
  // --------------------------------------------------------------------------
  {
    quality: '7#9',
    symbol: '7#9',
    name: 'Dominant 7th Sharp 9',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
      { semitones: 3, role: 'altered', weight: 4.0 }, // #9 (15 semitones mod 12 = 3)
    ],
  },
  {
    quality: '7b9',
    symbol: '7b9',
    name: 'Dominant 7th Flat 9',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 7, role: 'fifth', weight: 1.0, optional: true },
      { semitones: 10, role: 'seventh', weight: 3.5 },
      { semitones: 1, role: 'altered', weight: 4.0 }, // b9 (13 semitones mod 12 = 1)
    ],
  },
  {
    quality: '7#5',
    symbol: '7#5',
    name: 'Dominant 7th Sharp 5',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 8, role: 'altered', weight: 4.0 }, // #5 (8 semitones)
      { semitones: 10, role: 'seventh', weight: 3.5 },
    ],
  },
  {
    quality: '7b5',
    symbol: '7b5',
    name: 'Dominant 7th Flat 5',
    tones: [
      { semitones: 0, role: 'root', weight: 2.5 },
      { semitones: 4, role: 'third', weight: 3.5 },
      { semitones: 6, role: 'altered', weight: 4.0 }, // b5 (6 semitones)
      { semitones: 10, role: 'seventh', weight: 3.5 },
    ],
  },
];
