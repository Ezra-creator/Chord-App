import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestRecordingPermissionsAsync } from 'expo-audio';
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
   * Optional custom permission request handler.
   * If omitted, OnboardingScreen invokes `requestRecordingPermissionsAsync()` from `expo-audio`.
   */
  onRequestPermission?: () => Promise<boolean | void> | boolean | void;
}

export type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Onboarding'>> &
  OnboardingScreenProps;

export const OnboardingScreen: React.FC<Props> = ({
  navigation,
  onRequestPermission,
}) => {
  const insets = useSafeAreaInsets();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    setPermissionError(null);

    try {
      if (onRequestPermission) {
        const result = await onRequestPermission();
        if (result === false) {
          setPermissionError(
            'Microphone access is required to listen to piano chords. Please grant permission to continue.'
          );
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
        navigation?.navigate('Listen');
        return;
      }

      // If permanently denied previously, open system settings
      if (!canAskAgain) {
        await Linking.openSettings();
        setIsLoading(false);
        return;
      }

      const response = await requestRecordingPermissionsAsync();
      if (response.granted) {
        setPermissionError(null);
        setIsLoading(false);
        navigation?.navigate('Listen');
      } else {
        setCanAskAgain(response.canAskAgain);
        setPermissionError(
          response.canAskAgain
            ? 'Microphone access was denied. Please allow microphone permission to continue.'
            : 'Microphone permission was permanently denied. Please enable microphone access in your device settings.'
        );
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('Microphone permission request error:', err);
      setPermissionError(
        'Unable to request microphone permission. Please check your device settings.'
      );
      setIsLoading(false);
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
          {permissionError ? (
            <View
              style={styles.errorContainer}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text style={styles.errorText}>{permissionError}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleRequestPermission}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={
              permissionError
                ? !canAskAgain
                  ? 'Open Settings'
                  : 'Try again'
                : 'Enable microphone'
            }
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.paper} />
            ) : (
              <Text style={styles.buttonText}>
                {permissionError
                  ? !canAskAgain
                    ? 'Open Settings'
                    : 'Try again'
                  : 'Enable microphone'}
              </Text>
            )}
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
  errorContainer: {
    width: '100%',
    backgroundColor: COLORS.errorSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: STROKE.thin,
    borderColor: COLORS.error,
  },
  errorText: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.error,
    textAlign: 'center',
    lineHeight: TYPE_SCALE.caption * LINE_HEIGHT.subtext,
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
  buttonDisabled: {
    opacity: OPACITY.caption,
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
