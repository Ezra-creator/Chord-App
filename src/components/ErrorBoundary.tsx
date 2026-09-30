import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  COLORS,
  FONTS,
  TYPE_SCALE,
  SPACING,
  RADIUS,
  STROKE,
  OPACITY,
} from '../theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught exception in component tree:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>!</Text>
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              ChordApp encountered an unexpected issue. Tap below to resume your listening session.
            </Text>
            <Pressable
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Restart Session"
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Restart Session</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.paper,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  card: {
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: STROKE.thin,
    borderColor: COLORS.error,
  },
  iconText: {
    fontFamily: FONTS.display.bold,
    fontSize: 22,
    color: COLORS.error,
  },
  title: {
    fontFamily: FONTS.display.bold,
    fontSize: TYPE_SCALE.screenTitle,
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontFamily: FONTS.body.regular,
    fontSize: TYPE_SCALE.body,
    color: COLORS.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.teal,
    borderRadius: RADIUS.button,
    paddingVertical: SPACING.buttonPadding,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  buttonPressed: {
    opacity: OPACITY.pressed,
  },
  buttonText: {
    fontFamily: FONTS.body.semiBold,
    fontSize: TYPE_SCALE.body,
    color: '#FFFFFF',
  },
});
