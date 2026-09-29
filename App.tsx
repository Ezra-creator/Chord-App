import React, { useEffect } from 'react';
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

// Prevent splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">
        <Stack.Screen
          name="Onboarding"
          options={{ headerShown: false }}
        >
          {(props) => (
            <OnboardingScreen
              {...props}
              onRequestPermission={() => {
                // Stub for next phase: transition to the Listen screen
                props.navigation.navigate('Listen');
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="Listen"
          component={ListenScreen}
          options={{ title: 'Listen' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
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

  // Lock to landscape (both landscape-left and landscape-right) at launch
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(
      (err) => {
        console.warn('Failed to lock screen orientation:', err);
      }
    );
  }, []);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Loading gate: do not render app until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar hidden={false} style="dark" />
      <View style={styles.container}>
        {isPortrait ? <RotatePrompt /> : <AppNavigator />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
