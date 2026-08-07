import { Platform } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Silently starts a local evidence recorder when a detection fires.
 * Mesh/location broadcasting is intentionally out of scope for this MVP.
 */
export class EvidenceRecorder {
  private recording: Audio.Recording | null = null;
  private webRecorder: MediaRecorder | null = null;
  private webChunks: BlobPart[] = [];
  private webStream: MediaStream | null = null;
  private active = false;

  get isRecording() {
    return this.active;
  }

  async start(): Promise<string | null> {
    if (this.active) return null;
    this.active = true;

    try {
      if (Platform.OS === 'web') {
        return await this.startWeb();
      }
      return await this.startNative();
    } catch {
      this.active = false;
      return null;
    }
  }

  async stop(): Promise<string | null> {
    if (!this.active) return null;

    try {
      if (Platform.OS === 'web') {
        return await this.stopWeb();
      }
      return await this.stopNative();
    } finally {
      this.active = false;
    }
  }

  private async startNative(): Promise<string | null> {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    this.recording = recording;
    return recording.getURI();
  }

  private async stopNative(): Promise<string | null> {
    if (!this.recording) return null;
    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch {
      this.recording = null;
      return null;
    }
  }

  private async startWeb(): Promise<string | null> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return null;
    }

    this.webStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : undefined;
    this.webChunks = [];
    this.webRecorder = new MediaRecorder(
      this.webStream,
      mimeType ? { mimeType } : undefined
    );
    this.webRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.webChunks.push(event.data);
    };
    this.webRecorder.start(1000);
    return 'web-recording://active';
  }

  private stopWeb(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.webRecorder) {
        this.cleanupWebStream();
        resolve(null);
        return;
      }

      this.webRecorder.onstop = () => {
        const blob = new Blob(this.webChunks, {
          type: this.webRecorder?.mimeType || 'audio/webm',
        });
        const uri = URL.createObjectURL(blob);
        this.webChunks = [];
        this.webRecorder = null;
        this.cleanupWebStream();
        resolve(uri);
      };

      try {
        this.webRecorder.stop();
      } catch {
        this.cleanupWebStream();
        resolve(null);
      }
    });
  }

  private cleanupWebStream() {
    this.webStream?.getTracks().forEach((track) => track.stop());
    this.webStream = null;
  }
}
