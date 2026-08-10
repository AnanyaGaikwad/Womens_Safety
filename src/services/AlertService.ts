import { GuardianService } from './GuardianService';
import { AlertHistoryService } from './AlertHistoryService';
import { LocationService } from './LocationService';
import { sendEmergencyToNetworkGuardians } from './NetworkEmergencyPushService';
import {
  DeliveryBanner,
  DeliveryStatus,
  EmergencyAlert,
  GuardianDelivery,
} from '../types/alert';
import { DetectionKind } from '../types/detection';
import { EmergencyLocation } from '../types/location';

export type TriggerEmergencyInput = {
  reason: DetectionKind;
  note: string;
  confidence: number;
  evidenceUri?: string | null;
  evidenceRecording?: boolean;
};

type SessionListener = () => void;

type EmergencySession = {
  alert: EmergencyAlert | null;
  recordingEvidence: boolean;
  banners: DeliveryBanner[];
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatLocation(location: EmergencyLocation): string {
  if (!location.available || location.latitude == null || location.longitude == null) {
    return 'Location unavailable';
  }
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

function logSimulatedDelivery(
  name: string,
  phone: string,
  location: EmergencyLocation,
  status: DeliveryStatus
) {
  console.log('----------------------------------------');
  console.log('Sending emergency alert to');
  console.log(name);
  console.log(phone);
  console.log('');
  console.log('Location');
  if (location.available && location.latitude != null && location.longitude != null) {
    console.log(location.latitude);
    console.log(location.longitude);
  } else {
    console.log('unavailable');
    console.log(`permission: ${location.permissionStatus}`);
  }
  console.log('');
  console.log('Status');
  console.log(status === 'delivered' ? 'Delivered (Simulated)' : status);
  console.log('----------------------------------------');
}

/**
 * Emergency pipeline: GPS → local simulated guardians → history,
 * plus best-effort Firebase network guardian Expo push (non-blocking).
 */
class AlertServiceImpl {
  private session: EmergencySession = {
    alert: null,
    recordingEvidence: false,
    banners: [],
  };
  private listeners = new Set<SessionListener>();

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSession(): EmergencySession {
    return this.session;
  }

  getActiveAlert(): EmergencyAlert | null {
    return this.session.alert;
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private setSession(patch: Partial<EmergencySession>) {
    this.session = { ...this.session, ...patch };
    this.notify();
  }

  async triggerEmergency(input: TriggerEmergencyInput): Promise<EmergencyAlert> {
    // 3. fetch location
    const location = await LocationService.getCurrentEmergencyLocation();

    // 4. load enabled guardians
    const guardians = (await GuardianService.getGuardians()).filter(
      (guardian) => guardian.enabled
    );

    const alertId = makeId('alert');
    const timestamp = Date.now();

    // 5. generate emergency alert (initial)
    let alert: EmergencyAlert = {
      id: alertId,
      reason: input.reason,
      note: input.note,
      confidence: input.confidence,
      timestamp,
      location,
      evidenceUri: input.evidenceUri ?? null,
      evidenceRecording: input.evidenceRecording ?? false,
      guardiansNotified: [],
      deliveryStatus: guardians.length === 0 ? 'no_recipients' : 'in_progress',
    };

    this.setSession({
      alert,
      recordingEvidence: Boolean(input.evidenceRecording),
      banners: [],
    });

    // Network fan-out (best-effort, non-blocking): paired Firebase guardians → Expo Push.
    console.log('[UNION PUSH DEBUG] AlertService network push invoked');
    void sendEmergencyToNetworkGuardians(alert);

    const deliveries: GuardianDelivery[] = [];

    // 6. simulate sending alerts (one per enabled guardian)
    for (const guardian of guardians) {
      const delivery: GuardianDelivery = {
        guardianId: guardian.id,
        fullName: guardian.fullName,
        phoneNumber: guardian.phoneNumber,
        status: 'delivered',
        deliveredAt: Date.now(),
      };
      deliveries.push(delivery);

      logSimulatedDelivery(
        guardian.fullName,
        guardian.phoneNumber,
        location,
        delivery.status
      );

      const banner: DeliveryBanner = {
        id: makeId('banner'),
        guardianName: guardian.fullName,
        phoneNumber: guardian.phoneNumber,
        location,
        status: delivery.status,
        createdAt: Date.now(),
      };

      alert = {
        ...alert,
        guardiansNotified: [...deliveries],
        deliveryStatus:
          deliveries.length >= guardians.length ? 'completed' : 'in_progress',
      };

      this.setSession({
        alert,
        banners: [...this.session.banners, banner].slice(-6),
      });

      // Stagger so each delivery is visible as an individual toast.
      await delay(450);
    }

    if (guardians.length === 0) {
      console.log(
        `[AlertService] No enabled guardians to notify. Location: ${formatLocation(location)}`
      );
      alert = { ...alert, deliveryStatus: 'no_recipients', guardiansNotified: [] };
    } else {
      alert = {
        ...alert,
        guardiansNotified: deliveries,
        deliveryStatus: 'completed',
      };
    }

    // 7. save alert history
    await AlertHistoryService.saveAlert(alert);
    this.setSession({ alert });
    return alert;
  }

  async updateActiveEvidence(evidenceUri: string | null, recording: boolean) {
    const current = this.session.alert;
    if (!current) {
      this.setSession({ recordingEvidence: recording });
      return;
    }

    const next: EmergencyAlert = {
      ...current,
      evidenceUri: evidenceUri ?? current.evidenceUri,
      evidenceRecording: recording,
    };
    await AlertHistoryService.saveAlert(next);
    this.setSession({ alert: next, recordingEvidence: recording });
  }

  dismissBanner(id: string) {
    this.setSession({
      banners: this.session.banners.filter((banner) => banner.id !== id),
    });
  }

  clearBanners() {
    this.setSession({ banners: [] });
  }

  /** Leave the emergency UI; monitoring resume is handled by the sound-guard hook. */
  dismissActiveAlert() {
    this.setSession({ alert: null, recordingEvidence: false, banners: [] });
  }
}

export const AlertService = new AlertServiceImpl();

export async function triggerEmergency(
  input: TriggerEmergencyInput
): Promise<EmergencyAlert> {
  return AlertService.triggerEmergency(input);
}
