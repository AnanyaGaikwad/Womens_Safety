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
import { useAlertHistory } from '../hooks/useAlertHistory';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { REASON_LABEL } from '../types/alert';

type Props = NativeStackScreenProps<RootStackParamList, 'AlertHistory'>;

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AlertHistoryScreen({ navigation }: Props) {
  const { ready, alerts, error, clear } = useAlertHistory();

  return (
    <View style={styles.root}>
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

          <Text style={styles.title}>Alert history</Text>
          <Text style={styles.subhead}>
            Local emergency pipeline runs — newest first. Nothing leaves this device.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!ready ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: 24 }} />
          ) : alerts.length === 0 ? (
            <Text style={styles.empty}>No emergency alerts yet.</Text>
          ) : (
            <View style={styles.list}>
              <View style={styles.listHeader}>
                <Text style={styles.count}>{alerts.length} saved</Text>
                <Pressable
                  onPress={() => void clear()}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              </View>

              {alerts.map((alert) => {
                const location =
                  alert.location.available &&
                  alert.location.latitude != null &&
                  alert.location.longitude != null
                    ? `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
                    : `Unavailable (${alert.location.permissionStatus})`;

                return (
                  <View key={alert.id} style={styles.row}>
                    <View style={styles.rowTop}>
                      <Text style={styles.reason}>{REASON_LABEL[alert.reason]}</Text>
                      <Text style={styles.time}>{formatTime(alert.timestamp)}</Text>
                    </View>
                    <Text style={styles.note}>{alert.note}</Text>
                    <Text style={styles.meta}>Location · {location}</Text>
                    <Text style={styles.meta}>
                      Guardians · {alert.guardiansNotified.length} ·{' '}
                      {alert.deliveryStatus === 'completed'
                        ? 'Delivered (Simulated)'
                        : alert.deliveryStatus === 'no_recipients'
                          ? 'No recipients'
                          : alert.deliveryStatus}
                    </Text>
                  </View>
                );
              })}
            </View>
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
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
  },
  back: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
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
  empty: {
    marginTop: 12,
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.alert,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  list: {
    marginTop: 8,
    gap: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  count: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  clear: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  row: {
    gap: 4,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  reason: {
    color: colors.alert,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  time: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  note: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
