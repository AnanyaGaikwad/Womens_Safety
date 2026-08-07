import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  disabled?: boolean;
};

export function SafeWordField({ value, onChange, onSave, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Verbal safe-word</Text>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="e.g. red lantern"
          placeholderTextColor={colors.inkDim}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          style={styles.input}
          onSubmitEditing={onSave}
        />
        <Pressable
          onPress={onSave}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            disabled && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>Save</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Spoken locally on-device. When heard, Union silently starts an evidence recorder.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 10,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    paddingVertical: 10,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  hint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
});
