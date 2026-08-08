import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useProfile } from '../hooks/useProfile';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

/**
 * Sprint 4 — Profile.
 * Display name is editable; Union ID / statuses are read-only.
 * Milestone 5 links to My QR Code (UID-only).
 */
export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    ready,
    loading,
    saving,
    user,
    unionId,
    registrationStatus,
    notificationStatus,
    expoPushToken,
    error,
    refresh,
    saveDisplayName,
  } = useProfile();

  const [draftName, setDraftName] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(user?.displayName ?? '');
  }, [user?.displayName]);

  const dirty =
    draftName.trim() !== (user?.displayName ?? '').trim() &&
    draftName.trim().length > 0;

  const onSave = async () => {
    setSaveMessage(null);
    setSaveError(null);
    try {
      await saveDisplayName(draftName);
      setSaveMessage('Display name saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  if (!ready || loading) {
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Profile</Text>
            <Text style={styles.subhead}>
              Your Union identity on this device. Only your display name can be
              edited for now.
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              value={draftName}
              onChangeText={(value) => {
                setDraftName(value);
                setSaveMessage(null);
                setSaveError(null);
              }}
              placeholder="Your name"
              placeholderTextColor={colors.inkDim}
              editable={Boolean(unionId) && registrationStatus === 'Registered'}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={60}
              style={styles.input}
            />
            <Pressable
              onPress={() => void onSave()}
              disabled={!dirty || saving || registrationStatus !== 'Registered'}
              style={({ pressed }) => [
                styles.saveBtn,
                (!dirty || saving || registrationStatus !== 'Registered') &&
                  styles.saveBtnDisabled,
                pressed && dirty && styles.pressed,
              ]}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving…' : 'Save display name'}
              </Text>
            </Pressable>
            {saveMessage ? (
              <Text style={styles.success}>{saveMessage}</Text>
            ) : null}
            {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          </View>

          <View style={styles.block}>
            <Text style={styles.label}>Unique Union User ID</Text>
            <Text style={styles.value} selectable>
              {unionId ?? 'Unavailable'}
            </Text>
            <Text style={styles.hint}>
              This ID identifies you on the Union network. It cannot be changed.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('MyQrCode')}
              style={({ pressed }) => [
                styles.qrLink,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.qrLinkText}>My QR Code</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.label}>Notification status</Text>
              <Text style={styles.value}>{notificationStatus}</Text>
              <Text style={styles.hint}>
                {notificationStatus === 'Configured'
                  ? 'Expo push token registered for this device.'
                  : notificationStatus === 'Permission denied'
                    ? 'Enable notifications in system settings to receive guardian alerts.'
                    : 'Push setup is unavailable on this device or build.'}
              </Text>
              {expoPushToken ? (
                <Text style={styles.token} selectable>
                  {expoPushToken}
                </Text>
              ) : null}
            </View>
            <View style={styles.stat}>
              <Text style={styles.label}>Registration status</Text>
              <Text style={styles.value}>{registrationStatus}</Text>
              <Text style={styles.hint}>
                Firebase anonymous account linked to this device.
              </Text>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={() => void refresh()}
            style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
          >
            <Text style={styles.refreshText}>Refresh profile</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
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
    gap: 22,
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
  block: {
    gap: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 18,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  hint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  qrLink: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  qrLinkText: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  token: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  input: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    lineHeight: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.line,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.brandSoft,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: colors.ink,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  row: {
    gap: 18,
  },
  stat: {
    gap: 6,
  },
  refresh: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  refreshText: {
    color: colors.brand,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  success: {
    color: colors.brand,
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
