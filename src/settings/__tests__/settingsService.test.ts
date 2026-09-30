import { DEFAULT_SETTINGS } from '../types';
import {
  sensitivityToThreshold,
  thresholdToSensitivity,
} from '../sensitivityMapping';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertClose(actual: number, expected: number, tolerance: number, message: string) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
    console.log(`  ✓ ${message} (${actual} ~= ${expected})`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message} (expected ~${expected}, got ${actual})`);
  }
}

console.log('\n[Suite] 1. Sensitivity <-> Threshold mapping');

// 1. Default mapping
assertClose(
  sensitivityToThreshold(0.65),
  0.45,
  0.005,
  'Default sensitivity 0.65 maps to threshold 0.45'
);

// 2. Minimum sensitivity (strict)
assertClose(
  sensitivityToThreshold(0.0),
  0.80,
  0.005,
  'Minimum sensitivity 0.0 maps to threshold 0.80'
);

// 3. Maximum sensitivity (soft playing)
assertClose(
  sensitivityToThreshold(1.0),
  0.20,
  0.005,
  'Maximum sensitivity 1.0 maps to threshold 0.20'
);

// 4. Monotonic decrease: higher sensitivity -> lower threshold
let prevThreshold = sensitivityToThreshold(0.0);
let isMonotonic = true;
for (let s = 0.05; s <= 1.0; s += 0.05) {
  const t = sensitivityToThreshold(s);
  if (t > prevThreshold) {
    isMonotonic = false;
    break;
  }
  prevThreshold = t;
}
assert(isMonotonic, 'Sensitivity mapping is monotonically decreasing');

// 5. Clamping out of bounds
assertClose(
  sensitivityToThreshold(-0.5),
  0.80,
  0.001,
  'Negative sensitivity clamped to 0.80'
);
assertClose(
  sensitivityToThreshold(1.5),
  0.20,
  0.001,
  'Sensitivity > 1 clamped to 0.20'
);

// 6. Inverse mapping
assertClose(
  thresholdToSensitivity(0.80),
  0.0,
  0.01,
  'Threshold 0.80 maps back to sensitivity 0.0'
);
assertClose(
  thresholdToSensitivity(0.45),
  0.65,
  0.01,
  'Threshold 0.45 maps back to sensitivity 0.65'
);
assertClose(
  thresholdToSensitivity(0.20),
  1.0,
  0.01,
  'Threshold 0.20 maps back to sensitivity 1.0'
);

// 7. Default settings contract
console.log('\n[Suite] 2. Default settings contract');
assert(DEFAULT_SETTINGS.showNoteNames === true, 'Default showNoteNames is true');
assert(DEFAULT_SETTINGS.keepScreenAwake === true, 'Default keepScreenAwake is true');
assert(DEFAULT_SETTINGS.sensitivity === 0.65, 'Default sensitivity is 0.65');

console.log(`\n============================================================`);
console.log(`Test Summary: ${passed} passed, ${failed} failed`);
console.log(`============================================================\n`);

if (failed > 0) {
  (globalThis as any).process?.exit(1);
}
