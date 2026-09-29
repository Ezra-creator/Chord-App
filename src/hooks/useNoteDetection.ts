import { useEffect, useState, useRef, useCallback } from 'react';
import { useAudioStream } from './useAudioStream';
import type { AudioBufferWindow } from '../audio/types';
import {
  noteDetectionModel,
  type DetectedNote,
  type NoteDetectionResult,
} from '../audio/model';
import { PIANO } from '../theme/tokens';

export interface UseNoteDetectionOptions {
  /**
   * Whether to automatically start microphone streaming and inference. Default true.
   */
  autoStart?: boolean;

  /**
   * Optional callback fired when new note predictions arrive.
   */
  onNotesDetected?: (result: NoteDetectionResult) => void;
}

export interface UseNoteDetectionResult {
  /**
   * Whether audio stream is actively capturing.
   */
  isStreaming: boolean;

  /**
   * Whether the ONNX model is loaded and ready.
   */
  isModelReady: boolean;

  /**
   * Sorted list of notes detected above the confidence threshold.
   */
  detectedNotes: DetectedNote[];

  /**
   * Array of active MIDI note numbers (21-108).
   */
  activeNotes: number[];

  /**
   * Raw 88-element Float32Array of activation scores for all keys.
   */
  scores: Float32Array;

  /**
   * Start audio capture and detection.
   */
  start: () => Promise<void>;

  /**
   * Stop audio capture.
   */
  stop: () => void;
}

/**
 * React hook that streams microphone audio through the ONNX note detection model
 * and exposes active notes and confidence scores to React components.
 */
export function useNoteDetection(
  options: UseNoteDetectionOptions = {}
): UseNoteDetectionResult {
  const { autoStart = true, onNotesDetected } = options;

  const [isModelReady, setIsModelReady] = useState<boolean>(() =>
    noteDetectionModel.isLoaded()
  );
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [scores, setScores] = useState<Float32Array>(
    () => new Float32Array(PIANO.totalKeys)
  );

  const isInferringRef = useRef(false);
  const onNotesDetectedRef = useRef(onNotesDetected);
  useEffect(() => {
    onNotesDetectedRef.current = onNotesDetected;
  }, [onNotesDetected]);

  // Pre-load model once at mount
  useEffect(() => {
    let isMounted = true;
    noteDetectionModel
      .loadModel()
      .then(() => {
        if (isMounted) {
          setIsModelReady(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to pre-load note detection model:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleBuffer = useCallback(async (buffer: AudioBufferWindow) => {
    if (isInferringRef.current) {
      // Skip frame if inference is still working on previous buffer to prevent backlog lag
      return;
    }

    isInferringRef.current = true;
    try {
      const result = await noteDetectionModel.predictNotes(buffer);
      setScores(result.scores);
      setDetectedNotes(result.detectedNotes);
      setActiveNotes(result.detectedNotes.map((n) => n.midi));
      onNotesDetectedRef.current?.(result);
    } catch (err) {
      console.warn('Error during note detection inference:', err);
    } finally {
      isInferringRef.current = false;
    }
  }, []);

  const { isStreaming, start, stop } = useAudioStream({
    autoStart,
    onBuffer: handleBuffer,
  });

  return {
    isStreaming,
    isModelReady,
    detectedNotes,
    activeNotes,
    scores,
    start,
    stop,
  };
}
