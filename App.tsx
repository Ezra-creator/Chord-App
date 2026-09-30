import React, { useEffect, useState } from 'react';
import { useWindowDimensions, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';

import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ListenScreen } from './src/screens/ListenScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { RotatePrompt } from './src/components/RotatePrompt';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import type { RootStackParamList } from './src/navigation/types';
import { getRecordingPermissionsAsync } from 'expo-audio';
import {
  SettingsProvider,
  loadPersistedSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from './src/settings';

// Prevent splash screen from auto-hiding before fonts and settings are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator({ initialRoute }: { initialRoute: keyof RootStackParamList }) {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Listen"
          component={ListenScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  // Load custom typography fonts
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  // Load persisted app settings on startup before rendering screens
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [initialSettings, setInitialSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let isMounted = true;
    loadPersistedSettings().then((loaded) => {
      if (isMounted) {
        setInitialSettings(loaded);
        setSettingsLoaded(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Check if microphone permission is already granted to skip onboarding for returning users
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Onboarding');
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getRecordingPermissionsAsync()
      .then((status) => {
        if (isMounted) {
          if (status.granted) {
            setInitialRoute('Listen');
          }
          setPermissionChecked(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPermissionChecked(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Lock to landscape and re-assert on orientation changes / OS prompt dismissal
  useEffect(() => {
    const lockLandscape = () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
        (err) => {
          console.warn('Failed to lock screen orientation:', err);
        }
      );
    };

    lockLandscape();

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const o = event.orientationInfo.orientation;
      if (
        o === ScreenOrientation.Orientation.PORTRAIT_UP ||
        o === ScreenOrientation.Orientation.PORTRAIT_DOWN
      ) {
        lockLandscape();
      }
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  // Hide splash screen once fonts, settings, AND permissions are fully loaded
  useEffect(() => {
    if ((fontsLoaded || fontError) && settingsLoaded && permissionChecked) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, settingsLoaded, permissionChecked]);

  // Loading gate: do not render app until fonts, persisted settings, and permissions are loaded
  if ((!fontsLoaded && !fontError) || !settingsLoaded || !permissionChecked) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden={false} style="dark" />
      <SettingsProvider initialSettings={initialSettings}>
        <ErrorBoundary>
          <View style={styles.container}>
            {/* Keep AppNavigator continuously mounted so state, permissions, and audio stream are preserved */}
            <AppNavigator initialRoute={initialRoute} />
            {isPortrait ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="auto">
                <RotatePrompt />
              </View>
            ) : null}
          </View>
        </ErrorBoundary>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
