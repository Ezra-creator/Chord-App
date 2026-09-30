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
 * Normalizes audio samples to float32 range [-1.0, 1.0].
 * If samples are in 16-bit PCM integer range (peak > 1.5), divides by 32768.0.
 */
export function normalizeAudio(samples: Float32Array): Float32Array {
  const len = samples.length;
  let maxAbs = 0;
  for (let i = 0; i < len; i++) {
    const absVal = Math.abs(samples[i]);
    if (absVal > maxAbs) maxAbs = absVal;
  }

  const is16Bit = maxAbs > 1.5;
  const divisor = is16Bit ? 32768.0 : 1.0;
  const normalized = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const val = samples[i] / divisor;
    normalized[i] = Math.max(-1.0, Math.min(1.0, val));
  }

  return normalized;
}

/**
 * Resamples an audio buffer to target sample rate using linear interpolation.
 */
export function resampleAudio(
  samples: Float32Array,
  inputSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return samples;
  }

  const ratio = inputSampleRate / targetSampleRate;
  const outLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcIndex = i * ratio;
    const i0 = Math.floor(srcIndex);
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const frac = srcIndex - i0;
    output[i] = samples[i0] * (1.0 - frac) + samples[i1] * frac;
  }

  return output;
}

/**
 * Normalizes, resamples via linear interpolation, and shapes incoming audio buffer
 * to match the Basic Pitch input: 43,844 samples at 22,050 Hz (mono, float32 [-1, 1]).
 */
export function prepareModelInput(
  samples: Float32Array,
  inputSampleRate: number
): Float32Array {
  // 1. Explicit normalization: convert 16-bit PCM integers to normalized float32 [-1.0, 1.0]
  const normalized = normalizeAudio(samples);

  // 2. Linear interpolation resampling from inputSampleRate (e.g. 44100Hz) to MODEL_SAMPLE_RATE (22050Hz)
  const resampled = resampleAudio(normalized, inputSampleRate, MODEL_SAMPLE_RATE);

  // 3. Shape to exact MODEL_INPUT_LENGTH (43844 samples), aligning latest samples to the end
  const target = new Float32Array(MODEL_INPUT_LENGTH);
  const copyCount = Math.min(MODEL_INPUT_LENGTH, resampled.length);
  const srcStart = resampled.length - copyCount;
  const targetStart = MODEL_INPUT_LENGTH - copyCount;

  target.set(resampled.subarray(srcStart, srcStart + copyCount), targetStart);

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
  private loadAttempted: boolean = false;
  private modelInputName: string = 'serving_default_input_2:0';

  /**
   * Loads the Basic Pitch ONNX model once from local assets.
   */
  public async loadModel(): Promise<void> {
    if (this.session) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    this.loadAttempted = true;

    try {
      const onnx = getOnnxModule();
      if (!onnx) {
        console.log(
          '[NoteDetectionModel] Native ONNX module not available in current environment (using fallback pitch processor).'
        );
        console.log(
          `[MODEL-SPEC] Fallback processor spec: shape=[1, ${MODEL_INPUT_LENGTH}, 1], dtype=float32, expectedSampleRate=${MODEL_SAMPLE_RATE}Hz`
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

      // [MODEL-SPEC] Read expected input shape, type, and sample rate from session metadata
      let modelInputShape: (number | string)[] = [1, MODEL_INPUT_LENGTH, 1];
      let modelInputType = 'float32';
      const rawMeta =
        (this.session as any).inputMetadata ??
        (this.session as any).handler?.inputMetadata;

      if (rawMeta && rawMeta.length > 0) {
        const primaryInput = rawMeta[0];
        if (primaryInput.shape) {
          modelInputShape = primaryInput.shape;
        }
        if (primaryInput.type) {
          modelInputType = primaryInput.type;
        }
      }

      console.log(
        `[MODEL-SPEC] ONNX input spec: name="${this.modelInputName}", shape=[${modelInputShape.join(', ')}], dtype=${modelInputType}, expectedSampleRate=${MODEL_SAMPLE_RATE}Hz`
      );

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
      // Ensure model is initialized once
      if (!this.session && !this.isInitializing && !this.loadAttempted) {
        await this.loadModel().catch(() => {});
      }

      // [2a-BUFFER-STATS] Immediately before audio buffer is converted into model input tensor
      let peakAmp = 0;
      let sumSq = 0;
      const sampleCount = buffer.samples.length;
      for (let i = 0; i < sampleCount; i++) {
        const absVal = Math.abs(buffer.samples[i]);
        if (absVal > peakAmp) peakAmp = absVal;
        sumSq += buffer.samples[i] * buffer.samples[i];
      }
      const rmsAmp = sampleCount > 0 ? Math.sqrt(sumSq / sampleCount) : 0;
      console.log(
        `[2a-BUFFER-STATS] sampleCount=${sampleCount} | sampleRate=${buffer.sampleRate}Hz | peak=${peakAmp.toFixed(6)} | rms=${rmsAmp.toFixed(6)}`
      );

      const inputData = prepareModelInput(buffer.samples, buffer.sampleRate);

      // [2b-TENSOR-CHECK] Immediately after building final input tensor and before inference
      let tensorPeak = 0;
      let tensorSumSq = 0;
      for (let i = 0; i < inputData.length; i++) {
        const absVal = Math.abs(inputData[i]);
        if (absVal > tensorPeak) tensorPeak = absVal;
        tensorSumSq += inputData[i] * inputData[i];
      }
      const tensorRms = Math.sqrt(tensorSumSq / inputData.length);
      console.log(
        `[2b-TENSOR-CHECK] shape=[1, ${MODEL_INPUT_LENGTH}, 1] | dtype=float32 | peak=${tensorPeak.toFixed(6)} | rms=${tensorRms.toFixed(6)}`
      );

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

      // [2-MODEL-RAW] Log raw output before any confidence thresholding
      let nonZeroCount = 0;
      const rawEntries: { midi: number; name: string; confidence: number }[] = [];
      for (let i = 0; i < scores.length; i++) {
        const conf = scores[i];
        if (conf > 0) {
          nonZeroCount++;
          const midi = PIANO.minMidi + i;
          rawEntries.push({ midi, name: midiToNoteName(midi), confidence: conf });
        }
      }
      rawEntries.sort((a, b) => b.confidence - a.confidence);
      const top5 = rawEntries.slice(0, 5);
      const top5Str =
        top5.length > 0
          ? top5
              .map(
                (p) =>
                  `${p.name}(MIDI ${p.midi}): ${(p.confidence * 100).toFixed(1)}%`
              )
              .join(', ')
          : 'none';
      console.log(
        `[2-MODEL-RAW] nonZeroPitches=${nonZeroCount}/88 | top5=[${top5Str}]`
      );

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

      if (__DEV__ && detectedNotes.length > 0) {
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
