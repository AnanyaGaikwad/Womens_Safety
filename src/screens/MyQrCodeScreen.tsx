import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MyQrCode'>;

/**
 * Sprint 4 Milestone 5 — My QR Code.
 * Encodes ONLY the Firebase Auth UID (Union User ID). No secrets or PII.
 */
export function MyQrCodeScreen({ navigation }: Props) {
  const { ready, loading, unionId, registrationStatus } = useProfile();
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    if (!unionId) return;
    await Clipboard.setStringAsync(unionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [unionId]);

  if (!ready || loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const canShow = Boolean(unionId) && registrationStatus === 'Registered';

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.back}>Back</Text>
          </Pressable>

          <Text style={styles.title}>My QR Code</Text>
          <Text style={styles.subhead}>
            Let a trusted person scan this code to find your Union ID. The code
            contains only your Union User ID.
          </Text>

          {canShow && unionId ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode
                  value={unionId}
                  size={220}
                  backgroundColor={colors.white}
                  color={colors.bg}
                  ecl="M"
                />
              </View>

              <View style={styles.idBlock}>
                <Text style={styles.label}>Union User ID</Text>
                <Text style={styles.unionId} selectable>
                  {unionId}
                </Text>
              </View>

              <Pressable
                onPress={() => void onCopy()}
                style={({ pressed }) => [
                  styles.copyBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.copyBtnText}>
                  {copied ? 'Copied' : 'Copy Union ID'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.empty}>
              Register with Firebase to generate your Union QR code. Sprint
              features still work offline without it.
            </Text>
          )}
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgSoft,
    opacity: 0.35,
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
    paddingTop: 16,
    paddingBottom: 48,
    gap: 18,
    alignItems: 'stretch',
  },
  back: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    lineHeight: 44,
  },
  subhead: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
  },
  qrWrap: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 18,
    backgroundColor: colors.white,
  },
  idBlock: {
    gap: 8,
    paddingTop: 8,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  unionId: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.brandSoft,
  },
  copyBtnText: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  empty: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});
