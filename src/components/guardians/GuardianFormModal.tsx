import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import {
  Guardian,
  GuardianInput,
  GuardianValidationErrors,
  RELATIONSHIP_OPTIONS,
} from '../../types/guardian';
import {
  hasValidationErrors,
  validateGuardianInput,
} from '../../services/guardianValidation';

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  initial?: Guardian | null;
  existing: Guardian[];
  onClose: () => void;
  onSubmit: (input: GuardianInput) => Promise<void>;
};

const emptyForm: GuardianInput = {
  fullName: '',
  phoneNumber: '',
  relationship: 'Family',
  photoUri: null,
  trusted: true,
  enabled: true,
};

export function GuardianFormModal({
  visible,
  mode,
  initial,
  existing,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<GuardianInput>(emptyForm);
  const [errors, setErrors] = useState<GuardianValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && initial) {
      setForm({
        fullName: initial.fullName,
        phoneNumber: initial.phoneNumber,
        relationship: initial.relationship,
        photoUri: initial.photoUri ?? null,
        trusted: initial.trusted,
        enabled: initial.enabled,
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setFormError(null);
  }, [visible, mode, initial]);

  const updateField = <K extends keyof GuardianInput>(
    key: K,
    value: GuardianInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFormError('Photo library permission is required to add a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      updateField('photoUri', result.assets[0].uri);
      setFormError(null);
    }
  };

  const handleSubmit = async () => {
    const nextErrors = validateGuardianInput(
      form,
      existing,
      mode === 'edit' ? initial?.id : undefined
    );
    setErrors(nextErrors);
    if (hasValidationErrors(nextErrors)) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save guardian.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>
              {mode === 'edit' ? 'Edit guardian' : 'Add guardian'}
            </Text>
            <Text style={styles.subtitle}>
              Stored only on this device. Alerts come in a later sprint.
            </Text>

            <Pressable
              onPress={() => void pickPhoto()}
              style={({ pressed }) => [styles.photoRow, pressed && styles.pressed]}
            >
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>Photo</Text>
                </View>
              )}
              <View style={styles.photoCopy}>
                <Text style={styles.photoAction}>
                  {form.photoUri ? 'Change photo' : 'Add optional photo'}
                </Text>
                {form.photoUri ? (
                  <Pressable onPress={() => updateField('photoUri', null)}>
                    <Text style={styles.clearPhoto}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>

            <Field
              label="Full name"
              value={form.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              error={errors.fullName}
              placeholder="Jordan Lee"
              autoCapitalize="words"
            />

            <Field
              label="Phone number"
              value={form.phoneNumber}
              onChangeText={(value) => updateField('phoneNumber', value)}
              error={errors.phoneNumber}
              placeholder="+1 415 555 0100"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Relationship</Text>
            <View style={styles.relationshipRow}>
              {RELATIONSHIP_OPTIONS.map((option) => {
                const selected = form.relationship === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => updateField('relationship', option)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.relationship ? (
              <Text style={styles.error}>{errors.relationship}</Text>
            ) : null}

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Trusted</Text>
                <Text style={styles.switchHint}>
                  Mark people you trust for future emergency alerts.
                </Text>
              </View>
              <Switch
                value={Boolean(form.trusted)}
                onValueChange={(value) => updateField('trusted', value)}
                trackColor={{ false: colors.bgSoft, true: colors.brandSoft }}
                thumbColor={form.trusted ? colors.brand : colors.inkDim}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Enabled</Text>
                <Text style={styles.switchHint}>
                  Disabled guardians stay saved but are skipped for alerts.
                </Text>
              </View>
              <Switch
                value={Boolean(form.enabled)}
                onValueChange={(value) => updateField('enabled', value)}
                trackColor={{ false: colors.bgSoft, true: colors.brandSoft }}
                thumbColor={form.enabled ? colors.brand : colors.inkDim}
              />
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSubmit()}
                disabled={submitting}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>
                  {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add guardian'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
};

function Field({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkDim}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    gap: 16,
  },
  title: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    lineHeight: 36,
  },
  subtitle: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  photoPlaceholderText: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  photoCopy: {
    gap: 4,
  },
  photoAction: {
    color: colors.brand,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  clearPhoto: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    paddingVertical: 10,
  },
  relationshipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chipSelected: {
    borderBottomColor: colors.brand,
  },
  chipText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
  },
  chipTextSelected: {
    color: colors.ink,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  switchHint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  secondary: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  secondaryText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  primary: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: colors.brand,
  },
  primaryText: {
    color: colors.bg,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
  },
  error: {
    color: colors.alert,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
