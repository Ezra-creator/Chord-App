import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme/tokens';

export interface SwitchProps {
  /**
   * Current boolean state of the switch.
   */
  value: boolean;

  /**
   * Callback fired when switch state changes.
   */
  onChange: (value: boolean) => void;

  /**
   * Whether the switch is interactive.
   */
  disabled?: boolean;

  /**
   * Accessibility label for screen readers.
   */
  accessibilityLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
}) => {
  const [animatedValue] = useState(
    () => new Animated.Value(value ? 1 : 0)
  );

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, SPACING.switchThumbTravel],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.sliderTrack, COLORS.teal],
  });

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={styles.pressable}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: SPACING.switchTrackWidth,
    height: SPACING.switchTrackHeight,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
  },
  thumb: {
    width: SPACING.switchThumbSize,
    height: SPACING.switchThumbSize,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.whiteKey,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
