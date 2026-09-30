import {
  PITCH_CLASS_NAMES,
  type PitchClassName,
  type ChordCandidate,
  type ChordResult,
  type ChordTemplate,
} from './types';
import { CHORD_TEMPLATES } from './chordDictionary';

/**
 * Weights and scoring parameters for chord pattern matching.
 */
const SCORE_PARAMS = {
  // Bonus when the lowest note (bass) matches the chord root
  BASS_IS_ROOT_BONUS: 3.5,

  // Bonus when the bass note is a valid inverted chord tone (3rd, 5th, 7th)
  BASS_IS_CHORD_TONE_BONUS: 0.8,

  // Penalty for each active pitch class that does not belong to the candidate chord
  UNEXPLAINED_TONE_PENALTY: 3.5,

  // Penalty when a required (non-optional) chord tone is missing
  MISSING_REQUIRED_TONE_PENALTY: 2.5,

  // Bonus for extended color chords (9th, 11th, 13th) when their defining extensions are matched
  EXTENDED_SPECIFICITY_BONUS: 1.0,

  // Bonus when all tones of a chord are present with 0 unexplained tones
  COMPLETE_MATCH_BONUS: 1.2,
} as const;

/**
 * Normalizes an array of MIDI notes into unique pitch classes (0-11)
 * and identifies the lowest sounding note as the bass candidate.
 */
export function analyzePitchClasses(activeMidiNotes: readonly number[]): {
  pitchClasses: Set<number>;
  bassPitchClass: number | null;
  bassNoteName: PitchClassName | '';
  sortedActiveNotes: PitchClassName[];
} {
  if (activeMidiNotes.length === 0) {
    return {
      pitchClasses: new Set(),
      bassPitchClass: null,
      bassNoteName: '',
      sortedActiveNotes: [],
    };
  }

  // Find lowest MIDI note (bass)
  let lowestMidi = activeMidiNotes[0];
  for (let i = 1; i < activeMidiNotes.length; i++) {
    if (activeMidiNotes[i] < lowestMidi) {
      lowestMidi = activeMidiNotes[i];
    }
  }

  const bassPitchClass = ((lowestMidi % 12) + 12) % 12;
  const bassNoteName = PITCH_CLASS_NAMES[bassPitchClass];

  const pitchClasses = new Set<number>();
  for (const midi of activeMidiNotes) {
    pitchClasses.add(((midi % 12) + 12) % 12);
  }

  const sortedActiveNotes = Array.from(pitchClasses)
    .sort((a, b) => a - b)
    .map((pc) => PITCH_CLASS_NAMES[pc]);

  return {
    pitchClasses,
    bassPitchClass,
    bassNoteName,
    sortedActiveNotes,
  };
}

/**
 * Evaluates a single (root, template) candidate against active pitch classes.
 */
function scoreCandidate(
  rootPitchClass: number,
  template: ChordTemplate,
  activePitchClasses: Set<number>,
  bassPitchClass: number | null
): ChordCandidate | null {
  const rootName = PITCH_CLASS_NAMES[rootPitchClass];
  let rawScore = 0;
  let maxPossibleScore = 0;
  let matchedTonesCount = 0;
  let rootIsPresent = false;
  let thirdIsPresent = false;
  let seventhIsPresent = false;
  let extensionIsPresent = false;

  const candidatePitchClasses = new Set<number>();

  for (const tone of template.tones) {
    const tonePc = (rootPitchClass + tone.semitones) % 12;
    candidatePitchClasses.add(tonePc);
    maxPossibleScore += tone.weight;

    const isPresent = activePitchClasses.has(tonePc);

    if (isPresent) {
      rawScore += tone.weight;
      matchedTonesCount++;
      if (tone.role === 'root') rootIsPresent = true;
      if (tone.role === 'third') thirdIsPresent = true;
      if (tone.role === 'seventh') seventhIsPresent = true;
      if (tone.role === 'extension' || tone.role === 'altered') {
        extensionIsPresent = true;
      }
    } else {
      // Missing required tone
      if (!tone.optional) {
        rawScore -= SCORE_PARAMS.MISSING_REQUIRED_TONE_PENALTY;
      }
    }
  }

  // 1. Seventh and Extended chord rules:
  // Any 7th or extended chord MUST have its defining 7th present
  const isSeventhOrExtended =
    template.quality === 'dom7' ||
    template.quality === 'maj7' ||
    template.quality === 'm7' ||
    template.quality === 'dim7' ||
    template.quality === 'm7b5' ||
    template.quality === '9' ||
    template.quality === 'm9' ||
    template.quality === 'maj9' ||
    template.quality === '11' ||
    template.quality === '13' ||
    template.quality === '7#9' ||
    template.quality === '7b9' ||
    template.quality === '7#5' ||
    template.quality === '7b5';

  if (isSeventhOrExtended && !seventhIsPresent) {
    return null;
  }

  // 2. Chords with a 3rd (major, minor, etc.) MUST have their 3rd present (unless sus2/sus4)
  const isSuspended = template.quality === 'sus2' || template.quality === 'sus4';
  if (!isSuspended && !thirdIsPresent && template.quality !== '11') {
    return null;
  }

  // 3. Rootless Voicing Rules:
  // Rootless voicings are only valid for extended chords (maj9, m9, 9, 11, 13)
  // that have at least 4 active notes and both guide tones (3rd and 7th) + extension present.
  const isRootless = !rootIsPresent && Boolean(template.supportsRootless);

  if (!rootIsPresent) {
    if (!template.supportsRootless) {
      return null;
    }
    // Must have at least 4 notes, 3rd, 7th, and extension
    if (
      activePitchClasses.size < 4 ||
      matchedTonesCount < 3 ||
      !thirdIsPresent ||
      !seventhIsPresent ||
      !extensionIsPresent
    ) {
      return null;
    }
  }

  // Basic triads require root
  if (!rootIsPresent && !isRootless) {
    return null;
  }

  // Must match at least 2 tones
  if (matchedTonesCount < 2) {
    return null;
  }

  // Count unexplained extra notes in the active set
  let unexplainedCount = 0;
  for (const pc of activePitchClasses) {
    if (!candidatePitchClasses.has(pc)) {
      unexplainedCount++;
    }
  }
  rawScore -= unexplainedCount * SCORE_PARAMS.UNEXPLAINED_TONE_PENALTY;

  // Complete match bonus if all active pitch classes are explained
  if (unexplainedCount === 0) {
    rawScore += SCORE_PARAMS.COMPLETE_MATCH_BONUS;
  }

  // Root presence bonus
  if (rootIsPresent) {
    rawScore += 2.0;
  }

  // Rootless extended chord bonus when 3rd, 5th, 7th, 9th are all present
  if (isRootless && matchedTonesCount >= 4) {
    rawScore += 5.8; // Allows textbook rootless Cmaj9 (E-G-B-D) to resolve to Cmaj9 over Em7
  }

  // Bass Note Alignment & Inversion / Slash analysis
  let isSlash = false;
  let bassNote = rootName;

  if (bassPitchClass !== null) {
    bassNote = PITCH_CLASS_NAMES[bassPitchClass];
    const bassIsRoot = bassPitchClass === rootPitchClass;

    if (bassIsRoot) {
      rawScore += SCORE_PARAMS.BASS_IS_ROOT_BONUS;
      isSlash = false;
    } else {
      const bassIsChordTone = candidatePitchClasses.has(bassPitchClass);
      if (bassIsChordTone) {
        rawScore += SCORE_PARAMS.BASS_IS_CHORD_TONE_BONUS;
      }

      // If root is present and bass is another tone, it is a slash/inversion (e.g. C/E, D/F#)
      if (!isRootless) {
        isSlash = true;
      }
    }
  }

  // Normalize confidence (0.0 to 1.0)
  maxPossibleScore +=
    SCORE_PARAMS.BASS_IS_ROOT_BONUS +
    SCORE_PARAMS.COMPLETE_MATCH_BONUS +
    SCORE_PARAMS.EXTENDED_SPECIFICITY_BONUS;
  const confidence = Math.max(0, Math.min(1, rawScore / maxPossibleScore));

  if (rawScore <= 0 || confidence < 0.15) {
    return null;
  }

  const baseSymbol = template.symbol;
  let displayName = `${rootName}${baseSymbol}`;
  if (isSlash) {
    displayName = `${rootName}${baseSymbol}/${bassNote}`;
  }

  const noteNames = Array.from(activePitchClasses)
    .sort((a, b) => a - b)
    .map((pc) => PITCH_CLASS_NAMES[pc]);

  return {
    root: rootName,
    quality: template.quality,
    bassNote,
    isSlash,
    isRootless,
    displayName,
    noteNames,
    confidence: Number(confidence.toFixed(3)),
    score: Number(rawScore.toFixed(3)),
  };
}

/**
 * Pure, framework-independent chord recognition engine.
 * Takes an array of currently active MIDI note numbers (from the stabilizer or keyboard)
 * and determines the best-fitting musical chord and 2nd-best alternative.
 *
 * @param activeMidiNotes - Array of active MIDI note numbers (e.g. [60, 64, 67])
 * @returns ChordResult with top candidate and secondBest candidate
 */
export function inferChord(activeMidiNotes: readonly number[]): ChordResult {
  const { pitchClasses, bassPitchClass, bassNoteName, sortedActiveNotes } =
    analyzePitchClasses(activeMidiNotes);

  if (pitchClasses.size === 0) {
    return {
      root: '',
      quality: '',
      bassNote: '',
      isSlash: false,
      displayName: '',
      noteNames: [],
      confidence: 0,
      secondBest: null,
    };
  }

  const candidates: ChordCandidate[] = [];

  // Evaluate all 12 roots against all chord templates
  for (let rootPc = 0; rootPc < 12; rootPc++) {
    for (const template of CHORD_TEMPLATES) {
      const candidate = scoreCandidate(
        rootPc,
        template,
        pitchClasses,
        bassPitchClass
      );
      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  if (candidates.length === 0) {
    // Single note fallback or unrecognized cluster
    const singleRoot = bassNoteName || sortedActiveNotes[0] || '';
    return {
      root: singleRoot,
      quality: '',
      bassNote: singleRoot,
      isSlash: false,
      displayName: singleRoot,
      noteNames: sortedActiveNotes,
      confidence: 0.3,
      secondBest: null,
    };
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  const top = candidates[0];
  let secondBest: ChordCandidate | null = null;

  // Find the highest-scoring candidate with a distinct display name
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].displayName !== top.displayName) {
      secondBest = candidates[i];
      break;
    }
  }

  return {
    root: top.root,
    quality: top.quality,
    bassNote: top.bassNote,
    isSlash: top.isSlash,
    displayName: top.displayName,
    noteNames: sortedActiveNotes,
    confidence: top.confidence,
    secondBest,
  };
}
