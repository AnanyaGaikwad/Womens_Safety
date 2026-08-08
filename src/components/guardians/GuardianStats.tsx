import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  total: number;
  active: number;
};

export function GuardianStats({ total, active }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.item}>
        <Text style={styles.value}>{total}</Text>
        <Text style={styles.label}>Total Guardians</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={styles.value}>{active}</Text>
        <Text style={styles.label}>Active Guardians</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  item: {
    flex: 1,
    gap: 4,
  },
  value: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 36,
    lineHeight: 40,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.line,
    marginHorizontal: 18,
  },
});
