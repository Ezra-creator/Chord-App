import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  OPACITY,
  STROKE,
  LINE_HEIGHT,
  LAYOUT,
} from '../theme/tokens';

export interface OnboardingScreenProps {
  /**
   * Callback invoked when the user taps "Enable microphone".
   * Stubbed for this UI phase to allow transition or test inspection.
   */
  onRequestPermission?: () => void;
}

export type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Onboarding'>> &
  OnboardingScreenProps;

export const OnboardingScreen: React.FC<Props> = ({
  navigation,
  onRequestPermission,
}) => {
  const insets = useSafeAreaInsets();

  const handleRequestPermission = () => {
    if (onRequestPermission) {
      onRequestPermission();
    } else {
      // Stub implementation for UI phase: navigate to Listen screen
      navigation?.navigate('Listen');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, SPACING.lg),
          paddingBottom: Math.max(insets.bottom, SPACING.lg),
          paddingLeft: Math.max(insets.left, SPACING.xxl),
          paddingRight: Math.max(insets.right, SPACING.xxl),
        },
      ]}
    >
      {/* Left half: brand mark, title, subtext */}
      <View style={styles.leftHalf}>
        <View style={styles.leftContent}>
          <View
            style={styles.brandMark}
            accessibilityRole="image"
            accessibilityLabel="ChordApp brand mark"
          >
            <View style={styles.brandMarkRing} />
          </View>

          <Text style={styles.title}>Hear what you play</Text>

          <Text style={styles.subtext}>
            Place your phone near the piano. It listens through the microphone and
            names every chord as you play it.
          </Text>
        </View>
      </View>

      {/* Right half: full-width button & caption, vertically centered */}
      <View style={styles.rightHalf}>
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRequestPermission}
            accessibilityRole="button"
            accessibilityLabel="Enable microphone"
          >
            <Text style={styles.buttonText}>Enable microphone</Text>
          </Pressable>

          <Text style={styles.caption}>Audio stays on your device</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
  },
  leftHalf: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: SPACING.xl,
  },
  leftContent: {
    maxWidth: LAYOUT.contentMaxWidth,
  },
  brandMark: {
    width: SPACING.mark,
    height: SPACING.mark,
    borderRadius: RADIUS.mark,
    backgroundColor: COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  brandMarkRing: {
    width: SPACING.xl,
    height: SPACING.xl,
    borderRadius: RADIUS.full,
    borderWidth: STROKE.medium,
    borderColor: COLORS.paper,
  },
  title: {
    fontFamily: FONTS.display.semiBold,
    fontSize: TYPE_SCALE.screenTitle,
    color: COLORS.ink,
    marginBottom: SPACING.sm,
  },
  subtext: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.subtext,
    color: COLORS.inkSoft,
    lineHeight: TYPE_SCALE.subtext * LINE_HEIGHT.subtext,
  },
  rightHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: SPACING.xl,
  },
  actionContainer: {
    width: '100%',
    maxWidth: LAYOUT.buttonMaxWidth,
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.ink,
    borderRadius: RADIUS.button,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: OPACITY.pressed,
  },
  buttonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: TYPE_SCALE.body,
    color: COLORS.paper,
    textAlign: 'center',
  },
  caption: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.inkSoft,
    opacity: OPACITY.caption,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
