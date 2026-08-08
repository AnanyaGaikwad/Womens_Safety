import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertService } from '../services/AlertService';
import { EvidenceRecorder } from '../services/evidenceRecorder';
import { SoundMonitor } from '../services/soundMonitor';
import {
  loadEvents,
  loadSettings,
  persistEvents,
  saveSettings,
} from '../services/settingsStorage';
import { EmergencyAlert } from '../types/alert';
import {
  DEFAULT_SETTINGS,
  DetectionEvent,
  DetectionKind,
  GuardSettings,
  GuardStatus,
} from '../types/detection';

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useSoundGuard() {
  const [status, setStatus] = useState<GuardStatus>('idle');
  const [armed, setArmed] = useState(false);
  const [level, setLevel] = useState(0);
  const [db, setDb] = useState(-160);
  const [settings, setSettings] = useState<GuardSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recordingEvidence, setRecordingEvidence] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<DetectionEvent | null>(null);
  const [activeAlert, setActiveAlert] = useState<EmergencyAlert | null>(null);
  const [ready, setReady] = useState(false);

  const monitorRef = useRef<SoundMonitor | null>(null);
  const evidenceRef = useRef(new EvidenceRecorder());
  const settingsRef = useRef(settings);
  const handlingRef = useRef(false);
  const armedRef = useRef(false);
  const handleDetectionRef = useRef<
    ((kind: DetectionKind, confidence: number, note: string) => Promise<void>) | null
  >(null);

  useEffect(() => {
    settingsRef.current = settings;
    monitorRef.current?.updateSettings(settings);
  }, [settings]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [savedSettings, savedEvents] = await Promise.all([
        loadSettings(),
        loadEvents(),
      ]);
      if (!mounted) return;
      setSettings(savedSettings);
      setEvents(savedEvents as DetectionEvent[]);
      setReady(true);
    })();
    return () => {
      mounted = false;
      void monitorRef.current?.stop();
      void evidenceRef.current.stop();
    };
  }, []);

  const attachMonitorListeners = useCallback((monitor: SoundMonitor) => {
    monitor.setListeners({
      onLevel: (normalized, measuredDb) => {
        setLevel(normalized);
        setDb(measuredDb);
      },
      onDetection: (kind, confidence, note) => {
        void handleDetectionRef.current?.(kind, confidence, note);
      },
      onError: (message) => setError(message),
    });
  }, []);

  const resumeMonitoring = useCallback(async () => {
    if (!armedRef.current) {
      setStatus((current) => (current === 'triggered' ? 'idle' : current));
      return;
    }
    try {
      const monitor = new SoundMonitor(settingsRef.current);
      attachMonitorListeners(monitor);
      await monitor.start();
      monitorRef.current = monitor;
      setStatus('listening');
    } catch (err) {
      setStatus('error');
      setArmed(false);
      armedRef.current = false;
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to resume listening after emergency pipeline.'
      );
    }
  }, [attachMonitorListeners]);

  const handleDetection = useCallback(
    async (kind: DetectionKind, confidence: number, note: string) => {
      if (handlingRef.current) return;
      handlingRef.current = true;
      setStatus('triggered');

      const shouldResume = armedRef.current;

      // 1. stop listening
      if (monitorRef.current) {
        await monitorRef.current.stop();
        monitorRef.current = null;
      }

      // 2. record evidence
      let evidenceUri: string | null = null;
      try {
        setRecordingEvidence(true);
        evidenceUri = await evidenceRef.current.start();
      } catch {
        evidenceUri = null;
      }

      const event: DetectionEvent = {
        id: makeId(),
        kind,
        confidence,
        timestamp: Date.now(),
        note,
        evidenceUri,
      };

      setLastTrigger(event);
      setEvents((prev) => {
        const next = [event, ...prev].slice(0, 40);
        void persistEvents(next);
        return next;
      });

      // 3–7. GPS → guardians → simulate delivery → save history (AlertService)
      let alert: EmergencyAlert | null = null;
      try {
        alert = await AlertService.triggerEmergency({
          reason: kind,
          note,
          confidence,
          evidenceUri,
          evidenceRecording: true,
        });
        setActiveAlert(alert);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Emergency alert pipeline failed.'
        );
      }

      // Evidence capture window, then finalize + resume (steps 8–9 continue via UI/nav)
      setTimeout(async () => {
        const finalUri = await evidenceRef.current.stop();
        if (finalUri) {
          setEvents((prev) => {
            const next = prev.map((item) =>
              item.id === event.id ? { ...item, evidenceUri: finalUri } : item
            );
            void persistEvents(next);
            return next;
          });
          setLastTrigger((prev) =>
            prev?.id === event.id ? { ...prev, evidenceUri: finalUri } : prev
          );
        }
        setRecordingEvidence(false);
        await AlertService.updateActiveEvidence(finalUri, false);

        if (shouldResume && armedRef.current) {
          await resumeMonitoring();
        } else {
          setStatus((current) => (current === 'triggered' ? 'idle' : current));
        }

        handlingRef.current = false;
      }, 12000);
    },
    [resumeMonitoring]
  );

  useEffect(() => {
    handleDetectionRef.current = handleDetection;
  }, [handleDetection]);

  const start = useCallback(async () => {
    setError(null);
    setStatus('requesting_permission');

    const monitor = new SoundMonitor(settingsRef.current);
    attachMonitorListeners(monitor);

    try {
      await monitor.start();
      monitorRef.current = monitor;
      armedRef.current = true;
      setArmed(true);
      setStatus('listening');
    } catch (err) {
      armedRef.current = false;
      setArmed(false);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start listening.');
      monitorRef.current = null;
    }
  }, [attachMonitorListeners]);

  const stop = useCallback(async () => {
    armedRef.current = false;
    setArmed(false);
    await monitorRef.current?.stop();
    monitorRef.current = null;
    await evidenceRef.current.stop();
    setRecordingEvidence(false);
    handlingRef.current = false;
    setLevel(0);
    setDb(-160);
    setStatus('idle');
  }, []);

  const updateSafeWord = useCallback(async (safeWord: string) => {
    const next = {
      ...settingsRef.current,
      safeWord: safeWord.trim() || DEFAULT_SETTINGS.safeWord,
    };
    settingsRef.current = next;
    setSettings(next);
    await saveSettings(next);
    monitorRef.current?.updateSettings(next);
  }, []);

  const clearEvents = useCallback(async () => {
    setEvents([]);
    setLastTrigger(null);
    await persistEvents([]);
  }, []);

  const dismissTrigger = useCallback(() => {
    setLastTrigger(null);
    setStatus((current) => {
      if (current !== 'triggered') return current;
      return armedRef.current ? 'listening' : 'idle';
    });
  }, []);

  const dismissActiveAlert = useCallback(() => {
    AlertService.dismissActiveAlert();
    setActiveAlert(null);
    setLastTrigger(null);
    setStatus((current) => {
      if (current !== 'triggered') return current;
      return armedRef.current ? 'listening' : 'idle';
    });
  }, []);

  const returnToMonitoring = useCallback(async () => {
    AlertService.dismissActiveAlert();
    setActiveAlert(null);
    setLastTrigger(null);
    if (!armedRef.current) {
      armedRef.current = true;
      setArmed(true);
    }
    // Evidence capture still owns the mic — automatic resume runs when it finishes.
    if (evidenceRef.current.isRecording || handlingRef.current) {
      setStatus('triggered');
      return;
    }
    if (!monitorRef.current) {
      await resumeMonitoring();
    } else {
      setStatus('listening');
    }
  }, [resumeMonitoring]);

  const simulate = useCallback(
    (kind: DetectionKind) => {
      if (!monitorRef.current) {
        void handleDetection(
          kind,
          0.9,
          kind === 'safeword'
            ? `Simulated safe-word “${settingsRef.current.safeWord}” spoken.`
            : `Simulated ${kind} detection.`
        );
        return;
      }
      monitorRef.current.simulate(kind);
    },
    [handleDetection]
  );

  return {
    ready,
    status,
    armed,
    level,
    db,
    settings,
    events,
    error,
    recordingEvidence,
    lastTrigger,
    activeAlert,
    start,
    stop,
    updateSafeWord,
    clearEvents,
    dismissTrigger,
    dismissActiveAlert,
    returnToMonitoring,
    simulate,
  };
}
