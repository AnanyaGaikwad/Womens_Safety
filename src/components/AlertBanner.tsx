import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { DetectionEvent } from '../types/detection';

type Props = {
  event: DetectionEvent;
  recordingEvidence: boolean;
  onDismiss: () => void;
};

const KIND_LABEL: Record<DetectionEvent['kind'], string> = {
  scream: 'Scream detected',
  distress: 'Distress pattern',
  safeword: 'Safe-word spoken',
};

export function AlertBanner({ event, recordingEvidence, onDismiss }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{KIND_LABEL[event.kind]}</Text>
      <Text style={styles.title}>Silent recorder armed</Text>
      <Text style={styles.body}>{event.note}</Text>
      <Text style={styles.meta}>
        Confidence {(event.confidence * 100).toFixed(0)}%
        {recordingEvidence ? ' · Evidence capture in progress' : ''}
        {event.evidenceUri ? ' · Clip saved locally' : ''}
      </Text>
      <Pressable onPress={onDismiss} style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.dismiss}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.alertSoft,
    backgroundColor: colors.alertSoft,
  },
  eyebrow: {
    color: colors.alert,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    lineHeight: 32,
  },
  body: {
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
  dismiss: {
    marginTop: 4,
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.65,
  },
});
