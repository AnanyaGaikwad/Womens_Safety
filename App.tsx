import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { AlertBanner } from './src/components/AlertBanner';
import { EventLog } from './src/components/EventLog';
import { LevelMeter } from './src/components/LevelMeter';
import { ListeningOrb } from './src/components/ListeningOrb';
import { SafeWordField } from './src/components/SafeWordField';
import { useSoundGuard } from './src/hooks/useSoundGuard';
import { colors } from './src/theme/colors';

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    InstrumentSerif_400Regular,
  });

  const guard = useSoundGuard();
  const [draftSafeWord, setDraftSafeWord] = useState(guard.settings.safeWord);

  useEffect(() => {
    setDraftSafeWord(guard.settings.safeWord);
  }, [guard.settings.safeWord]);

  const statusCopy = useMemo(() => {
    switch (guard.status) {
      case 'listening':
        return 'Listening locally';
      case 'requesting_permission':
        return 'Requesting microphone';
      case 'triggered':
        return 'Threat pattern caught';
      case 'error':
        return 'Microphone unavailable';
      default:
        return 'Sound guard standing by';
    }
  }, [guard.status]);

  if (!fontsLoaded || !guard.ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const listening = guard.status === 'listening' || guard.status === 'triggered';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.atmosphere} />
      <View style={styles.atmosphereWash} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.brand}>Union</Text>
            <Text style={styles.headline}>Passive sound guard</Text>
            <Text style={styles.subhead}>
              On-device detection for screams, distress, and your verbal safe-word — then a
              silent evidence recorder.
            </Text>

            <View style={styles.orbBlock}>
              <ListeningOrb level={guard.level} status={guard.status} />
              <Text style={styles.status}>{statusCopy}</Text>
              <LevelMeter level={guard.level} db={guard.db} />
            </View>

            <Pressable
              onPress={listening ? guard.stop : guard.start}
              style={({ pressed }) => [
                styles.primaryCta,
                pressed && styles.pressed,
                listening && styles.primaryCtaActive,
              ]}
            >
              <Text style={styles.primaryCtaText}>
                {listening ? 'Stop listening' : 'Start sound detection'}
              </Text>
            </Pressable>
          </View>

          {guard.lastTrigger ? (
            <AlertBanner
              event={guard.lastTrigger}
              recordingEvidence={guard.recordingEvidence}
              onDismiss={guard.dismissTrigger}
            />
          ) : null}

          {guard.error ? <Text style={styles.error}>{guard.error}</Text> : null}

          <View style={styles.section}>
            <SafeWordField
              value={draftSafeWord}
              onChange={setDraftSafeWord}
              onSave={() => void guard.updateSafeWord(draftSafeWord)}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test triggers</Text>
            <Text style={styles.sectionBody}>
              Use these when a mic or speech API is unavailable. They run the same silent
              recorder path as a live detection.
            </Text>
            <View style={styles.testRow}>
              {(['scream', 'distress', 'safeword'] as const).map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => guard.simulate(kind)}
                  style={({ pressed }) => [styles.testChip, pressed && styles.pressed]}
                >
                  <Text style={styles.testChipText}>
                    {kind === 'safeword' ? 'Safe-word' : kind[0].toUpperCase() + kind.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <EventLog events={guard.events} onClear={() => void guard.clearEvents()} />
          </View>

          <Text style={styles.footer}>
            Local-only MVP. Mesh alarms and encrypted location broadcast come later.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  atmosphere: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
  },
  atmosphereWash: {
    position: 'absolute',
    top: -80,
    left: -40,
    right: -40,
    height: 420,
    backgroundColor: colors.bgSoft,
    opacity: 0.55,
    borderBottomLeftRadius: 280,
    borderBottomRightRadius: 280,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 28,
  },
  hero: {
    gap: 14,
    minHeight: 560,
    justifyContent: 'flex-start',
  },
  brand: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 56,
    lineHeight: 58,
    letterSpacing: -0.5,
  },
  headline: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  subhead: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
  },
  orbBlock: {
    marginTop: 18,
    alignItems: 'center',
    gap: 16,
  },
  status: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  primaryCta: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand,
  },
  primaryCtaActive: {
    borderBottomColor: colors.alert,
  },
  primaryCtaText: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  sectionBody: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  testRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  testChip: {
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  testChipText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  error: {
    color: colors.alert,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
