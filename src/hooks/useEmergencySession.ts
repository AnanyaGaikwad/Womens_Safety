import { useEffect, useState } from 'react';
import { AlertService } from '../services/AlertService';
import { DeliveryBanner, EmergencyAlert } from '../types/alert';

export function useEmergencySession() {
  const [alert, setAlert] = useState<EmergencyAlert | null>(
    AlertService.getActiveAlert()
  );
  const [recordingEvidence, setRecordingEvidence] = useState(
    AlertService.getSession().recordingEvidence
  );
  const [banners, setBanners] = useState<DeliveryBanner[]>(
    AlertService.getSession().banners
  );

  useEffect(() => {
    return AlertService.subscribe(() => {
      const session = AlertService.getSession();
      setAlert(session.alert);
      setRecordingEvidence(session.recordingEvidence);
      setBanners(session.banners);
    });
  }, []);

  return {
    activeAlert: alert,
    recordingEvidence,
    banners,
    dismissBanner: (id: string) => AlertService.dismissBanner(id),
    dismissActiveAlert: () => AlertService.dismissActiveAlert(),
    clearBanners: () => AlertService.clearBanners(),
  };
}
