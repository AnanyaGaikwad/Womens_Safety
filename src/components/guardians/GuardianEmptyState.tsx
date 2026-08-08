import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  onAdd: () => void;
};

export function GuardianEmptyState({ onAdd }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>No guardians added yet.</Text>
      <Text style={styles.body}>
        Add trusted people Union can reach when a future emergency alert is ready.
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>Add Guardian</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 36,
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 30,
    lineHeight: 34,
  },
  body: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
  button: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 22,
    backgroundColor: colors.brand,
  },
  buttonText: {
    color: colors.bg,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
  },
});
