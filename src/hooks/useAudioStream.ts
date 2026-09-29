import { useEffect, useState, useCallback, useRef } from 'react';
import { audioCapture } from '../audio/AudioCapture';
import type { AudioBufferWindow } from '../audio/types';

export interface UseAudioStreamOptions {
  /**
   * Whether to automatically start streaming when mounted or when permission is present.
   * @default true
   */
  autoStart?: boolean;

  /**
   * Optional callback fired each time a new rolling audio buffer window arrives at the hop interval.
   */
  onBuffer?: (buffer: AudioBufferWindow) => void;
}

export interface UseAudioStreamResult {
  /**
   * Whether microphone capture is actively running.
   */
  isStreaming: boolean;

  /**
   * The most recently delivered fixed-size audio buffer window.
   */
  latestBuffer: AudioBufferWindow | null;

  /**
   * Error encountered during permission request or audio capture.
   */
  error: Error | null;

  /**
   * Start audio capture.
   */
  start: () => Promise<void>;

  /**
   * Stop audio capture.
   */
  stop: () => void;
}

/**
 * React hook to manage continuous microphone audio capture and subscribe to rolling window buffers.
 */
export function useAudioStream(
  options: UseAudioStreamOptions = {}
): UseAudioStreamResult {
  const { autoStart = true, onBuffer } = options;
  const [isStreaming, setIsStreaming] = useState<boolean>(() =>
    audioCapture.isStreaming()
  );
  const [latestBuffer, setLatestBuffer] = useState<AudioBufferWindow | null>(
    null
  );
  const [error, setError] = useState<Error | null>(null);

  const onBufferRef = useRef(onBuffer);
  useEffect(() => {
    onBufferRef.current = onBuffer;
  }, [onBuffer]);

  const start = useCallback(async () => {
    try {
      setError(null);
      await audioCapture.start();
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    }
  }, []);

  const stop = useCallback(() => {
    audioCapture.stop();
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to status changes
    const unsubStatus = audioCapture.onStatusChange((streaming) => {
      if (isMounted) {
        setIsStreaming(streaming);
      }
    });

    // Subscribe to rolling window buffers at the hop interval
    const unsubBuffer = audioCapture.subscribe((buffer) => {
      if (isMounted) {
        setLatestBuffer(buffer);
        onBufferRef.current?.(buffer);
      }
    });

    if (autoStart) {
      audioCapture.start().catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    }

    return () => {
      isMounted = false;
      unsubStatus();
      unsubBuffer();
      if (autoStart) {
        audioCapture.stop();
      }
    };
  }, [autoStart]);

  return {
    isStreaming,
    latestBuffer,
    error,
    start,
    stop,
  };
}
