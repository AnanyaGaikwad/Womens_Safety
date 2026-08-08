import { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEmergencySession } from '../hooks/useEmergencySession';
import { useSoundGuardContext } from '../hooks/SoundGuardContext';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { REASON_LABEL } from '../types/alert';

type Props = NativeStackScreenProps<RootStackParamList, 'EmergencyAlert'>;

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EmergencyAlertScreen({ navigation }: Props) {
  const guard = useSoundGuardContext();
  const { activeAlert, recordingEvidence } = useEmergencySession();

  const alert = activeAlert ?? guard.activeAlert;

  const locationCopy = useMemo(() => {
    if (!alert) return '—';
    const { location } = alert;
    if (!location.available || location.latitude == null || location.longitude == null) {
      return `Unavailable (${location.permissionStatus})`;
    }
    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }, [alert]);

  const deliveryCopy = useMemo(() => {
    if (!alert) return '—';
    if (alert.deliveryStatus === 'no_recipients') return 'No enabled guardians';
    if (alert.deliveryStatus === 'in_progress') return 'Sending (simulated)…';
    const delivered = alert.guardiansNotified.filter((g) => g.status === 'delivered').length;
    return `${delivered} delivered (simulated)`;
  }, [alert]);

  const onDismiss = () => {
    guard.dismissActiveAlert();
    navigation.navigate('MainTabs');
  };

  const onReturn = async () => {
    await guard.returnToMonitoring();
    navigation.navigate('MainTabs');
  };

  if (!alert) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <Text style={styles.title}>Emergency Active</Text>
          <Text style={styles.body}>No active emergency alert.</Text>
          <Pressable onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.link}>Back to Guard</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  const recording = recordingEvidence || alert.evidenceRecording || guard.recordingEvidence;

  return (
    <View style={styles.root}>
      <View style={styles.wash} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>Union</Text>
          <Text style={styles.title}>Emergency Active</Text>
          <Text style={styles.subhead}>
            Detection triggered the local guardian alert pipeline. Nothing was sent off-device.
          </Text>

          <View style={styles.block}>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{REASON_LABEL[alert.reason]}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Detected trigger</Text>
            <Text style={styles.value}>{alert.note}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{formatTime(alert.timestamp)}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Current GPS</Text>
            <Text style={styles.value}>{locationCopy}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Guardians notified</Text>
            <Text style={styles.value}>{alert.guardiansNotified.length}</Text>
            {alert.guardiansNotified.map((delivery) => (
              <Text key={delivery.guardianId} style={styles.detail}>
                {delivery.fullName} · {delivery.phoneNumber} ·{' '}
                {delivery.status === 'delivered' ? 'Delivered (Simulated)' : delivery.status}
              </Text>
            ))}
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Evidence recording</Text>
            <Text style={styles.value}>
              {recording
                ? 'Capture in progress'
                : alert.evidenceUri
                  ? 'Clip saved locally'
                  : 'No clip available'}
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Delivery status</Text>
            <Text style={styles.value}>{deliveryCopy}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>Dismiss</Text>
            </Pressable>
            <Pressable
              onPress={() => void onReturn()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Return to monitoring</Text>
            </Pressable>
          </View>
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
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.alertSoft,
    opacity: 0.55,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 20,
  },
  eyebrow: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 44,
    lineHeight: 48,
  },
  subhead: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
    marginBottom: 8,
  },
  body: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  block: {
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  label: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 22,
  },
  detail: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  actions: {
    marginTop: 16,
    gap: 14,
  },
  primary: {
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.brand,
  },
  primaryText: {
    color: colors.bg,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  secondary: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  link: {
    marginTop: 16,
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
  },
});
