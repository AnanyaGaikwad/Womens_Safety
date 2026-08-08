import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { Guardian } from '../../types/guardian';

type Props = {
  guardian: Guardian;
  onEdit: (guardian: Guardian) => void;
  onRemove: (guardian: Guardian) => void;
  onToggleEnabled: (guardian: Guardian, enabled: boolean) => void;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function GuardianCard({
  guardian,
  onEdit,
  onRemove,
  onToggleEnabled,
}: Props) {
  return (
    <View style={[styles.card, !guardian.enabled && styles.cardDisabled]}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          {guardian.photoUri ? (
            <Image source={{ uri: guardian.photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials(guardian.fullName)}</Text>
            </View>
          )}
          <View style={styles.copy}>
            <Text style={styles.name}>{guardian.fullName}</Text>
            <Text style={styles.meta}>
              {guardian.relationship}
              {guardian.trusted ? ' · Trusted' : ''}
            </Text>
            <Text style={styles.phone}>{guardian.phoneNumber}</Text>
          </View>
        </View>

        <View style={styles.toggleBlock}>
          <Text style={styles.toggleLabel}>{guardian.enabled ? 'On' : 'Off'}</Text>
          <Switch
            value={guardian.enabled}
            onValueChange={(enabled) => onToggleEnabled(guardian, enabled)}
            trackColor={{ false: colors.bgSoft, true: colors.brandSoft }}
            thumbColor={guardian.enabled ? colors.brand : colors.inkDim}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => onEdit(guardian)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={() => onRemove(guardian)}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarText: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
  meta: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  phone: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  toggleBlock: {
    alignItems: 'flex-end',
    gap: 6,
  },
  toggleLabel: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 18,
    paddingLeft: 66,
  },
  action: {
    paddingVertical: 4,
  },
  actionText: {
    color: colors.brand,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  removeText: {
    color: colors.alert,
  },
  pressed: {
    opacity: 0.65,
  },
});
