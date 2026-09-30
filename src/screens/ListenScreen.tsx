import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { useNoteDetection } from '../hooks/useNoteDetection';
import { useStableNotes } from '../audio';
import { inferChord, ChordStabilizer } from '../chord-engine';
import { useSettings, sensitivityToThreshold } from '../settings';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  STROKE,
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

  /**
   * Whether to display the individual notes line under the chord.
   * If omitted, driven by Settings.
   */
  showNoteNames?: boolean;

  /**
   * Whether to prevent display from sleeping.
   * If omitted, driven by Settings.
   */
  keepScreenAwake?: boolean;

  /**
   * Detection sensitivity slider value (0.0 to 1.0).
   * If omitted, driven by Settings.
   */
  sensitivity?: number;
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
  showNoteNames: propShowNoteNames,
  keepScreenAwake: propKeepScreenAwake,
  sensitivity: propSensitivity,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings } = useSettings();

  // Settings with optional prop overrides
  const effectiveShowNoteNames = propShowNoteNames ?? settings.showNoteNames;
  const effectiveKeepScreenAwake = propKeepScreenAwake ?? settings.keepScreenAwake;
  const effectiveSensitivity = propSensitivity ?? settings.sensitivity;

  // Map sensitivity slider to dynamic noteStabilizer threshold at runtime
  const dynamicThreshold = sensitivityToThreshold(effectiveSensitivity);

  // Keep screen awake while active if setting enabled
  useEffect(() => {
    if (effectiveKeepScreenAwake) {
      activateKeepAwakeAsync().catch(() => {});
      return () => {
        deactivateKeepAwake().catch(() => {});
      };
    } else {
      deactivateKeepAwake().catch(() => {});
    }
  }, [effectiveKeepScreenAwake]);

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
  const {
    isStreaming,
    scores,
    error: micError,
    start: startAudio,
    stop: stopAudio,
  } = useNoteDetection({
    autoStart: isListening,
  });

  // Handle backgrounding, phone call interruptions, and returning to active state
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (isListening) {
          startAudio().catch(() => {});
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        stopAudio();
        chordStabilizerRef.current.reset();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isListening, startAudio, stopAudio]);

  // Stabilize note activations across consecutive frames with onset debouncing and hysteresis
  // Feeds live dynamic sensitivity threshold mapped directly from settings
  const stableNotes = useStableNotes(scores, {
    threshold: dynamicThreshold,
    onStableNotesChange: handleStableNotesChange,
  });

  const activeStatus = isListening && isStreaming && !micError;

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
      : micError
        ? 'Microphone permission required'
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
          {effectiveShowNoteNames && displayNoteList ? (
            <Text
              style={[
                styles.noteList,
                isIdle && styles.noteListIdle,
                micError && styles.noteListError,
              ]}
            >
              {displayNoteList}
            </Text>
          ) : null}
        </View>

        {/* Center: Segmented Navigation Pill [ Listen | Onboarding | Settings ] */}
        <View style={styles.navPillContainer}>
          <View style={styles.navPill}>
            <View style={styles.navPillActiveItem}>
              <Text style={styles.navPillActiveText}>Listen</Text>
            </View>
            {navigation?.navigate ? (
              <>
                <Pressable
                  onPress={() => navigation.navigate('Onboarding')}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Onboarding"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  style={({ pressed }) => [
                    styles.navPillItem,
                    pressed && styles.navPillItemPressed,
                  ]}
                >
                  <Text style={styles.navPillInactiveText}>Onboarding</Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Settings"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  style={({ pressed }) => [
                    styles.navPillItem,
                    pressed && styles.navPillItemPressed,
                  ]}
                >
                  <Text style={styles.navPillInactiveText}>Settings</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        {/* Right: Status indicator & previous chords trail */}
        <View style={styles.rightHeader}>
          <View style={styles.statusRow}>
            <Text
              style={[
                styles.statusText,
                micError && styles.statusTextError,
              ]}
            >
              {micError
                ? 'Mic access needed'
                : activeStatus
                  ? 'Listening'
                  : 'Paused'}
            </Text>

            <View
              style={[
                styles.statusDot,
                micError
                  ? styles.statusDotError
                  : !activeStatus && styles.statusDotInactive,
              ]}
            />

            {micError ? (
              <Pressable
                onPress={() => Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Enable microphone in settings"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.enableButton,
                  pressed && styles.enableButtonPressed,
                ]}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </Pressable>
            ) : null}
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
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  chordInfo: {
    minWidth: 100,
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
    marginTop: 2,
    letterSpacing: 0.5,
  },
  noteListIdle: {
    opacity: OPACITY.caption,
  },
  noteListError: {
    color: COLORS.error,
  },
  navPillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#58595D',
    borderRadius: RADIUS.full,
    padding: 3,
  },
  navPillActiveItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingVertical: 5,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  navPillActiveText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 12,
    color: COLORS.ink,
  },
  navPillItem: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
  },
  navPillItemPressed: {
    opacity: OPACITY.pressed,
  },
  navPillInactiveText: {
    fontFamily: FONTS.body.medium,
    fontSize: 12,
    color: '#E0DFDC',
  },
  rightHeader: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 100,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2E9E6B',
  },
  statusDotInactive: {
    backgroundColor: COLORS.inkSoft,
  },
  statusDotError: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.inkSoft,
    marginRight: 6,
  },
  statusTextError: {
    color: COLORS.error,
  },
  enableButton: {
    marginLeft: SPACING.sm,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: STROKE.thin,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorSoft,
  },
  enableButtonPressed: {
    opacity: OPACITY.pressed,
  },
  enableButtonText: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.error,
  },
  previousChordsTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
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
    borderTopWidth: STROKE.thin,
    borderTopColor: COLORS.whiteKeyEdge,
  },
});

