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
import type { RootStackParamList } from './src/navigation/types';
import {
  SettingsProvider,
  loadPersistedSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from './src/settings';

// Prevent splash screen from auto-hiding before fonts and settings are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">
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

  // Lock to landscape (both landscape-left and landscape-right) at launch
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      (err) => {
        console.warn('Failed to lock screen orientation:', err);
      }
    );
  }, []);

  // Hide splash screen once fonts AND settings are fully loaded
  useEffect(() => {
    if ((fontsLoaded || fontError) && settingsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, settingsLoaded]);

  // Loading gate: do not render app until fonts and persisted settings are loaded
  if ((!fontsLoaded && !fontError) || !settingsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden={false} style="dark" />
      <SettingsProvider initialSettings={initialSettings}>
        <View style={styles.container}>
          {isPortrait ? <RotatePrompt /> : <AppNavigator />}
        </View>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
