import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { GuardianRelationship } from '../../types/guardianRelationship';

type Props = {
  relationship: GuardianRelationship;
  /** Whose name to emphasize in the card. */
  perspective: 'owner' | 'guardian';
  onToggleEnabled?: (relationship: GuardianRelationship, enabled: boolean) => void;
  onRemove?: (relationship: GuardianRelationship) => void;
  allowToggle?: boolean;
};

export function NetworkRelationshipCard({
  relationship,
  perspective,
  onToggleEnabled,
  onRemove,
  allowToggle = false,
}: Props) {
  const title =
    perspective === 'owner'
      ? relationship.guardianDisplayName
      : relationship.ownerDisplayName;
  const subtitleUid =
    perspective === 'owner' ? relationship.guardianUid : relationship.ownerUid;

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.meta}>
            {relationship.relationship}
            {relationship.trusted ? ' · Trusted' : ''}
            {relationship.enabled ? '' : ' · Disabled'}
          </Text>
          <Text style={styles.uid} selectable>
            {subtitleUid}
          </Text>
        </View>
        {allowToggle && onToggleEnabled ? (
          <Switch
            value={relationship.enabled}
            onValueChange={(enabled) => onToggleEnabled(relationship, enabled)}
            trackColor={{ false: colors.bgSoft, true: colors.brandSoft }}
            thumbColor={relationship.enabled ? colors.brand : colors.inkDim}
          />
        ) : (
          <Text style={styles.status}>
            {relationship.enabled ? 'Enabled' : 'Disabled'}
          </Text>
        )}
      </View>
      {onRemove ? (
        <Pressable
          onPress={() => onRemove(relationship)}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        >
          <Text style={styles.removeText}>
            {perspective === 'owner' ? 'Remove guardian' : 'Stop protecting'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
  },
  meta: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  uid: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  status: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  remove: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  removeText: {
    color: colors.alert,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
