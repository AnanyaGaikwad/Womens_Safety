import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GuardianCard } from '../components/guardians/GuardianCard';
import { GuardianEmptyState } from '../components/guardians/GuardianEmptyState';
import { GuardianFormModal } from '../components/guardians/GuardianFormModal';
import { GuardianStats } from '../components/guardians/GuardianStats';
import { useGuardians } from '../hooks/useGuardians';
import { colors } from '../theme/colors';
import { Guardian, GuardianInput } from '../types/guardian';

export function GuardiansScreen() {
  const {
    ready,
    guardians,
    totalCount,
    activeCount,
    error,
    create,
    update,
    remove,
    toggleEnabled,
    stubNotify,
  } = useGuardians();

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Guardian | null>(null);

  const openCreate = useCallback(() => {
    setFormMode('create');
    setEditing(null);
    setFormVisible(true);
  }, []);

  const openEdit = useCallback((guardian: Guardian) => {
    setFormMode('edit');
    setEditing(guardian);
    setFormVisible(true);
  }, []);

  const handleSubmit = useCallback(
    async (input: GuardianInput) => {
      if (formMode === 'edit' && editing) {
        await update(editing.id, input);
        return;
      }
      await create(input);
    },
    [create, editing, formMode, update]
  );

  const handleRemove = useCallback(
    (guardian: Guardian) => {
      const message = `Remove ${guardian.fullName} from your trusted circle?`;
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm(message)) {
          void remove(guardian.id);
        }
        return;
      }

      Alert.alert('Remove guardian', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void remove(guardian.id);
          },
        },
      ]);
    },
    [remove]
  );

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Guardians</Text>
            <Text style={styles.subhead}>
              Manage the trusted people Union can reach when emergency alerts are ready.
            </Text>
          </View>

          <GuardianStats total={totalCount} active={activeCount} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {guardians.length === 0 ? (
            <GuardianEmptyState onAdd={openCreate} />
          ) : (
            <View style={styles.list}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Your circle</Text>
                <Pressable
                  onPress={openCreate}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.addLink}>Add guardian</Text>
                </Pressable>
              </View>

              {guardians.map((guardian) => (
                <GuardianCard
                  key={guardian.id}
                  guardian={guardian}
                  onEdit={openEdit}
                  onRemove={handleRemove}
                  onToggleEnabled={(item, enabled) => {
                    void toggleEnabled(item.id, enabled);
                  }}
                />
              ))}

              <Pressable
                onPress={() => void stubNotify()}
                style={({ pressed }) => [styles.stubAction, pressed && styles.pressed]}
              >
                <Text style={styles.stubActionText}>
                  Preview alert stub (console only)
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <GuardianFormModal
        visible={formVisible}
        mode={formMode}
        initial={editing}
        existing={guardians}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgSoft,
    opacity: 0.35,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 24,
  },
  header: {
    gap: 10,
  },
  brand: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 48,
    lineHeight: 52,
  },
  subhead: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360,
  },
  list: {
    gap: 4,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listTitle: {
    color: colors.ink,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  addLink: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  stubAction: {
    marginTop: 18,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  stubActionText: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  error: {
    color: colors.alert,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
