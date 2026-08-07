# Union — Sound Detection MVP

On-device passive audio detection for women’s safety. This MVP ships **only** the sound detection feature from [Union: Decentralized Guardian Network & Smart Recorders](https://devpost.com).

## What it does

Continuous local listening for:

- **Screams** — sudden high-intensity vocal bursts
- **Physical distress** — repeated irregular loud spikes
- **Custom verbal safe-word** — on-device speech match (web Speech API)

When a pattern is detected, Union **silently starts a local evidence recorder** and logs the event. Mesh alarms and encrypted live location are intentionally deferred.

## Stack

- Expo SDK 54 / React Native (compatible with current App Store Expo Go)
- `expo-av` metering on native
- Web Audio `AnalyserNode` on web
- Web Speech API for safe-word recognition (web)
- AsyncStorage for settings + detection history

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
  components/     # orb, meter, safe-word field, alerts, log
  hooks/          # useSoundGuard
  services/       # monitor, analyzer, evidence recorder, storage
  theme/
  types/
```

## Privacy notes

Audio analysis is designed to stay on-device. Evidence clips are stored locally on the device/browser session. No cloud audio upload is included in this MVP.
