import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

type NavRef = NavigationContainerRefWithCurrent<RootStackParamList>;

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

function asCoord(value: unknown): string | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return String(n);
}

function parseGuardianAlertData(
  data: Record<string, unknown> | undefined | null
): RootStackParamList['GuardianAlert'] | null {
  if (!data || data.type !== 'guardian_alert') return null;

  return {
    alertId: asString(data.alertId),
    ownerUid: asString(data.ownerUid),
    ownerDisplayName: asString(data.ownerDisplayName, 'Union User'),
    reason: asString(data.reason, 'emergency'),
    timestamp: asString(data.timestamp, String(Date.now())),
    latitude: asCoord(data.latitude),
    longitude: asCoord(data.longitude),
    note: asString(data.note),
  };
}

function navigateToGuardianAlert(
  navigationRef: NavRef,
  params: RootStackParamList['GuardianAlert']
) {
  const go = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.navigate('GuardianAlert', params);
    return true;
  };

  if (go()) return;

  // Cold start: wait briefly for the navigation tree to mount.
  const started = Date.now();
  const timer = setInterval(() => {
    if (go() || Date.now() - started > 8000) {
      clearInterval(timer);
    }
  }, 100);
}

/**
 * Routes guardian_alert notification taps to GuardianAlertScreen.
 * Ignores unrelated notification responses.
 */
export function useGuardianAlertNotificationNavigation(navigationRef: NavRef) {
  const handledResponseIds = useRef(new Set<string>());

  useEffect(() => {
    const handleResponse = (
      response: Notifications.NotificationResponse | null | undefined
    ) => {
      if (!response) return;

      const responseId =
        response.notification.request.identifier ||
        `${response.notification.date}`;
      if (handledResponseIds.current.has(responseId)) return;

      const content = response.notification.request.content;
      const rawData = (content.data ?? {}) as Record<string, unknown>;
      const params = parseGuardianAlertData(rawData);
      if (!params) return;

      handledResponseIds.current.add(responseId);
      navigateToGuardianAlert(navigationRef, params);
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync().then(handleResponse);

    return () => {
      subscription.remove();
    };
  }, [navigationRef]);
}
