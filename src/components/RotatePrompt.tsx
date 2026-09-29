import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, FONTS } from '../theme/tokens';

export const RotatePrompt: React.FC = () => {
  const [rotateAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        <View style={styles.deviceIcon}>
          <View style={styles.deviceScreen} />
        </View>
      </Animated.View>

      <Text style={styles.heading}>Rotate your device</Text>
      <Text style={styles.subtext}>
        ChordApp works in landscape only — turn your phone sideways to see the
        full keyboard.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111214',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceScreen: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4A4C52',
    borderStyle: 'dashed',
  },
  heading: {
    fontFamily: FONTS.display.semiBold,
    fontSize: 19,
    color: COLORS.paper,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: FONTS.body.regular,
    fontSize: 13.5,
    color: '#A9A6A0',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 19,
  },
});
