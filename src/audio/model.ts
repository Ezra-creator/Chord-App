import { NativeModules } from 'react-native';
import { Asset } from 'expo-asset';
import type {
  InferenceSession,
  Tensor as TensorType,
} from 'onnxruntime-react-native';
import type { AudioBufferWindow } from './types';
import { PIANO } from '../theme/tokens';

export const MODEL_INPUT_LENGTH = 43844 as const;
export const MODEL_SAMPLE_RATE = 22050 as const;
export const CONFIDENCE_THRESHOLD = 0.45 as const;

export interface DetectedNote {
  midi: number;
  name: string;
  confidence: number;
}

export interface NoteDetectionResult {
  /**
   * Per-pitch activation scores for the 88 piano keys (index 0 = A0 / MIDI 21, index 87 = C8 / MIDI 108).
   */
  scores: Float32Array;

  /**
   * Notes with confidence above the threshold, sorted by confidence descending.
   */
  detectedNotes: DetectedNote[];

  /**
   * Processing timestamp in ms.
   */
  timestamp: number;
}

const PITCH_CLASSES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export function midiToNoteName(midi: number): string {
  const pitchClass = PITCH_CLASSES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pitchClass}${octave}`;
}

/**
 * Resamples and shapes an incoming audio buffer to match the Basic Pitch input:
 * 43,844 samples at 22,050 Hz (mono, normalized float32).
 */
export function prepareModelInput(
  samples: Float32Array,
  inputSampleRate: number
): Float32Array {
  const target = new Float32Array(MODEL_INPUT_LENGTH);
  const step = inputSampleRate / MODEL_SAMPLE_RATE;
  const availableResampledCount = Math.min(
    MODEL_INPUT_LENGTH,
    Math.floor(samples.length / step)
  );

  // Align latest audio samples to the end of the input window
  const offset = MODEL_INPUT_LENGTH - availableResampledCount;

  for (let i = 0; i < availableResampledCount; i++) {
    const srcIdx = Math.floor(i * step);
    target[offset + i] = samples[srcIdx];
  }

  return target;
}

let onnxModule: typeof import('onnxruntime-react-native') | null = null;

function getOnnxModule(): typeof import('onnxruntime-react-native') | null {
  if (onnxModule) return onnxModule;
  if (!NativeModules.Onnxruntime) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    onnxModule = require('onnxruntime-react-native');
    return onnxModule;
  } catch (err) {
    console.warn(
      '[NoteDetectionModel] Failed to load onnxruntime-react-native:',
      err
    );
    return null;
  }
}

class NoteDetectionModelService {
  private session: InferenceSession | null = null;
  private isInitializing: boolean = false;
  private isInferring: boolean = false;
  private modelInputName: string = 'serving_default_input_2:0';

  /**
   * Loads the Basic Pitch ONNX model once from local assets.
   */
  public async loadModel(): Promise<void> {
    if (this.session) return;
    if (this.isInitializing) return;

    this.isInitializing = true;

    try {
      const onnx = getOnnxModule();
      if (!onnx) {
        console.log(
          '[NoteDetectionModel] Native ONNX module not available in current environment (using fallback pitch processor).'
        );
        return;
      }

      // Resolve the bundled local model asset
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const modelAsset = Asset.fromModule(require('../../assets/models/basic-pitch.onnx'));
      await modelAsset.downloadAsync();
      const modelPath = modelAsset.localUri || modelAsset.uri;

      if (!modelPath) {
        const errorMsg =
          '[NoteDetectionModel] Model asset not found at assets/models/basic-pitch.onnx';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      this.session = await onnx.InferenceSession.create(modelPath);

      if (this.session.inputNames && this.session.inputNames.length > 0) {
        this.modelInputName = this.session.inputNames[0];
      }

      const inputCount = this.session.inputNames.length;
      const outputCount = this.session.outputNames.length;

      console.log(
        `[NoteDetectionModel] ONNX model loaded successfully (${inputCount} inputs, ${outputCount} outputs: [${this.session.inputNames.join(', ')}] -> [${this.session.outputNames.join(', ')}])`
      );
    } catch (err) {
      const errorMsg = `[NoteDetectionModel] Failed to load ONNX model at assets/models/basic-pitch.onnx: ${err instanceof Error ? err.message : String(err)}`;
      console.error(errorMsg, err);
      throw new Error(errorMsg);
    } finally {
      this.isInitializing = false;
    }
  }

  public isLoaded(): boolean {
    return this.session !== null;
  }

  private lastResult: NoteDetectionResult = {
    scores: new Float32Array(PIANO.totalKeys),
    detectedNotes: [],
    timestamp: 0,
  };

  /**
   * Takes one audio buffer and returns per-pitch activation scores for the 88 piano keys.
   * Runs non-blockingly and skips frames if previous inference is still in-flight to prevent lag buildup.
   */
  public async predictNotes(
    buffer: AudioBufferWindow
  ): Promise<NoteDetectionResult> {
    // If inference is currently busy, return last result to prevent lag buildup
    if (this.isInferring) {
      return this.lastResult;
    }

    this.isInferring = true;

    try {
      // Ensure model is initialized
      if (!this.session && !this.isInitializing) {
        await this.loadModel();
      }

      // Yield event loop so UI / JS thread is never blocked
      await new Promise((resolve) => setTimeout(resolve, 0));

      const inputData = prepareModelInput(buffer.samples, buffer.sampleRate);
      const scores = new Float32Array(PIANO.totalKeys);

      const onnx = getOnnxModule();
      if (this.session && onnx) {
        // Run ONNX inference off-thread via onnxruntime-react-native (runs in native C++ worker thread)
        // Model input shape is [1, 43844, 1] (batch, time, channel)
        const tensor = new onnx.Tensor('float32', inputData, [
          1,
          MODEL_INPUT_LENGTH,
          1,
        ]);
        const feeds: Record<string, TensorType> = { [this.modelInputName]: tensor };
        const results = await this.session.run(feeds);

        // Find the note output tensor (shape [1, 172, 88])
        let noteTensor: any = null;
        for (const outputTensor of Object.values(results)) {
          if (
            outputTensor.dims &&
            outputTensor.dims.length === 3 &&
            outputTensor.dims[2] === PIANO.totalKeys
          ) {
            noteTensor = outputTensor;
            break;
          }
        }

        if (noteTensor && noteTensor.data) {
          const numFrames = noteTensor.dims[1]; // 172
          const numKeys = noteTensor.dims[2]; // 88
          const data = noteTensor.data as Float32Array;

          // Aggregate over the most recent time frames (last 20 frames ≈ 230ms)
          const startFrame = Math.max(0, numFrames - 20);

          for (let keyIdx = 0; keyIdx < numKeys; keyIdx++) {
            let maxActivation = 0;
            for (let f = startFrame; f < numFrames; f++) {
              const val = data[f * numKeys + keyIdx];
              if (val > maxActivation) {
                maxActivation = val;
              }
            }
            scores[keyIdx] = Math.max(0, Math.min(1, maxActivation));
          }
        }
      } else {
        // Fallback pitch estimation for environments without native ONNX binary
        this.runFallbackPitchEstimation(inputData, scores);
      }

      // Collect detected notes above confidence threshold
      const detectedNotes: DetectedNote[] = [];
      for (let i = 0; i < scores.length; i++) {
        const confidence = scores[i];
        if (confidence >= CONFIDENCE_THRESHOLD) {
          const midi = PIANO.minMidi + i;
          detectedNotes.push({
            midi,
            name: midiToNoteName(midi),
            confidence,
          });
        }
      }

      detectedNotes.sort((a, b) => b.confidence - a.confidence);

      if (detectedNotes.length > 0) {
        console.log(
          `[NoteDetectionModel] Detected notes: ${detectedNotes.map((n) => `${n.name} (MIDI ${n.midi}, conf: ${(n.confidence * 100).toFixed(1)}%)`).join(', ')}`
        );
      }

      this.lastResult = {
        scores,
        detectedNotes,
        timestamp: buffer.timestamp,
      };

      return this.lastResult;
    } finally {
      this.isInferring = false;
    }
  }

  /**
   * Lightweight spectral harmonic fallback estimation for testing environments.
   */
  private runFallbackPitchEstimation(
    samples: Float32Array,
    scores: Float32Array
  ): void {
    // Check signal energy
    let energy = 0;
    for (let i = 0; i < samples.length; i += 8) {
      energy += samples[i] * samples[i];
    }
    const rms = Math.sqrt((energy * 8) / samples.length);

    // If signal has energy, detect dominant auto-correlation pitch
    if (rms > 0.04) {
      let maxCorr = 0;
      let bestLag = 0;
      const minLag = Math.floor(MODEL_SAMPLE_RATE / 4186); // C8
      const maxLag = Math.floor(MODEL_SAMPLE_RATE / 27.5); // A0

      for (let lag = minLag; lag < Math.min(maxLag, 400); lag += 2) {
        let corr = 0;
        for (let i = 0; i < 500; i += 4) {
          corr += samples[i] * samples[i + lag];
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }

      if (bestLag > 0) {
        const freq = MODEL_SAMPLE_RATE / bestLag;
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        if (midi >= PIANO.minMidi && midi <= PIANO.maxMidi) {
          scores[midi - PIANO.minMidi] = Math.min(0.95, rms * 5);
        }
      }
    }
  }
}

export const noteDetectionModel = new NoteDetectionModelService();
