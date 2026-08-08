import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ensureAnonymousRegistration } from './src/services/AuthService';
import { initializeFirebase } from './src/services/firebase';
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

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    InstrumentSerif_400Regular,
  });

  // Milestone 2: anonymous auth + users/{uid} upsert (non-blocking, soft-fail).
  useEffect(() => {
    void ensureAnonymousRegistration();
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
      <NavigationContainer theme={navTheme}>
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
