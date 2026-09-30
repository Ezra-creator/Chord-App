import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  STROKE,
} from '../theme/tokens';
import {
  PianoKeyInfo,
  WHITE_KEY_WIDTH,
  TOTAL_CONTENT_WIDTH,
  BLACK_KEY_WIDTH,
  PIANO_ALL_KEYS,
  PIANO_WHITE_KEYS,
  PIANO_BLACK_KEYS,
  isNoteActive,
  computeAutoScrollOffset,
} from './pianoLayout';

export type { PianoKeyInfo };
export {
  WHITE_KEY_WIDTH,
  TOTAL_CONTENT_WIDTH,
  BLACK_KEY_WIDTH,
  PIANO_ALL_KEYS,
  PIANO_WHITE_KEYS,
  PIANO_BLACK_KEYS,
  isNoteActive,
  computeAutoScrollOffset,
};

export interface PianoKeyboardProps {
  /**
   * List of active notes to highlight on the keyboard.
   * Can be MIDI numbers (e.g. 57, 60), note names with octave (e.g. 'A3', 'C4'),
   * or pitch classes (e.g. 'A', 'C').
   */
  activeNotes?: (number | string)[];
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes = [],
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const lastActiveSignatureRef = useRef<string>('');
  const hasPositionedMiddleCRef = useRef<boolean>(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== viewportWidth) {
      setViewportWidth(width);
    }
  };

  // Center around Middle C (C4, MIDI 60) on initial load before any chord is played
  useEffect(() => {
    if (viewportWidth <= 0 || hasPositionedMiddleCRef.current) return;
    if (!activeNotes || activeNotes.length === 0) {
      const middleCCenter = 705; // C4 centerPx
      const maxScroll = Math.max(0, TOTAL_CONTENT_WIDTH - viewportWidth);
      const targetX = middleCCenter - viewportWidth / 2;
      const clampedX = Math.max(0, Math.min(targetX, maxScroll));
      scrollViewRef.current?.scrollTo({ x: clampedX, animated: false });
      hasPositionedMiddleCRef.current = true;
    }
  }, [viewportWidth, activeNotes]);

  // Auto-center on the active chord whenever activeNotes changes and is non-empty
  useEffect(() => {
    if (viewportWidth <= 0) return;
    if (!activeNotes || activeNotes.length === 0) {
      // Requirement 3: If activeNotes is empty, leave scroll position where it currently is
      return;
    }

    const targetOffset = computeAutoScrollOffset(
      activeNotes,
      PIANO_ALL_KEYS,
      viewportWidth,
      TOTAL_CONTENT_WIDTH
    );

    if (targetOffset === null) return;

    // Deduplicate identical chord activation states during sustained frames
    const activeKeySignature = PIANO_ALL_KEYS
      .filter((k) => isNoteActive(k, activeNotes))
      .map((k) => k.midi)
      .sort((a, b) => a - b)
      .join(',');

    if (activeKeySignature !== lastActiveSignatureRef.current) {
      lastActiveSignatureRef.current = activeKeySignature;
      hasPositionedMiddleCRef.current = true;
      scrollViewRef.current?.scrollTo({ x: targetOffset, animated: true });
    }
  }, [activeNotes, viewportWidth]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        <View style={styles.keyboardContent}>
          {/* Row of 52 white keys */}
          <View style={styles.whiteKeysRow}>
            {PIANO_WHITE_KEYS.map((key, index) => {
              const isActive = isNoteActive(key, activeNotes);
              const isFirst = index === 0;

              return (
                <View
                  key={key.midi}
                  style={[
                    styles.whiteKey,
                    isFirst && styles.firstWhiteKey,
                  ]}
                >
                  {isActive && (
                    <LinearGradient
                      colors={['#38A76B', '#238250']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.keyFillGradient}
                    />
                  )}
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

          {/* Overlay of 36 black keys */}
          <View style={styles.blackKeysOverlay} pointerEvents="none">
            {PIANO_BLACK_KEYS.map((key) => {
              const isActive = isNoteActive(key, activeNotes);

              return (
                <View
                  key={key.midi}
                  style={[
                    styles.blackKey,
                    { left: key.leftPx },
                  ]}
                >
                  {isActive && (
                    <LinearGradient
                      colors={['#38A76B', '#238250']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.keyFillGradient}
                    />
                  )}
                  {isActive ? (
                    <Text
                      style={styles.activeBlackKeyLabel}
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
        </View>
      </ScrollView>

      {/* Left fade-out gradient overlay (shadow vignette) */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(28, 30, 34, 0.4)', 'rgba(28, 30, 34, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeOverlayLeft}
      />

      {/* Right fade-out gradient overlay (shadow vignette) */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(28, 30, 34, 0)', 'rgba(28, 30, 34, 0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fadeOverlayRight}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  scrollContent: {
    width: TOTAL_CONTENT_WIDTH,
    height: '100%',
  },
  keyboardContent: {
    width: TOTAL_CONTENT_WIDTH,
    height: '100%',
    position: 'relative',
  },
  whiteKeysRow: {
    width: TOTAL_CONTENT_WIDTH,
    height: '100%',
    flexDirection: 'row',
  },
  whiteKey: {
    width: WHITE_KEY_WIDTH,
    height: '100%',
    backgroundColor: COLORS.whiteKey,
    borderRightWidth: STROKE.thin,
    borderTopWidth: STROKE.thin,
    borderBottomWidth: STROKE.thin,
    borderLeftWidth: 0,
    borderColor: COLORS.whiteKeyEdge,
    borderBottomLeftRadius: RADIUS.xs,
    borderBottomRightRadius: RADIUS.xs,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING.xs,
    overflow: 'hidden',
  },
  firstWhiteKey: {
    borderLeftWidth: STROKE.thin,
  },
  keyFillGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: RADIUS.xs,
    borderBottomRightRadius: RADIUS.xs,
  },
  activeKeyLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: TYPE_SCALE.keyLabel,
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 2,
  },
  blackKeysOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: TOTAL_CONTENT_WIDTH,
    bottom: 0,
  },
  blackKey: {
    position: 'absolute',
    top: 0,
    width: BLACK_KEY_WIDTH,
    height: '58%',
    backgroundColor: '#1E2024',
    borderBottomLeftRadius: RADIUS.xs,
    borderBottomRightRadius: RADIUS.xs,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 1.5, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 2.5,
    elevation: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 2,
    overflow: 'hidden',
  },
  activeBlackKeyLabel: {
    fontFamily: FONTS.body.semiBold,
    fontSize: 8,
    color: '#FFFFFF',
    textAlign: 'center',
    zIndex: 2,
  },
  fadeOverlayLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 24,
    zIndex: 100,
  },
  fadeOverlayRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 24,
    zIndex: 100,
  },
});
