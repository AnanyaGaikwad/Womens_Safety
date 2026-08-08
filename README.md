# Union — Sound Detection MVP

On-device passive audio detection for women’s safety. This MVP ships **only** the sound detection feature from [Union: Decentralized Guardian Network & Smart Recorders](https://devpost.com).

## What it does

Continuous local listening for:

- **Screams** — sudden high-intensity vocal bursts
- **Physical distress** — repeated irregular loud spikes
- **Custom verbal safe-word** — on-device speech match (web Speech API)

When a pattern is detected, Union **silently starts a local evidence recorder** and logs the event. Mesh alarms and encrypted live location are intentionally deferred.

### Sprint 2 — Guardians
- Add / edit / remove guardians
- Enable or disable guardians
- Optional local profile photo
- Local AsyncStorage persistence
- `GuardianService.notifyGuardians()` stub for future emergency alerts

### Sprint 3 — Detection → Guardian alert pipeline
- GPS via `expo-location` (continues if permission denied)
- `AlertService.triggerEmergency()` after scream / distress / safe-word
- Simulated per-guardian delivery (console + local banners)
- Emergency Active screen + alert history (local only)
- Tab bar safe-area spacing for iPhone home indicator

## Stack

- Expo SDK 54 / React Native (compatible with current App Store Expo Go)
- React Navigation stack + bottom tabs (Guard · Guardians · Alert screens)
- `expo-av` metering on native
- `expo-location` for emergency GPS
- Web Audio `AnalyserNode` on web
- Web Speech API for safe-word recognition (web)
- AsyncStorage for settings, detection history, guardians, and alerts

## Run

```bash
npm install
npm run web      # browser demo (mic + speech)
npm start        # Expo Go / emulator (SDK 54)
npm run android
npm run ios
```

Use the **Expo Go** app from the App Store / Play Store (SDK 54). Allow microphone access when prompted. Use **Test triggers** if the mic or speech API is unavailable.

## Project layout

```
App.tsx
src/
  components/           # sound guard UI + delivery banners
  components/guardians/ # GuardianCard, form, stats, empty state
  hooks/                # useSoundGuard, useGuardians, emergency session
  navigation/           # stack + bottom tabs
  screens/              # Guard, Guardians, Emergency Alert, Alert History
  services/             # audio + guardians + location + alerts
  theme/
  types/
```

## Privacy notes

Audio analysis is designed to stay on-device. Evidence clips are stored locally on the device/browser session. No cloud audio upload is included in this MVP.
