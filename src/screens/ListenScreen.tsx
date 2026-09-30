import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { useNoteDetection } from '../hooks/useNoteDetection';
import { useStableNotes } from '../audio';
import { inferChord, ChordStabilizer } from '../chord-engine';
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
   * If omitted, driven by live audio pipeline.
   */
  currentChord?: string;

  /**
   * Active notes to highlight on the piano keyboard.
   * Accepts MIDI note numbers (21-108) or note names (e.g. 'A3', 'C4').
   * If omitted, driven by live audio pipeline.
   */
  activeNotes?: (number | string)[];

  /**
   * Formatted string of notes forming the chord (e.g. "A · C · E · G").
   * Automatically derived from activeNotes if omitted.
   */
  notesList?: string;

  /**
   * Chronological list of previously detected chords.
   * If omitted, driven by live audio pipeline.
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
      return PITCH_CLASSES[((note % 12) + 12) % 12];
    }
    return note.replace(/\d+$/, '');
  });
  return Array.from(new Set(names)).join(' · ');
}

function pushToTrail(
  trail: string[],
  chordToPush: string,
  maxLen: number = 4
): string[] {
  if (!chordToPush) return trail;
  // Prevent duplicate adjacent entries in the trail
  if (trail.length > 0 && trail[trail.length - 1] === chordToPush) {
    return trail;
  }
  const next = [...trail, chordToPush];
  return next.length > maxLen ? next.slice(next.length - maxLen) : next;
}

export const ListenScreen: React.FC<Props> = ({
  currentChord: propCurrentChord,
  activeNotes: propActiveNotes,
  notesList: propNotesList,
  previousChords: propPreviousChords,
  isListening = true,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Live chord engine state
  const [liveCurrentChord, setLiveCurrentChord] = useState<string | null>(null);
  const [livePreviousChords, setLivePreviousChords] = useState<string[]>([]);
  const lastCommittedChordRef = useRef<string | null>(null);

  // Pure TypeScript chord stabilizer
  const chordStabilizerRef = useRef<ChordStabilizer>(
    new ChordStabilizer({
      minCommitFrames: 1,
      clearFrames: 1,
    })
  );

  useEffect(() => {
    const stabilizer = chordStabilizerRef.current;
    return () => {
      stabilizer.reset();
    };
  }, []);

  // Callback fed into note stabilizer: fires ONLY when the stabilized note set changes
  const handleStableNotesChange = useCallback((notes: number[]) => {
    // 1. Feed active notes into chord recognition engine
    const candidate = inferChord(notes);

    // 2. Feed candidate into chord stability state machine
    const { committedChord, hasChanged } =
      chordStabilizerRef.current.processChord(candidate);

    if (hasChanged) {
      if (committedChord && committedChord.displayName) {
        const chordName = committedChord.displayName;

        // If transitioning from a previous different chord, push it to history
        if (
          lastCommittedChordRef.current &&
          lastCommittedChordRef.current !== chordName
        ) {
          setLivePreviousChords((prev) =>
            pushToTrail(prev, lastCommittedChordRef.current!, 4)
          );
        } else if (!lastCommittedChordRef.current) {
          // If returning to a chord that was at the end of the trail, trim it
          setLivePreviousChords((prev) =>
            prev.length > 0 && prev[prev.length - 1] === chordName
              ? prev.slice(0, -1)
              : prev
          );
        }

        lastCommittedChordRef.current = chordName;
        setLiveCurrentChord(chordName);
      } else {
        // Nothing playing (empty notes or silence committed)
        if (lastCommittedChordRef.current) {
          setLivePreviousChords((prev) =>
            pushToTrail(prev, lastCommittedChordRef.current!, 4)
          );
        }
        setLiveCurrentChord(null);
      }
    }
  }, []);

  // Connect continuous audio stream and run on-device note detection inference
  const { isStreaming, scores } = useNoteDetection({
    autoStart: isListening,
  });

  // Stabilize note activations across consecutive frames with onset debouncing and hysteresis
  const stableNotes = useStableNotes(scores, {
    onStableNotesChange: handleStableNotesChange,
  });

  const activeStatus = isListening && isStreaming;

  // Resolve effective data source (props override live state if provided)
  const effectiveActiveNotes = propActiveNotes ?? stableNotes;
  const effectivePreviousChords = propPreviousChords ?? livePreviousChords;

  // Explicitly handle "nothing playing" idle state
  const isIdle =
    propCurrentChord === undefined &&
    (!liveCurrentChord || effectiveActiveNotes.length === 0);

  const effectiveChord = propCurrentChord ?? (isIdle ? '—' : liveCurrentChord);

  const displayNoteList =
    propNotesList ??
    (effectiveActiveNotes.length > 0
      ? deriveNoteList(effectiveActiveNotes)
      : activeStatus
        ? 'Listening for notes…'
        : 'Microphone paused');

  // Clamp chord name font size between ~30 and 46
  const chordFontSize = Math.min(
    TYPE_SCALE.chordName,
    Math.max(TYPE_SCALE.chordNameMin, Math.round(width * 0.045))
  );

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
            style={[
              styles.chordName,
              isIdle && styles.chordNameIdle,
              { fontSize: chordFontSize },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
            accessibilityLabel={
              isIdle
                ? 'No chord detected. Listening for notes.'
                : `Current chord: ${effectiveChord}`
            }
          >
            {effectiveChord}
          </Text>
          {displayNoteList ? (
            <Text style={[styles.noteList, isIdle && styles.noteListIdle]}>
              {displayNoteList}
            </Text>
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

          {effectivePreviousChords && effectivePreviousChords.length > 0 && (
            <View
              style={styles.previousChordsTrail}
              accessibilityLabel="Previous chords trail"
            >
              {effectivePreviousChords.map((chord, index) => {
                const isLatest = index === effectivePreviousChords.length - 1;
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
        <PianoKeyboard activeNotes={effectiveActiveNotes} />
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
  chordNameIdle: {
    fontFamily: FONTS.display.medium,
    color: COLORS.inkSoft,
  },
  noteList: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.label,
    color: COLORS.inkSoft,
    marginTop: SPACING.xs,
  },
  noteListIdle: {
    opacity: OPACITY.caption,
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

