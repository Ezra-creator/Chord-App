import React, { useRef } from 'react';
import { View, StyleSheet, GestureResponderEvent } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme/tokens';

export interface SliderProps {
  /**
   * Current value of the slider.
   */
  value: number;

  /**
   * Callback fired when slider value changes.
   */
  onChange: (value: number) => void;

  /**
   * Minimum value (default 0).
   */
  min?: number;

  /**
   * Maximum value (default 1).
   */
  max?: number;

  /**
   * Step increment (optional).
   */
  step?: number;

  /**
   * Whether the slider is disabled.
   */
  disabled?: boolean;

  /**
   * Accessibility label for screen readers.
   */
  accessibilityLabel?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step,
  disabled = false,
  accessibilityLabel,
}) => {
  const containerRef = useRef<View>(null);

  const updateFromPageX = (pageX: number) => {
    containerRef.current?.measure((_x, _y, width, _height, pageXOffset) => {
      if (width > 0) {
        const offsetX = pageX - pageXOffset;
        const ratio = Math.max(0, Math.min(1, offsetX / width));
        const rawValue = min + ratio * (max - min);
        let finalValue = rawValue;

        if (step && step > 0) {
          finalValue = Math.round(rawValue / step) * step;
        }

        const clamped = Math.max(min, Math.min(max, finalValue));
        onChange(Number(clamped.toFixed(4)));
      }
    });
  };

  const handleResponder = (evt: GestureResponderEvent) => {
    updateFromPageX(evt.nativeEvent.pageX);
  };

  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = max > min ? ((clampedValue - min) / (max - min)) * 100 : 0;

  return (
    <View
      ref={containerRef}
      style={styles.touchContainer}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={handleResponder}
      onResponderMove={handleResponder}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: clampedValue }}
    >
      {/* Background Track */}
      <View style={styles.trackBackground}>
        {/* Filled Portion */}
        <View style={[styles.trackFilled, { width: `${percentage}%` }]} />
      </View>

      {/* Thumb with soft teal ring */}
      <View
        style={[
          styles.thumbWrapper,
          {
            left: `${percentage}%`,
          },
        ]}
      >
        <View style={styles.thumbSoftRing}>
          <View style={styles.thumbCenter} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  touchContainer: {
    width: '100%',
    height: SPACING.sliderThumbGlow,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    width: '100%',
    height: SPACING.sliderTrackHeight,
    backgroundColor: COLORS.sliderTrack,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  trackFilled: {
    height: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: RADIUS.full,
  },
  thumbWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -SPACING.sliderThumbGlow / 2 }],
  },
  thumbSoftRing: {
    width: SPACING.sliderThumbGlow,
    height: SPACING.sliderThumbGlow,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCenter: {
    width: SPACING.sliderThumb,
    height: SPACING.sliderThumb,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.teal,
  },
});
