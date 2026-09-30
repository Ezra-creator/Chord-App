import { inferChord } from '../chordEngine';
import { ChordStabilizer } from '../chordStability';

// Simple, framework-independent test runner for isolation testing
let passedCount = 0;
let failedCount = 0;

function describe(suiteName: string, fn: () => void): void {
  console.log(`\n[Suite] ${suiteName}`);
  fn();
}

function test(testName: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
    failedCount++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message ||
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Condition expected to be true');
  }
}

// ============================================================================
// 1. Root-Position Triads
// ============================================================================
describe('1. Root-position triads', () => {
  test('resolves C major triad (C4, E4, G4) to C', () => {
    // C4 = 60, E4 = 64, G4 = 67
    const result = inferChord([60, 64, 67]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'major');
    assertEqual(result.bassNote, 'C');
    assertEqual(result.isSlash, false);
    assertEqual(result.displayName, 'C');
    assertTrue(result.confidence > 0.8, 'Confidence should be high for root-position triad');
  });

  test('resolves A minor triad (A3, C4, E4) to Am', () => {
    // A3 = 57, C4 = 60, E4 = 64
    const result = inferChord([57, 60, 64]);
    assertEqual(result.root, 'A');
    assertEqual(result.quality, 'minor');
    assertEqual(result.bassNote, 'A');
    assertEqual(result.isSlash, false);
    assertEqual(result.displayName, 'Am');
    assertTrue(result.confidence > 0.8);
  });

  test('resolves G major triad (G3, B3, D4) to G', () => {
    // G3 = 55, B3 = 59, D4 = 62
    const result = inferChord([55, 59, 62]);
    assertEqual(result.root, 'G');
    assertEqual(result.quality, 'major');
    assertEqual(result.displayName, 'G');
  });

  test('resolves F major triad with octave doubling (F3, C4, F4, A4) to F', () => {
    // F3 = 53, C4 = 60, F4 = 65, A4 = 69
    const result = inferChord([53, 60, 65, 69]);
    assertEqual(result.root, 'F');
    assertEqual(result.quality, 'major');
    assertEqual(result.displayName, 'F');
  });
});

// ============================================================================
// 2. All Inversions of a C Major Triad
// ============================================================================
describe('2. All inversions of a C major triad', () => {
  test('Root position: C4-E4-G4 resolves to C', () => {
    const result = inferChord([60, 64, 67]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'major');
    assertEqual(result.bassNote, 'C');
    assertEqual(result.isSlash, false);
    assertEqual(result.displayName, 'C');
  });

  test('First inversion: E4-G4-C5 resolves to C/E', () => {
    // E4 = 64, G4 = 67, C5 = 72 (lowest sounding note is E4)
    const result = inferChord([64, 67, 72]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'major');
    assertEqual(result.bassNote, 'E');
    assertEqual(result.isSlash, true);
    assertEqual(result.displayName, 'C/E');
  });

  test('Second inversion: G4-C5-E5 resolves to C/G', () => {
    // G4 = 67, C5 = 72, E5 = 76 (lowest sounding note is G4)
    const result = inferChord([67, 72, 76]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'major');
    assertEqual(result.bassNote, 'G');
    assertEqual(result.isSlash, true);
    assertEqual(result.displayName, 'C/G');
  });
});

// ============================================================================
// 3. Rootless Cmaj9 Voicing (E-G-B-D)
// ============================================================================
describe('3. Rootless Cmaj9 voicing (E-G-B-D)', () => {
  test('resolves E4-G4-B4-D5 to Cmaj9', () => {
    // E4 = 64, G4 = 67, B4 = 71, D5 = 74
    // Textbook jazz rootless Type-A voicing: 3rd (E), 5th (G), 7th (B), 9th (D)
    const result = inferChord([64, 67, 71, 74]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'maj9');
    assertEqual(result.displayName, 'Cmaj9');
    assertTrue(result.confidence > 0.65, 'Confidence should be high for rootless Cmaj9');

    // Confirm that the second-best candidate captures the alternate interpretation (Em7)
    assertTrue(result.secondBest !== null, 'Second-best candidate should be present');
    assertEqual(result.secondBest?.root, 'E');
    assertEqual(result.secondBest?.quality, 'm7');
  });
});

// ============================================================================
// 4. Slash Chord (D triad over F# bass)
// ============================================================================
describe('4. Slash chord (D triad over F# bass)', () => {
  test('resolves F#3-D4-F#4-A4 to D/F#', () => {
    // F#3 = 54, D4 = 62, F#4 = 66, A4 = 69
    const result = inferChord([54, 62, 66, 69]);
    assertEqual(result.root, 'D');
    assertEqual(result.quality, 'major');
    assertEqual(result.bassNote, 'F#');
    assertEqual(result.isSlash, true);
    assertEqual(result.displayName, 'D/F#');
  });

  test('resolves F#3-A3-D4 to D/F#', () => {
    // F#3 = 54, A3 = 57, D4 = 62
    const result = inferChord([54, 57, 62]);
    assertEqual(result.root, 'D');
    assertEqual(result.quality, 'major');
    assertEqual(result.bassNote, 'F#');
    assertEqual(result.isSlash, true);
    assertEqual(result.displayName, 'D/F#');
  });
});

// ============================================================================
// 5. Chord with an Added 9th
// ============================================================================
describe('5. Chord with an added 9th', () => {
  test('resolves C4-E4-G4-D5 to Cadd9', () => {
    // C4 = 60, E4 = 64, G4 = 67, D5 = 74
    const result = inferChord([60, 64, 67, 74]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'add9');
    assertEqual(result.isSlash, false);
    assertEqual(result.displayName, 'Cadd9');
    assertTrue(result.confidence > 0.8);
  });

  test('resolves G3-B3-D4-A4 to Gadd9', () => {
    // G3 = 55, B3 = 59, D4 = 62, A4 = 69
    const result = inferChord([55, 59, 62, 69]);
    assertEqual(result.root, 'G');
    assertEqual(result.quality, 'add9');
    assertEqual(result.displayName, 'Gadd9');
  });
});

// ============================================================================
// 6. Seventh & Altered Chords
// ============================================================================
describe('6. Seventh & Altered Chords', () => {
  test('resolves C dominant 7th (C-E-G-Bb) to C7', () => {
    // C4 = 60, E4 = 64, G4 = 67, A#4/Bb4 = 70
    const result = inferChord([60, 64, 67, 70]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, 'dom7');
    assertEqual(result.displayName, 'C7');
  });

  test('resolves Hendrix chord C7#9 (C4, E4, Bb4, D#5) to C7#9', () => {
    // C4 = 60, E4 = 64, Bb4 = 70, D#5 = 75
    const result = inferChord([60, 64, 70, 75]);
    assertEqual(result.root, 'C');
    assertEqual(result.quality, '7#9');
    assertEqual(result.displayName, 'C7#9');
  });
});

// ============================================================================
// 7. Chord Stability State Machine
// ============================================================================
describe('7. ChordStabilizer', () => {
  test('requires minimum consecutive frames before committing a new chord', () => {
    const stabilizer = new ChordStabilizer({ minCommitFrames: 2 });
    const chordC = inferChord([60, 64, 67]); // C
    const chordF = inferChord([53, 60, 65, 69]); // F

    // Frame 1 of C
    let step = stabilizer.processChord(chordC, 100);
    assertEqual(step.committedChord, null, 'Frame 1: not committed yet');
    assertEqual(step.hasChanged, false);

    // Frame 2 of C
    step = stabilizer.processChord(chordC, 250);
    assertEqual(step.committedChord?.displayName, 'C', 'Frame 2: C committed');
    assertEqual(step.hasChanged, true);

    // Passing tone: 1 frame of F
    step = stabilizer.processChord(chordF, 400);
    assertEqual(
      step.committedChord?.displayName,
      'C',
      'Passing tone F does not immediately replace C'
    );
    assertEqual(step.hasChanged, false);

    // Back to C: passing tone ignored
    step = stabilizer.processChord(chordC, 550);
    assertEqual(step.committedChord?.displayName, 'C');
    assertEqual(step.hasChanged, false);

    // Now sustain F for 2 consecutive frames
    step = stabilizer.processChord(chordF, 700);
    assertEqual(step.committedChord?.displayName, 'C'); // Frame 1 of sustained F
    assertEqual(step.hasChanged, false);

    step = stabilizer.processChord(chordF, 850);
    assertEqual(
      step.committedChord?.displayName,
      'F',
      'Frame 2 of sustained F: committed'
    );
    assertEqual(step.hasChanged, true);
  });

  test('clears committed chord after consecutive empty/silent frames', () => {
    const stabilizer = new ChordStabilizer({
      minCommitFrames: 1,
      clearFrames: 2,
    });
    const chordC = inferChord([60, 64, 67]);
    const emptyChord = inferChord([]);

    // Commit C
    stabilizer.processChord(chordC);
    assertEqual(stabilizer.getCommittedChord()?.displayName, 'C');

    // Empty frame 1: remains committed
    let step = stabilizer.processChord(emptyChord);
    assertEqual(step.committedChord?.displayName, 'C');
    assertEqual(step.hasChanged, false);

    // Empty frame 2: clears
    step = stabilizer.processChord(emptyChord);
    assertEqual(step.committedChord, null);
    assertEqual(step.hasChanged, true);
  });
});

console.log(`\n============================================================`);
console.log(`Test Summary: ${passedCount} passed, ${failedCount} failed`);
console.log(`============================================================\n`);

if (failedCount > 0) {
  (globalThis as any).process?.exit(1);
}
