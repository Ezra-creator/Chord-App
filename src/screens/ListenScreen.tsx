import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { useNoteDetection } from '../hooks/useNoteDetection';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  OPACITY,
} from '../theme/tokens';

export interface ListenScreenProps {
  /**
   * Currently detected chord name (e.g. 'Am7').
   */
  currentChord?: string;

  /**
   * Active notes to highlight on the piano keyboard.
   * Accepts MIDI note numbers (21-108) or note names (e.g. 'A3', 'C4').
   */
  activeNotes?: (number | string)[];

  /**
   * Formatted string of notes forming the chord (e.g. "A · C · E · G").
   * Automatically derived from activeNotes if omitted.
   */
  notesList?: string;

  /**
   * Chronological list of previously detected chords.
   */
  previousChords?: string[];

  /**
   * Whether the microphone is actively listening.
   */
  isListening?: boolean;
}

export type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Listen'>> &
  ListenScreenProps;

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

function deriveNoteList(activeNotes?: (number | string)[]): string {
  if (!activeNotes || activeNotes.length === 0) return '';
  const names = activeNotes.map((note) => {
    if (typeof note === 'number') {
      return PITCH_CLASSES[note % 12];
    }
    return note.replace(/\d+$/, '');
  });
  return Array.from(new Set(names)).join(' · ');
}

export const ListenScreen: React.FC<Props> = ({
  currentChord = 'Am7',
  activeNotes = [57, 60, 64, 67], // A3, C4, E4, G4
  notesList,
  previousChords = ['Dm7', 'G7', 'Cmaj7', 'Fmaj7'],
  isListening = true,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Connect continuous audio stream and run on-device note detection inference
  const { isStreaming } = useNoteDetection({
    autoStart: isListening,
    onNotesDetected: (result) => {
      if (result.detectedNotes.length > 0) {
        const topNotesSummary = result.detectedNotes
          .map(
            (n) => `${n.name} (MIDI ${n.midi}, ${(n.confidence * 100).toFixed(0)}%)`
          )
          .join(', ');
        console.log(
          `[NoteDetection] ${new Date(result.timestamp).toISOString()} - Top notes: ${topNotesSummary}`
        );
      } else {
        console.log(
          `[NoteDetection] ${new Date(result.timestamp).toISOString()} - No notes above threshold`
        );
      }
    },
  });

  const activeStatus = isListening && isStreaming;

  // Clamp chord name font size between ~30 and 46
  const chordFontSize = Math.min(
    TYPE_SCALE.chordName,
    Math.max(TYPE_SCALE.chordNameMin, Math.round(width * 0.045))
  );

  const displayNoteList = notesList ?? deriveNoteList(activeNotes);

  return (
    <View
      style={[
        styles.container,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: Math.max(insets.bottom, SPACING.xs),
        },
      ]}
    >
      {/* 1. Top row (space-between, ~14/22/6 padding) */}
      <View
        style={[
          styles.topRow,
          {
            paddingTop: Math.max(insets.top, SPACING.topRowTop),
          },
        ]}
      >
        {/* Left: Chord name & note list */}
        <View style={styles.chordInfo}>
          <Text
            style={[styles.chordName, { fontSize: chordFontSize }]}
            numberOfLines={1}
            accessibilityRole="header"
            accessibilityLabel={`Current chord: ${currentChord}`}
          >
            {currentChord}
          </Text>
          {displayNoteList ? (
            <Text style={styles.noteList}>{displayNoteList}</Text>
          ) : null}
        </View>

        {/* Right: Status indicator & previous chords trail */}
        <View style={styles.rightHeader}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusGlowRing,
                !activeStatus && styles.statusGlowRingInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  !activeStatus && styles.statusDotInactive,
                ]}
              />
            </View>
            <Text style={styles.statusText}>
              {activeStatus ? 'Listening' : 'Paused'}
            </Text>
          </View>

          {previousChords && previousChords.length > 0 && (
            <View
              style={styles.previousChordsTrail}
              accessibilityLabel="Previous chords trail"
            >
              {previousChords.map((chord, index) => {
                const isLatest = index === previousChords.length - 1;
                return (
                  <React.Fragment key={`${chord}-${index}`}>
                    {index > 0 && (
                      <Text
                        style={[styles.trailArrow, styles.olderTrailItem]}
                        accessible={false}
                      >
                        {' → '}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.trailChord,
                        !isLatest && styles.olderTrailItem,
                      ]}
                    >
                      {chord}
                    </Text>
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* 2. Full 88-key piano keyboard filling remaining vertical space */}
      <View style={styles.keyboardContainer}>
        <PianoKeyboard activeNotes={activeNotes} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.topRowBottom,
  },
  chordInfo: {
    justifyContent: 'center',
  },
  chordName: {
    fontFamily: FONTS.display.bold,
    color: COLORS.ink,
    includeFontPadding: false,
  },
  noteList: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.label,
    color: COLORS.inkSoft,
    marginTop: SPACING.xs,
  },
  rightHeader: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusGlowRing: {
    width: SPACING.statusRing,
    height: SPACING.statusRing,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusGlowRingInactive: {
    backgroundColor: COLORS.sliderTrack,
    opacity: OPACITY.glowRing,
  },
  statusDot: {
    width: SPACING.statusDot,
    height: SPACING.statusDot,
    borderRadius: RADIUS.dot,
    backgroundColor: COLORS.teal,
  },
  statusDotInactive: {
    backgroundColor: COLORS.inkSoft,
  },
  statusText: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.inkSoft,
    marginLeft: SPACING.sm,
  },
  previousChordsTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.topRowBottom,
  },
  trailChord: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.inkSoft,
  },
  trailArrow: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.inkSoft,
  },
  olderTrailItem: {
    opacity: OPACITY.trailOlder,
  },
  keyboardContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
});
