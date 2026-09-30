export interface PianoKeyInfo {
  midi: number;
  pitchClass: string;
  nameWithOctave: string;
  isBlack: boolean;
  leftPx: number;
  widthPx: number;
  centerPx: number;
  whiteIndex?: number;
  boundaryIndex?: number;
}

export const WHITE_KEY_WIDTH = 30;
export const TOTAL_WHITE_KEYS = 52;
export const TOTAL_CONTENT_WIDTH = TOTAL_WHITE_KEYS * WHITE_KEY_WIDTH; // 1560
export const BLACK_KEY_WIDTH = 0.58 * WHITE_KEY_WIDTH; // 17.4

export const MIN_MIDI = 21; // A0
export const MAX_MIDI = 108; // C8

/**
 * Position of each white note within its octave, in white-key-width units:
 * C=0, D=1, E=2, F=3, G=4, A=5, B=6.
 */
export const WHITE_UNITS: Record<number, number> = {
  0: 0, // C
  2: 1, // D
  4: 2, // E
  5: 3, // F
  7: 4, // G
  9: 5, // A
  11: 6, // B
};

/**
 * Position of each black note within its octave, in white-key-width units:
 * C#=0.58, D#=1.58, F#=3.48, G#=4.50, A#=5.52.
 * Intentionally asymmetric to replicate acoustic piano geometry.
 */
export const BLACK_UNITS: Record<number, number> = {
  1: 0.58, // C#
  3: 1.58, // D#
  6: 3.48, // F#
  8: 4.5, // G#
  10: 5.52, // A#
};

export const PITCH_CLASSES = [
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

/**
 * Anchor: MIDI 21 (A0) absolute position in white-key units.
 * octaveGroup = Math.floor(21 / 12) = 1, pitchClass = 21 % 12 = 9 (A) -> WHITE_UNITS[9] = 5.
 * Absolute position = (1 * 7) + 5 = 12.
 */
export const A0_ANCHOR =
  Math.floor(MIN_MIDI / 12) * 7 + WHITE_UNITS[MIN_MIDI % 12];

/**
 * Generically computes the layout geometry for any MIDI note.
 */
export function computeKeyLayout(midi: number): PianoKeyInfo {
  const pitchClassIndex = midi % 12;
  const octaveGroup = Math.floor(midi / 12);
  const pitchClass = PITCH_CLASSES[pitchClassIndex];
  const octave = octaveGroup - 1;
  const nameWithOctave = `${pitchClass}${octave}`;
  const isBlack = pitchClassIndex in BLACK_UNITS;

  const unit = isBlack
    ? BLACK_UNITS[pitchClassIndex]
    : WHITE_UNITS[pitchClassIndex];
  const absPos = octaveGroup * 7 + unit;
  const relPos = absPos - A0_ANCHOR;
  const leftPx = relPos * WHITE_KEY_WIDTH;
  const widthPx = isBlack ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH;
  const centerPx = isBlack ? leftPx + widthPx / 2 : leftPx + 15;

  return {
    midi,
    pitchClass,
    nameWithOctave,
    isBlack,
    leftPx,
    widthPx,
    centerPx,
  };
}

/**
 * Generates all 88 keys with generic proportional positions.
 */
export function generatePianoKeys(): {
  allKeys: PianoKeyInfo[];
  whiteKeys: PianoKeyInfo[];
  blackKeys: PianoKeyInfo[];
} {
  const allKeys: PianoKeyInfo[] = [];
  const whiteKeys: PianoKeyInfo[] = [];
  const blackKeys: PianoKeyInfo[] = [];
  let whiteIndex = 0;

  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
    const keyInfo = computeKeyLayout(midi);
    if (keyInfo.isBlack) {
      blackKeys.push(keyInfo);
    } else {
      keyInfo.whiteIndex = whiteIndex++;
      whiteKeys.push(keyInfo);
    }
    allKeys.push(keyInfo);
  }

  return { allKeys, whiteKeys, blackKeys };
}

export const {
  allKeys: PIANO_ALL_KEYS,
  whiteKeys: PIANO_WHITE_KEYS,
  blackKeys: PIANO_BLACK_KEYS,
} = generatePianoKeys();

const ENHARMONIC_MAP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

function normalizePitchClass(pc: string): string {
  return ENHARMONIC_MAP[pc] ?? pc;
}

export const isNoteActive = (
  key: PianoKeyInfo,
  activeNotes?: (number | string)[]
): boolean => {
  if (!activeNotes || activeNotes.length === 0) return false;
  return activeNotes.some((active) => {
    if (typeof active === 'number') {
      return active === key.midi;
    }
    const clean = active.trim();
    if (clean === key.midi.toString()) return true;
    if (clean === key.nameWithOctave) return true;
    if (clean === key.pitchClass) return true;

    // Check enharmonics (e.g. 'Db4' -> 'C#4' or 'Db' -> 'C#')
    const parsed = clean.match(/^([A-Ga-g][b#]?)(\d*)$/);
    if (parsed) {
      const pc = normalizePitchClass(
        parsed[1].charAt(0).toUpperCase() + parsed[1].slice(1).toLowerCase()
      );
      const oct = parsed[2];
      if (oct) {
        return `${pc}${oct}` === key.nameWithOctave;
      }
      return pc === key.pitchClass;
    }

    return false;
  });
};

/**
 * Computes the horizontal scroll offset to center the active chord.
 * Returns null if no active notes match or activeNotes is empty.
 */
export function computeAutoScrollOffset(
  activeNotes: (number | string)[],
  allKeys: PianoKeyInfo[],
  viewportWidth: number,
  contentWidth: number = TOTAL_CONTENT_WIDTH
): number | null {
  if (!activeNotes || activeNotes.length === 0 || viewportWidth <= 0) {
    return null;
  }

  const matchingKeys = allKeys.filter((key) => isNoteActive(key, activeNotes));
  if (matchingKeys.length === 0) {
    return null;
  }

  const totalCenter = matchingKeys.reduce((acc, k) => acc + k.centerPx, 0);
  const avgCenter = totalCenter / matchingKeys.length;

  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const targetX = avgCenter - viewportWidth / 2;
  return Math.max(0, Math.min(targetX, maxScroll));
}
