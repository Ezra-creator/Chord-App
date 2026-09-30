import {
  computeKeyLayout,
  generatePianoKeys,
  computeAutoScrollOffset,
  isNoteActive,
  WHITE_KEY_WIDTH,
  TOTAL_WHITE_KEYS,
  TOTAL_CONTENT_WIDTH,
  BLACK_KEY_WIDTH,
  MIN_MIDI,
  MAX_MIDI,
  WHITE_UNITS,
  BLACK_UNITS,
  A0_ANCHOR,
} from '../pianoLayout';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

function assertApprox(
  actual: number,
  expected: number,
  epsilon: number,
  message: string
) {
  if (Math.abs(actual - expected) > epsilon) {
    console.error(
      `  ✗ FAIL: ${message} (expected ~${expected}, got ${actual})`
    );
    throw new Error(
      `${message}: expected ~${expected}, got ${actual}`
    );
  }
  console.log(`  ✓ ${message} (${actual} ~= ${expected})`);
}

console.log('\n[Suite] 1. 88-Key Dimensions and Key Counts');
{
  const { allKeys, whiteKeys, blackKeys } = generatePianoKeys();

  assert(allKeys.length === 88, 'Total keys generated is exactly 88');
  assert(whiteKeys.length === 52, 'Total white keys is exactly 52');
  assert(blackKeys.length === 36, 'Total black keys is exactly 36');
  assert(WHITE_KEY_WIDTH === 30, 'Each white key width is 30px');
  assert(
    TOTAL_CONTENT_WIDTH === 1560,
    'Keyboard total content width is exactly 52 * 30 = 1560px'
  );
  assertApprox(
    BLACK_KEY_WIDTH,
    17.4,
    0.001,
    'Black key width is 0.58 * 30 = 17.4px'
  );
  assert(TOTAL_WHITE_KEYS === 52, 'TOTAL_WHITE_KEYS is 52');
  assert(WHITE_UNITS[0] === 0, 'WHITE_UNITS for C is 0');
  assert(BLACK_UNITS[1] === 0.58, 'BLACK_UNITS for C# is 0.58');
  assert(A0_ANCHOR === 12, 'A0_ANCHOR absolute position is 12');
}

console.log('\n[Suite] 2. Anchor and Boundaries (MIDI 21 to 108)');
{
  const { allKeys } = generatePianoKeys();
  const firstKey = allKeys[0];
  const lastKey = allKeys[allKeys.length - 1];

  assert(firstKey.midi === MIN_MIDI, 'First key is MIDI 21 (A0)');
  assert(firstKey.nameWithOctave === 'A0', 'First key is named A0');
  assert(!firstKey.isBlack, 'A0 is a white key');
  assert(firstKey.leftPx === 0, 'A0 is anchored at relative position 0px');
  assert(firstKey.centerPx === 15, 'A0 center is at 15px (left + 15)');

  assert(lastKey.midi === MAX_MIDI, 'Last key is MIDI 108 (C8)');
  assert(lastKey.nameWithOctave === 'C8', 'Last key is named C8');
  assert(!lastKey.isBlack, 'C8 is a white key');
  assert(lastKey.leftPx === 1530, 'C8 left position is at 51 * 30 = 1530px');
  assert(
    lastKey.leftPx + lastKey.widthPx === 1560,
    'C8 right edge completes the 1560px total content width'
  );
  assert(lastKey.centerPx === 1545, 'C8 center is at 1545px');
}

console.log('\n[Suite] 3. Proportional Black Key Positioning & Acoustic Piano Spacing');
{
  // C4 is MIDI 60 (octave 4)
  const c4 = computeKeyLayout(60);
  const cs4 = computeKeyLayout(61); // C#4
  const d4 = computeKeyLayout(62);
  const ds4 = computeKeyLayout(63); // D#4
  const e4 = computeKeyLayout(64);
  const f4 = computeKeyLayout(65);
  const fs4 = computeKeyLayout(66); // F#4
  const g4 = computeKeyLayout(67);
  const gs4 = computeKeyLayout(68); // G#4
  const a4 = computeKeyLayout(69);
  const as4 = computeKeyLayout(70); // A#4
  const b4 = computeKeyLayout(71);

  assert(c4.leftPx === 690, 'C4 left is 690px');
  assertApprox(cs4.leftPx, 707.4, 0.01, 'C#4 left is 707.4px');
  assert(d4.leftPx === 720, 'D4 left is 720px');
  assertApprox(ds4.leftPx, 737.4, 0.01, 'D#4 left is 737.4px');
  assert(e4.leftPx === 750, 'E4 left is 750px');
  assert(f4.leftPx === 780, 'F4 left is 780px');
  assertApprox(fs4.leftPx, 794.4, 0.01, 'F#4 left is 794.4px');
  assert(g4.leftPx === 810, 'G4 left is 810px');
  assertApprox(gs4.leftPx, 825.0, 0.01, 'G#4 left is 825.0px');
  assert(a4.leftPx === 840, 'A4 left is 840px');
  assertApprox(as4.leftPx, 855.6, 0.01, 'A#4 left is 855.6px');
  assert(b4.leftPx === 870, 'B4 left is 870px');

  // Verify visible gaps
  // Gap between D#4 right edge and F#4 left edge (E-F gap)
  const ds4Right = ds4.leftPx + ds4.widthPx;
  const efGap = fs4.leftPx - ds4Right;
  assertApprox(
    efGap,
    39.6,
    0.01,
    'Clear visible gap at E-F between black key groups (~39.6px)'
  );

  // Gap between A#4 right edge and C#5 left edge (B-C gap)
  const cs5 = computeKeyLayout(73);
  const as4Right = as4.leftPx + as4.widthPx;
  const bcGap = cs5.leftPx - as4Right;
  assertApprox(
    bcGap,
    44.4,
    0.01,
    'Clear visible gap at B-C between black key groups (~44.4px)'
  );

  // Group of 2 spacing (between C# and D#)
  const cs4Right = cs4.leftPx + cs4.widthPx;
  const group2Gap = ds4.leftPx - cs4Right;
  assertApprox(
    group2Gap,
    12.6,
    0.01,
    'Tight-but-distinct spacing within 2-black-key group (~12.6px)'
  );

  // Group of 3 spacing (between F# and G#, and G# and A#)
  const fs4Right = fs4.leftPx + fs4.widthPx;
  const group3Gap1 = gs4.leftPx - fs4Right;
  const gs4Right = gs4.leftPx + gs4.widthPx;
  const group3Gap2 = as4.leftPx - gs4Right;
  assertApprox(
    group3Gap1,
    13.2,
    0.01,
    'Tight-but-distinct spacing within 3-black-key group F#-G# (~13.2px)'
  );
  assertApprox(
    group3Gap2,
    13.2,
    0.01,
    'Tight-but-distinct spacing within 3-black-key group G#-A# (~13.2px)'
  );
}

console.log('\n[Suite] 4. Active Note Matching (isNoteActive)');
{
  const c4 = computeKeyLayout(60);
  const cs4 = computeKeyLayout(61);

  assert(isNoteActive(c4, [60]), 'Matches by exact MIDI number');
  assert(!isNoteActive(c4, [62]), 'Does not match wrong MIDI number');
  assert(isNoteActive(c4, ['C4']), 'Matches by note name with octave');
  assert(isNoteActive(c4, ['C']), 'Matches by pitch class name');
  assert(isNoteActive(cs4, ['C#4']), 'Matches black key note name');
  assert(isNoteActive(cs4, ['Db4']), 'Matches black key enharmonic Db4');
  assert(isNoteActive(cs4, ['Db']), 'Matches black key enharmonic Db');
  assert(!isNoteActive(c4, []), 'Empty activeNotes returns false');
  assert(!isNoteActive(c4, undefined), 'Undefined activeNotes returns false');
}

console.log('\n[Suite] 5. Auto-Center Scroll Offset Calculation');
{
  const { allKeys } = generatePianoKeys();
  const viewportWidth = 400;

  // Empty active notes should return null (do not snap back)
  const emptyResult = computeAutoScrollOffset([], allKeys, viewportWidth);
  assert(emptyResult === null, 'Empty active notes returns null (preserves scroll position)');

  // C major triad: C4 (60), E4 (64), G4 (67)
  // C4 center = 690 + 15 = 705
  // E4 center = 750 + 15 = 765
  // G4 center = 810 + 15 = 825
  // Average center = (705 + 765 + 825) / 3 = 765
  // Viewport width = 400
  // Target scroll offset = 765 - (400 / 2) = 565
  const cMajorOffset = computeAutoScrollOffset(
    [60, 64, 67],
    allKeys,
    viewportWidth
  );
  assertApprox(
    cMajorOffset!,
    565,
    0.01,
    'C major triad (C4, E4, G4) centers viewport at offset 565px'
  );

  // Bass chord near A0: A0 (21), C1 (24)
  // Target offset would be negative, clamped to 0
  const bassOffset = computeAutoScrollOffset([21, 24], allKeys, viewportWidth);
  assert(bassOffset === 0, 'Low chord offset is clamped to minimum 0px');

  // Treble chord near C8: A7 (105), C8 (108)
  // Max scrollable offset = 1560 - 400 = 1160
  const trebleOffset = computeAutoScrollOffset(
    [105, 108],
    allKeys,
    viewportWidth
  );
  assert(
    trebleOffset === 1160,
    'High chord offset is clamped to maximum scrollable offset (1160px)'
  );
}

console.log('\n============================================================');
console.log('PianoKeyboard Unit Tests: ALL 23 PASSED');
console.log('============================================================\n');
