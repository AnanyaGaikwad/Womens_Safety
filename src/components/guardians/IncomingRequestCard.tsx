import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { GuardianRequest } from '../../types/guardianRequest';

type Props = {
  request: GuardianRequest;
  onAccept: (request: GuardianRequest) => void;
  onReject: (request: GuardianRequest) => void;
  busy?: boolean;
};

export function IncomingRequestCard({
  request,
  onAccept,
  onReject,
  busy,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{request.requesterDisplayName}</Text>
      <Text style={styles.meta}>Union ID</Text>
      <Text style={styles.uid} selectable>
        {request.requesterUid}
      </Text>
      <View style={styles.actions}>
        <Pressable
          disabled={busy}
          onPress={() => onAccept(request)}
          style={({ pressed }) => [
            styles.accept,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={() => onReject(request)}
          style={({ pressed }) => [
            styles.reject,
            busy && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
  meta: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  uid: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  accept: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.brandSoft,
  },
  acceptText: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  reject: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rejectText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
});
