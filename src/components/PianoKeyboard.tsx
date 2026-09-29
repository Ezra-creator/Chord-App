import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  STROKE,
  PIANO,
} from '../theme/tokens';

export interface PianoKeyboardProps {
  /**
   * List of active notes to highlight on the keyboard.
   * Can be MIDI numbers (e.g. 57, 60), note names with octave (e.g. 'A3', 'C4'),
   * or pitch classes (e.g. 'A', 'C').
   */
  activeNotes?: (number | string)[];
}

export interface PianoKeyInfo {
  midi: number;
  pitchClass: string;
  nameWithOctave: string;
  isBlack: boolean;
  whiteIndex?: number;
  boundaryIndex?: number;
}

const PITCH_CLASSES = [
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
 * Programmatically generate the 88 piano keys (A0 [MIDI 21] to C8 [MIDI 108]).
 */
const generatePianoKeys = () => {
  const whiteKeys: PianoKeyInfo[] = [];
  const blackKeys: PianoKeyInfo[] = [];
  let whiteKeyCount = 0;

  for (let midi = PIANO.minMidi; midi <= PIANO.maxMidi; midi++) {
    const pcIndex = midi % 12;
    const pitchClass = PITCH_CLASSES[pcIndex];
    const octave = Math.floor(midi / 12) - 1;
    const nameWithOctave = `${pitchClass}${octave}`;
    const isBlack =
      pcIndex === 1 ||
      pcIndex === 3 ||
      pcIndex === 6 ||
      pcIndex === 8 ||
      pcIndex === 10;

    if (isBlack) {
      blackKeys.push({
        midi,
        pitchClass,
        nameWithOctave,
        isBlack: true,
        boundaryIndex: whiteKeyCount,
      });
    } else {
      whiteKeys.push({
        midi,
        pitchClass,
        nameWithOctave,
        isBlack: false,
        whiteIndex: whiteKeyCount,
      });
      whiteKeyCount++;
    }
  }

  return { whiteKeys, blackKeys };
};

const { whiteKeys: PIANO_WHITE_KEYS, blackKeys: PIANO_BLACK_KEYS } =
  generatePianoKeys();

const isNoteActive = (
  key: PianoKeyInfo,
  activeNotes?: (number | string)[]
): boolean => {
  if (!activeNotes || activeNotes.length === 0) return false;
  return activeNotes.some((active) => {
    if (typeof active === 'number') {
      return active === key.midi;
    }
    return active === key.nameWithOctave || active === key.pitchClass;
  });
};

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes = [],
}) => {
  const blackKeyWidthPercent =
    (PIANO.blackKeyWidthRatio / PIANO.totalWhiteKeys) * 100;

  return (
    <View style={styles.container}>
      {/* Row of 52 white keys */}
      <View style={styles.whiteKeysRow}>
        {PIANO_WHITE_KEYS.map((key, index) => {
          const isActive = isNoteActive(key, activeNotes);
          const isFirst = index === 0;
          const isLast = index === PIANO_WHITE_KEYS.length - 1;

          return (
            <View
              key={key.midi}
              style={[
                styles.whiteKey,
                isFirst && styles.firstWhiteKey,
                isLast && styles.lastWhiteKey,
                isActive && styles.whiteKeyActive,
              ]}
            >
              {isActive ? (
                <Text
                  style={styles.activeKeyLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {key.pitchClass}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Absolutely positioned 36 black keys */}
      <View style={styles.blackKeysOverlay} pointerEvents="none">
        {PIANO_BLACK_KEYS.map((key) => {
          const boundary = key.boundaryIndex ?? 0;
          const leftPercent =
            ((boundary - PIANO.blackKeyWidthRatio / 2) /
              PIANO.totalWhiteKeys) *
            100;
          const isActive = isNoteActive(key, activeNotes);

          return (
            <View
              key={key.midi}
              style={[
                styles.blackKey,
                {
                  left: `${leftPercent}%`,
                  width: `${blackKeyWidthPercent}%`,
                },
                isActive && styles.blackKeyActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  whiteKeysRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  whiteKey: {
    flex: 1,
    height: '100%',
    backgroundColor: COLORS.whiteKey,
    borderRightWidth: STROKE.thin,
    borderTopWidth: STROKE.thin,
    borderBottomWidth: STROKE.thin,
    borderColor: COLORS.whiteKeyEdge,
    borderBottomLeftRadius: RADIUS.xs,
    borderBottomRightRadius: RADIUS.xs,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING.xs,
  },
  firstWhiteKey: {
    borderLeftWidth: STROKE.thin,
  },
  lastWhiteKey: {
    borderRightWidth: STROKE.thin,
  },
  whiteKeyActive: {
    backgroundColor: COLORS.tealSoft,
    borderColor: COLORS.teal,
    borderBottomWidth: STROKE.medium,
    zIndex: 1,
  },
  activeKeyLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: TYPE_SCALE.keyLabel,
    color: COLORS.teal,
    textAlign: 'center',
  },
  blackKeysOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blackKey: {
    position: 'absolute',
    top: 0,
    height: '58%',
    backgroundColor: COLORS.blackKey,
    borderBottomLeftRadius: RADIUS.xs,
    borderBottomRightRadius: RADIUS.xs,
    zIndex: 10,
  },
  blackKeyActive: {
    backgroundColor: COLORS.teal,
    borderWidth: STROKE.thin,
    borderColor: COLORS.tealSoft,
    zIndex: 20,
  },
});
