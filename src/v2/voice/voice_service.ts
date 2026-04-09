/**
 * VoiceService — STT via @react-native-voice/voice, TTS via expo-speech.
 * Privacy: no audio is ever sent to the backend. All processing is on-device.
 */
import { EventEmitter } from 'events';
import * as Speech from 'expo-speech';

// Lazy-load Voice to avoid crash when module not installed in dev
let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (_) {
  console.warn('[VoiceService] @react-native-voice/voice not available');
}

export interface SpeakOptions {
  /** coaching_tone from agent_profile */
  tone?: string;
  /** personality.speechRate — takes precedence over tone-based defaults */
  speechRate?: number;
  /** personality.speechPitch — takes precedence over tone-based defaults */
  speechPitch?: number;
  language?: string;
}

const TONE_SPEECH_RATES: Record<string, number> = {
  supportive: 0.90,
  structured: 1.00,
  direct: 1.05,
  reflective: 0.85,
};

const TONE_PITCHES: Record<string, number> = {
  supportive: 1.05,
  structured: 1.00,
  direct: 0.95,
  reflective: 1.00,
};

export class VoiceService extends EventEmitter {
  private isListening = false;
  private partialResults: string[] = [];
  private resolveTranscription?: (text: string) => void;

  constructor() {
    super();
    if (Voice) {
      Voice.onSpeechResults = this.onResults.bind(this);
      Voice.onSpeechPartialResults = this.onPartial.bind(this);
      Voice.onSpeechError = this.onError.bind(this);
      Voice.onSpeechEnd = this.onEnd.bind(this);
    }
  }

  /** Start listening. Emits 'partial' events as speech comes in. */
  async startListening(): Promise<void> {
    if (!Voice) throw new Error('Voice module not available');
    if (this.isListening) return;
    this.partialResults = [];
    this.isListening = true;
    await Voice.start('en-US');
  }

  /** Stop and return final transcription. */
  stopListening(): Promise<string> {
    return new Promise(async (resolve) => {
      this.resolveTranscription = resolve;
      if (Voice && this.isListening) {
        await Voice.stop();
      } else {
        resolve('');
      }
    });
  }

  /** Speak text aloud, adapting rate/pitch to coaching tone. Returns after speech completes. */
  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const tone = options.tone ?? 'supportive';
    // Personality values take precedence over tone-based defaults
    const rate = options.speechRate ?? TONE_SPEECH_RATES[tone] ?? 1.0;
    const pitch = options.speechPitch ?? TONE_PITCHES[tone] ?? 1.0;
    return new Promise((resolve) => {
      Speech.speak(text, {
        language: options.language ?? 'en-US',
        rate,
        pitch,
        onDone: () => resolve(),
        onError: () => resolve(),
      });
    });
  }

  /** Stop any in-progress TTS. */
  stopSpeaking(): void {
    Speech.stop();
  }

  private onResults(e: any) {
    const text: string = (e?.value?.[0] ?? '').trim();
    this.isListening = false;
    if (this.resolveTranscription) {
      this.resolveTranscription(text);
      this.resolveTranscription = undefined;
    }
    this.emit('result', text);
  }

  private onPartial(e: any) {
    const partial: string = e?.value?.[0] ?? '';
    this.emit('partial', partial);
  }

  private onError(e: any) {
    console.warn('[VoiceService] error', e);
    this.isListening = false;
    if (this.resolveTranscription) {
      this.resolveTranscription('');
      this.resolveTranscription = undefined;
    }
    this.emit('error', e);
  }

  private onEnd() {
    this.isListening = false;
  }

  destroy() {
    if (Voice) Voice.destroy();
  }
}

export const voiceService = new VoiceService();
