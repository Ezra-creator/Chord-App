import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Switch } from '../components/Switch';
import { Slider } from '../components/Slider';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  STROKE,
  LAYOUT,
} from '../theme/tokens';

export interface SettingsScreenProps {
  /**
   * Initial toggle state for showing note names (default true).
   */
  initialShowNoteNames?: boolean;

  /**
   * Initial toggle state for keeping screen awake (default true).
   */
  initialKeepScreenAwake?: boolean;

  /**
   * Initial microphone sensitivity value (default 0.65).
   */
  initialSensitivity?: number;

  /**
   * Callback fired when any setting changes.
   */
  onSettingsChange?: (settings: {
    showNoteNames: boolean;
    keepScreenAwake: boolean;
    sensitivity: number;
  }) => void;
}

export type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Settings'>> &
  SettingsScreenProps;

export const SettingsScreen: React.FC<Props> = ({
  initialShowNoteNames = true,
  initialKeepScreenAwake = true,
  initialSensitivity = 0.65,
  onSettingsChange,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const [showNoteNames, setShowNoteNames] = useState(initialShowNoteNames);
  const [keepScreenAwake, setKeepScreenAwake] = useState(initialKeepScreenAwake);
  const [sensitivity, setSensitivity] = useState(initialSensitivity);

  const handleShowNoteNamesChange = (value: boolean) => {
    setShowNoteNames(value);
    onSettingsChange?.({
      showNoteNames: value,
      keepScreenAwake,
      sensitivity,
    });
  };

  const handleKeepScreenAwakeChange = (value: boolean) => {
    setKeepScreenAwake(value);
    onSettingsChange?.({
      showNoteNames,
      keepScreenAwake: value,
      sensitivity,
    });
  };

  const handleSensitivityChange = (value: number) => {
    setSensitivity(value);
    onSettingsChange?.({
      showNoteNames,
      keepScreenAwake,
      sensitivity: value,
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, SPACING.lg),
          paddingBottom: Math.max(insets.bottom, SPACING.lg),
          paddingLeft: Math.max(insets.left, SPACING.lg),
          paddingRight: Math.max(insets.right, SPACING.lg),
        },
      ]}
    >
      {/* Centered panel (max-width ~420) */}
      <View style={styles.panel}>
        {/* Header with Title and optional Done action */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Settings</Text>
          {navigation?.canGoBack() ? (
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Done"
              style={styles.doneButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Row 1: Show note names */}
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Show note names</Text>
              <Text style={styles.rowDescription}>
                Display the individual notes under the chord
              </Text>
            </View>
            <Switch
              value={showNoteNames}
              onChange={handleShowNoteNamesChange}
              accessibilityLabel="Show note names"
            />
          </View>
        </View>

        {/* Row 2: Keep screen awake */}
        <View style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowLabel}>Keep screen awake</Text>
              <Text style={styles.rowDescription}>
                Prevent the display from sleeping while listening
              </Text>
            </View>
            <Switch
              value={keepScreenAwake}
              onChange={handleKeepScreenAwakeChange}
              accessibilityLabel="Keep screen awake"
            />
          </View>
        </View>

        {/* Row 3: Sensitivity */}
        <View style={styles.row}>
          <View style={styles.rowTextContainer}>
            <Text style={styles.rowLabel}>Sensitivity</Text>
            <Text style={styles.rowDescription}>
              Higher picks up softer playing, may add false notes
            </Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              value={sensitivity}
              onChange={handleSensitivityChange}
              min={0}
              max={1}
              step={0.01}
              accessibilityLabel="Microphone sensitivity"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: LAYOUT.settingsPanelMaxWidth,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.display.semiBold,
    fontSize: TYPE_SCALE.settingsTitle,
    color: COLORS.ink,
  },
  doneButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  doneText: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.body,
    color: COLORS.teal,
  },
  row: {
    borderBottomWidth: STROKE.thin,
    borderBottomColor: COLORS.divider,
    paddingVertical: SPACING.rowVertical,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  rowLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: TYPE_SCALE.body,
    color: COLORS.ink,
  },
  rowDescription: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.caption,
    color: COLORS.inkSoft,
    marginTop: SPACING.xs,
  },
  sliderContainer: {
    marginTop: SPACING.md,
  },
});
