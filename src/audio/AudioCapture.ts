import {
  AudioModule,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
} from 'expo-audio';
import {
  AUDIO_SAMPLE_RATE,
  AUDIO_CHANNELS,
  AUDIO_ENCODING,
  WINDOW_DURATION_SEC,
  WINDOW_SIZE_SAMPLES,
  HOP_SIZE_SAMPLES,
} from './constants';
import type {
  AudioBufferWindow,
  AudioBufferListener,
  AudioStatusListener,
} from './types';

/**
 * Fixed-size circular buffer for maintaining a rolling audio window.
 * Avoids repeated allocations and prevents memory leaks.
 */
class RollingAudioBuffer {
  private readonly buffer: Float32Array;
  private readonly capacity: number;
  private writeIndex: number = 0;
  private totalSamplesWritten: number = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float32Array(capacity);
  }

  public push(samples: Float32Array): void {
    const len = samples.length;
    for (let i = 0; i < len; i++) {
      this.buffer[this.writeIndex] = samples[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
    }
    this.totalSamplesWritten += len;
  }

  /**
   * Returns a copy of the most recent `capacity` samples in chronological order.
   */
  public getChronologicalWindow(): Float32Array {
    const out = new Float32Array(this.capacity);
    if (this.totalSamplesWritten < this.capacity) {
      // Buffer not yet filled: align samples at the end of the window
      const count = this.writeIndex;
      out.set(this.buffer.subarray(0, count), this.capacity - count);
    } else {
      // Buffer is full: oldest is at writeIndex to capacity, newest is 0 to writeIndex
      const tailLength = this.capacity - this.writeIndex;
      out.set(this.buffer.subarray(this.writeIndex, this.capacity), 0);
      out.set(this.buffer.subarray(0, this.writeIndex), tailLength);
    }
    return out;
  }

  public reset(): void {
    this.buffer.fill(0);
    this.writeIndex = 0;
    this.totalSamplesWritten = 0;
  }
}

/**
 * Native Audio Capture service.
 * Manages continuous microphone streaming and delivers fixed-size rolling buffers
 * at the configured hop interval.
 */
class AudioCaptureService {
  private stream: any = null;
  private bufferSubscription: any = null;
  private statusSubscription: any = null;
  private rollingBuffer: RollingAudioBuffer = new RollingAudioBuffer(
    WINDOW_SIZE_SAMPLES
  );
  private samplesSinceLastHop: number = 0;
  private streaming: boolean = false;
  private bufferListeners: Set<AudioBufferListener> = new Set();
  private statusListeners: Set<AudioStatusListener> = new Set();
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Checks current microphone permission status without prompting.
   */
  public async getPermissionStatus(): Promise<boolean> {
    try {
      const response = await getRecordingPermissionsAsync();
      return response.granted;
    } catch (err) {
      console.warn('Failed to check recording permission:', err);
      return false;
    }
  }

  /**
   * Prompts user for microphone permission.
   */
  public async requestPermission(): Promise<boolean> {
    try {
      const response = await requestRecordingPermissionsAsync();
      return response.granted;
    } catch (err) {
      console.warn('Failed to request recording permission:', err);
      return false;
    }
  }

  /**
   * Subscribe to rolling audio window buffer updates.
   * Delivers a fixed-size buffer (WINDOW_SIZE_SAMPLES) at the hop interval.
   */
  public subscribe(listener: AudioBufferListener): () => void {
    this.bufferListeners.add(listener);
    return () => {
      this.bufferListeners.delete(listener);
    };
  }

  /**
   * Subscribe to streaming status changes (started/stopped).
   */
  public onStatusChange(listener: AudioStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.streaming);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public isStreaming(): boolean {
    return this.streaming;
  }

  /**
   * Starts continuous microphone capture.
   */
  public async start(): Promise<void> {
    if (this.streaming) {
      return;
    }

    const granted = await this.getPermissionStatus();
    if (!granted) {
      const requested = await this.requestPermission();
      if (!requested) {
        throw new Error('Microphone permission was not granted.');
      }
    }

    this.rollingBuffer.reset();
    this.samplesSinceLastHop = 0;

    try {
      const nativeModule = AudioModule as Record<string, any>;
      const NativeAudioStream = nativeModule?.AudioStream;

      if (NativeAudioStream) {
        this.stream = new NativeAudioStream({
          sampleRate: AUDIO_SAMPLE_RATE,
          channels: AUDIO_CHANNELS,
          encoding: AUDIO_ENCODING,
        });

        this.bufferSubscription = this.stream.addListener(
          'audioStreamBuffer',
          (rawBuffer: { data: ArrayBuffer; sampleRate: number }) => {
            this.handleIncomingRawBuffer(rawBuffer);
          }
        );

        this.statusSubscription = this.stream.addListener(
          'audioStreamStatus',
          (status: { isStreaming: boolean }) => {
            this.setStreamingStatus(status.isStreaming);
          }
        );

        await this.stream.start();
        this.setStreamingStatus(true);
      } else {
        // Fallback for environments where native AudioStream is unavailable (e.g. simulated environment)
        console.warn(
          'Native AudioStream not found in current environment; starting simulated fallback stream.'
        );
        this.startFallbackStream();
      }
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  /**
   * Stops microphone capture and releases native resources.
   */
  public stop(): void {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.bufferSubscription) {
      this.bufferSubscription.remove();
      this.bufferSubscription = null;
    }

    if (this.statusSubscription) {
      this.statusSubscription.remove();
      this.statusSubscription = null;
    }

    if (this.stream) {
      try {
        this.stream.stop();
      } catch (err) {
        console.warn('Error stopping AudioStream:', err);
      }
      this.stream = null;
    }

    this.rollingBuffer.reset();
    this.samplesSinceLastHop = 0;
    this.setStreamingStatus(false);
  }

  private handleIncomingRawBuffer(rawBuffer: {
    data: ArrayBuffer;
    sampleRate?: number;
  }): void {
    if (!rawBuffer?.data) return;

    let floatSamples: Float32Array;
    if (AUDIO_ENCODING === 'float32') {
      floatSamples = new Float32Array(rawBuffer.data);
    } else {
      const int16Samples = new Int16Array(rawBuffer.data);
      floatSamples = new Float32Array(int16Samples.length);
      for (let i = 0; i < int16Samples.length; i++) {
        floatSamples[i] = int16Samples[i] / 32768.0;
      }
    }

    // Accumulate incoming samples into the fixed circular buffer
    this.rollingBuffer.push(floatSamples);
    this.samplesSinceLastHop += floatSamples.length;

    // Only dispatch across the bridge when a full hop interval has elapsed
    if (this.samplesSinceLastHop >= HOP_SIZE_SAMPLES) {
      this.samplesSinceLastHop = 0;
      this.dispatchWindow(rawBuffer.sampleRate ?? AUDIO_SAMPLE_RATE);
    }
  }

  private dispatchWindow(sampleRate: number): void {
    const windowSamples = this.rollingBuffer.getChronologicalWindow();
    const bufferWindow: AudioBufferWindow = {
      samples: windowSamples,
      sampleRate,
      durationSec: WINDOW_DURATION_SEC,
      timestamp: Date.now(),
    };

    for (const listener of this.bufferListeners) {
      try {
        listener(bufferWindow);
      } catch (err) {
        console.error('Error in AudioBufferListener:', err);
      }
    }
  }

  private startFallbackStream(): void {
    this.setStreamingStatus(true);
    const hopIntervalMs = Math.round((HOP_SIZE_SAMPLES / AUDIO_SAMPLE_RATE) * 1000);

    this.fallbackTimer = setInterval(() => {
      // Simulate synthetic audio frame
      const dummySamples = new Float32Array(HOP_SIZE_SAMPLES);
      this.handleIncomingRawBuffer({
        data: dummySamples.buffer,
        sampleRate: AUDIO_SAMPLE_RATE,
      });
    }, hopIntervalMs);
  }

  private setStreamingStatus(status: boolean): void {
    if (this.streaming !== status) {
      this.streaming = status;
      for (const listener of this.statusListeners) {
        try {
          listener(status);
        } catch (err) {
          console.error('Error in AudioStatusListener:', err);
        }
      }
    }
  }
}

export const audioCapture = new AudioCaptureService();
