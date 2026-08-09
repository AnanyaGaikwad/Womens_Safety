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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GuardianCard } from '../components/guardians/GuardianCard';
import { GuardianEmptyState } from '../components/guardians/GuardianEmptyState';
import { GuardianFormModal } from '../components/guardians/GuardianFormModal';
import { GuardianStats } from '../components/guardians/GuardianStats';
import { IncomingRequestCard } from '../components/guardians/IncomingRequestCard';
import { useGuardianRequests } from '../hooks/useGuardianRequests';
import { useGuardians } from '../hooks/useGuardians';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Guardian, GuardianInput } from '../types/guardian';
import { GuardianRequest } from '../types/guardianRequest';

export function GuardiansScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  const {
    ready: requestsReady,
    loading: requestsLoading,
    incoming,
    outgoing,
    error: requestsError,
    refresh: refreshRequests,
    accept,
    reject,
  } = useGuardianRequests();

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refreshRequests();
    }, [refreshRequests])
  );

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

  const handleAccept = useCallback(
    async (request: GuardianRequest) => {
      setRespondingId(request.id);
      try {
        await accept(request.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not accept request.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert('Accept failed', message);
        }
      } finally {
        setRespondingId(null);
      }
    },
    [accept]
  );

  const handleReject = useCallback(
    async (request: GuardianRequest) => {
      setRespondingId(request.id);
      try {
        await reject(request.id);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not reject request.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert('Reject failed', message);
        }
      } finally {
        setRespondingId(null);
      }
    },
    [reject]
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

          <View style={styles.networkActions}>
            <Pressable
              onPress={() => navigation.navigate('PairGuardian')}
              style={({ pressed }) => [styles.pairBtn, pressed && styles.pressed]}
            >
              <Text style={styles.pairBtnText}>Pair Guardian</Text>
            </Pressable>
            <Text style={styles.networkHint}>
              Send a network request with a Union ID or QR scan. Local contacts
              below still work offline.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Incoming requests</Text>
              {requestsLoading ? (
                <ActivityIndicator color={colors.brand} />
              ) : null}
            </View>
            {requestsError ? (
              <Text style={styles.error}>{requestsError}</Text>
            ) : null}
            {requestsReady && incoming.length === 0 ? (
              <Text style={styles.empty}>No pending guardian requests.</Text>
            ) : (
              <View style={styles.requestList}>
                {incoming.map((request) => (
                  <IncomingRequestCard
                    key={request.id}
                    request={request}
                    busy={respondingId === request.id}
                    onAccept={(item) => void handleAccept(item)}
                    onReject={(item) => void handleReject(item)}
                  />
                ))}
              </View>
            )}
            {outgoing.length > 0 ? (
              <Text style={styles.outgoing}>
                {outgoing.length} outgoing pending request
                {outgoing.length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </View>

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
  networkActions: {
    gap: 8,
  },
  pairBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.brandSoft,
  },
  pairBtnText: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  networkHint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 360,
  },
  section: {
    gap: 10,
  },
  requestList: {
    gap: 10,
  },
  empty: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  outgoing: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  list: {
    gap: 4,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
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
