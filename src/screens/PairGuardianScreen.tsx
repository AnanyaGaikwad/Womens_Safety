import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useGuardianRequests } from '../hooks/useGuardianRequests';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PairGuardian'>;

/**
 * Sprint 4 Milestone 6 — send a guardian pairing request by Union ID or QR scan.
 * Requester identity is always the authenticated Firebase UID.
 */
export function PairGuardianScreen({ navigation }: Props) {
  const { sendRequest, sending, error, setError } = useGuardianRequests();
  const [unionId, setUnionId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedLock, setScannedLock] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const submit = useCallback(
    async (targetUid: string) => {
      setMessage(null);
      setError(null);
      try {
        const created = await sendRequest(targetUid);
        setMessage(
          `Request sent to ${created.targetDisplayName}. Waiting for their response.`
        );
        setUnionId('');
        setScanning(false);
      } catch (err) {
        setMessage(null);
        // error already set by hook; keep local copy for display below input
        if (!(err instanceof Error)) {
          setError('Failed to send request.');
        }
      }
    },
    [sendRequest, setError]
  );

  const onScan = useCallback(
    (data: string) => {
      if (scannedLock || sending) return;
      const value = data.trim();
      if (!value) return;
      setScannedLock(true);
      setUnionId(value);
      setScanning(false);
      void submit(value).finally(() => {
        setTimeout(() => setScannedLock(false), 1500);
      });
    },
    [scannedLock, sending, submit]
  );

  const startScan = async () => {
    setMessage(null);
    setError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError(
          'Camera permission is required to scan a QR code. You can still enter a Union ID manually.'
        );
        return;
      }
    }
    setScanning(true);
  };

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.back}>Back</Text>
          </Pressable>

          <Text style={styles.title}>Pair Guardian</Text>
          <Text style={styles.subhead}>
            Enter another person’s Union User ID, or scan their My QR Code. A
            pending request will appear on their Guardians screen.
          </Text>

          <View style={styles.block}>
            <Text style={styles.label}>Union User ID</Text>
            <TextInput
              value={unionId}
              onChangeText={(value) => {
                setUnionId(value);
                setMessage(null);
                setError(null);
              }}
              placeholder="Paste or type Union ID"
              placeholderTextColor={colors.inkDim}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Pressable
              disabled={sending || !unionId.trim()}
              onPress={() => void submit(unionId)}
              style={({ pressed }) => [
                styles.primaryBtn,
                (sending || !unionId.trim()) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {sending ? 'Sending…' : 'Send request'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => void startScan()}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryBtnText}>
              {scanning ? 'Scanner open' : 'Scan QR Code'}
            </Text>
          </Pressable>

          {scanning ? (
            <View style={styles.scanner}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => onScan(data)}
              />
              <Text style={styles.scanHint}>
                Point at a Union QR code. Manual entry still works if scanning
                is unavailable.
              </Text>
              <Pressable
                onPress={() => setScanning(false)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.back}>Close scanner</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {sending ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} />
          ) : null}
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
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 18,
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
  block: {
    gap: 10,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  primaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.brandSoft,
  },
  primaryBtnText: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  secondaryBtnText: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  scanner: {
    gap: 10,
  },
  camera: {
    width: '100%',
    height: 280,
    backgroundColor: colors.bgElevated,
  },
  scanHint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  success: {
    color: colors.brand,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.alert,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
