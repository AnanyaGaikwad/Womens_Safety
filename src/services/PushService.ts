import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isFirebaseReady } from './firebase';
import { saveExpoPushToken } from './UserService';

export type NotificationStatusLabel =
  | 'Configured'
  | 'Permission denied'
  | 'Not configured';

export type PushRegistrationResult = {
  status: NotificationStatusLabel;
  token: string | null;
  error: string | null;
};

let lastPushResult: PushRegistrationResult | null = null;
let pushPromise: Promise<PushRegistrationResult> | null = null;
let handlerConfigured = false;

function configureNotificationHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Soft-fail — foreground presentation is optional for token registration.
  }
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

function unavailable(message?: string): PushRegistrationResult {
  const result: PushRegistrationResult = {
    status: 'Not configured',
    token: null,
    error: message ?? null,
  };
  lastPushResult = result;
  return result;
}

/**
 * Request notification permission, obtain an Expo push token, and
 * save it to users/{uid}.expoPushToken. Soft-fails when push is unavailable
 * (web, missing project credentials, Expo Go limitations, Firebase down).
 * Does not send notifications.
 */
export async function ensurePushTokenRegistration(
  uid: string
): Promise<PushRegistrationResult> {
  if (pushPromise) return pushPromise;

  pushPromise = (async (): Promise<PushRegistrationResult> => {
    configureNotificationHandler();

    if (!uid) {
      return unavailable('Missing Union user id.');
    }

    if (Platform.OS === 'web') {
      return unavailable('Push tokens are not registered on web.');
    }

    if (!Device.isDevice) {
      return unavailable('Push tokens require a physical device.');
    }

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('union-alerts', {
          name: 'Union alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2F9B86',
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let finalStatus = existing.status;
      if (finalStatus !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      if (finalStatus !== 'granted') {
        const denied: PushRegistrationResult = {
          status: 'Permission denied',
          token: null,
          error: null,
        };
        lastPushResult = denied;
        return denied;
      }

      const projectId = resolveProjectId();
      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      const token = tokenResponse.data?.trim() || null;
      if (!token) {
        return unavailable('Expo push token was empty.');
      }

      if (!isFirebaseReady()) {
        // Keep local token status honest — cloud save can wait.
        const localOnly: PushRegistrationResult = {
          status: 'Configured',
          token,
          error: 'Token obtained, but Firebase was unavailable to save it.',
        };
        lastPushResult = localOnly;
        return localOnly;
      }

      const saved = await saveExpoPushToken(uid, token);
      if (!saved) {
        const partial: PushRegistrationResult = {
          status: 'Configured',
          token,
          error: 'Token obtained, but saving to Firestore failed.',
        };
        lastPushResult = partial;
        return partial;
      }

      const configured: PushRegistrationResult = {
        status: 'Configured',
        token,
        error: null,
      };
      lastPushResult = configured;
      return configured;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Push registration failed.';
      console.warn(
        '[Union PushService] Push registration unavailable — continuing without push.',
        message
      );
      return unavailable(message);
    } finally {
      pushPromise = null;
    }
  })();

  return pushPromise;
}

export function getLastPushRegistrationResult(): PushRegistrationResult | null {
  return lastPushResult;
}

export function resetPushRegistrationStateForTests() {
  pushPromise = null;
  lastPushResult = null;
}
