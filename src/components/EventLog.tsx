import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { DetectionEvent } from '../types/detection';

type Props = {
  events: DetectionEvent[];
  onClear: () => void;
};

const KIND_LABEL: Record<DetectionEvent['kind'], string> = {
  scream: 'Scream',
  distress: 'Distress',
  safeword: 'Safe-word',
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EventLog({ events, onClear }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Detection log</Text>
        {events.length > 0 ? (
          <Pressable onPress={onClear} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {events.length === 0 ? (
        <Text style={styles.empty}>
          No detections yet. Union listens locally for screams, distress patterns, and your
          safe-word.
        </Text>
      ) : (
        events.map((event) => (
          <View key={event.id} style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.kind}>{KIND_LABEL[event.kind]}</Text>
              <Text style={styles.time}>{formatTime(event.timestamp)}</Text>
            </View>
            <Text style={styles.note}>{event.note}</Text>
            <Text style={styles.meta}>
              {(event.confidence * 100).toFixed(0)}% confidence
              {event.evidenceUri ? ' · evidence saved' : ''}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 14,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  clear: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  empty: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  kind: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.6,
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
  },
  pressed: {
    opacity: 0.65,
  },
});
