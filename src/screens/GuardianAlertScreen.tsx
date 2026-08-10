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
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { REASON_LABEL } from '../types/alert';
import { DetectionKind } from '../types/detection';

type Props = NativeStackScreenProps<RootStackParamList, 'GuardianAlert'>;

function formatTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—';
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function reasonLabel(reason: string): string {
  if (reason in REASON_LABEL) {
    return REASON_LABEL[reason as DetectionKind];
  }
  return reason || 'Emergency';
}

/**
 * Inbound screen for a guardian who tapped a remote Union emergency notification.
 * Distinct from EmergencyAlertScreen (local trigger / victim pipeline).
 */
export function GuardianAlertScreen({ navigation, route }: Props) {
  const {
    alertId,
    ownerUid,
    ownerDisplayName,
    reason,
    timestamp,
    latitude,
    longitude,
    note,
  } = route.params;

  const timeCopy = useMemo(() => formatTime(Number(timestamp)), [timestamp]);

  const locationCopy = useMemo(() => {
    const lat = latitude == null || latitude === '' ? null : Number(latitude);
    const lng =
      longitude == null || longitude === '' ? null : Number(longitude);
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return 'Unavailable';
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }, [latitude, longitude]);

  return (
    <View style={styles.root}>
      <View style={styles.wash} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>Union</Text>
          <Text style={styles.title}>Guardian Alert</Text>
          <Text style={styles.subhead}>
            Someone you protect may need help. Review the details below.
          </Text>

          <View style={styles.block}>
            <Text style={styles.label}>Protected person</Text>
            <Text style={styles.value}>{ownerDisplayName || 'Union User'}</Text>
            {ownerUid ? (
              <Text style={styles.detail} selectable>
                {ownerUid}
              </Text>
            ) : null}
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{reasonLabel(reason)}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{timeCopy}</Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{locationCopy}</Text>
          </View>

          {note ? (
            <View style={styles.block}>
              <Text style={styles.label}>Note</Text>
              <Text style={styles.value}>{note}</Text>
            </View>
          ) : null}

          {alertId ? (
            <View style={styles.block}>
              <Text style={styles.label}>Alert ID</Text>
              <Text style={styles.detail} selectable>
                {alertId}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => navigation.navigate('MainTabs')}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Back to Union</Text>
          </Pressable>
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
    backgroundColor: colors.bgSoft,
    opacity: 0.4,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 18,
  },
  eyebrow: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 36,
    lineHeight: 40,
  },
  subhead: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  block: {
    gap: 4,
  },
  label: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
  },
  detail: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  primary: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.brand,
  },
  primaryText: {
    color: colors.bg,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
