import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { useGuardianAlertNotificationNavigation } from './src/hooks/useGuardianAlertNotificationNavigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootStackParamList } from './src/navigation/types';
import { ensureAnonymousRegistration } from './src/services/AuthService';
import { initializeFirebase } from './src/services/firebase';
import { ensurePushTokenRegistration } from './src/services/PushService';
import { colors } from './src/theme/colors';

// Milestone 1: soft-fail Firebase JS SDK bootstrap (Auth + Firestore).
// Sprint 1–3 continue if Firebase is unavailable.
initializeFirebase();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.ink,
    border: colors.line,
    primary: colors.brand,
  },
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    InstrumentSerif_400Regular,
  });

  const navigationRefStable = useRef(navigationRef).current;
  useGuardianAlertNotificationNavigation(navigationRefStable);

  // Milestone 2–4: anonymous auth, then soft-fail Expo push token registration.
  useEffect(() => {
    void (async () => {
      const registration = await ensureAnonymousRegistration();
      const uid = registration.authUid ?? registration.user?.uid;
      if (uid) {
        await ensurePushTokenRegistration(uid);
      }
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
