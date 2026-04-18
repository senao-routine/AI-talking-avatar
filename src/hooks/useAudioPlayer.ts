"use client";

import { useRef, useCallback, useState } from "react";

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  pushAudioChunk: (base64Audio: string) => void;
  stopAudio: () => void;
  getAnalyserNode: () => AnalyserNode | null;
  setOnPlaybackEnd: (cb: (() => void) | null) => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const onPlaybackEndRef = useRef<(() => void) | null>(null);
  const leftoverByteRef = useRef<number | null>(null);
  const endTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const setOnPlaybackEnd = useCallback((cb: (() => void) | null) => {
    onPlaybackEndRef.current = cb;
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current;
  }, []);

  // Schedule a chunk for gapless playback using precise timing
  const pushAudioChunk = useCallback(
    (base64Audio: string) => {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      // Decode base64 to bytes
      const binaryStr = atob(base64Audio);
      const rawBytes: number[] = [];

      if (leftoverByteRef.current !== null) {
        rawBytes.push(leftoverByteRef.current);
        leftoverByteRef.current = null;
      }

      for (let i = 0; i < binaryStr.length; i++) {
        rawBytes.push(binaryStr.charCodeAt(i));
      }

      if (rawBytes.length % 2 !== 0) {
        leftoverByteRef.current = rawBytes.pop()!;
      }

      if (rawBytes.length < 2) return;

      // PCM16 LE → Float32
      const numSamples = rawBytes.length / 2;
      const float32 = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const lo = rawBytes[i * 2];
        const hi = rawBytes[i * 2 + 1];
        const int16 = (hi << 8) | lo;
        float32[i] = (int16 >= 0x8000 ? int16 - 0x10000 : int16) / 32768;
      }

      const sampleRate = 16000;
      const audioBuffer = ctx.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current!);

      // Schedule for gapless playback
      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      source.start(startTime);
      scheduledSourcesRef.current.push(source);

      if (!isActiveRef.current) {
        isActiveRef.current = true;
        setIsPlaying(true);
      }

      // Reset the end-of-playback timer
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      const remainingMs = (nextPlayTimeRef.current - now) * 1000 + 100;
      endTimerRef.current = setTimeout(() => {
        isActiveRef.current = false;
        setIsPlaying(false);
        scheduledSourcesRef.current = [];
        leftoverByteRef.current = null;
        onPlaybackEndRef.current?.();
      }, remainingMs);

      source.onended = () => {
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter(
          (s) => s !== source
        );
      };
    },
    [getAudioContext]
  );

  const stopAudio = useCallback(() => {
    if (endTimerRef.current) clearTimeout(endTimerRef.current);

    for (const source of scheduledSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    }
    scheduledSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    leftoverByteRef.current = null;
    isActiveRef.current = false;
    setIsPlaying(false);
  }, []);

  const getAnalyserNode = useCallback(() => analyserRef.current, []);

  return { isPlaying, pushAudioChunk, stopAudio, getAnalyserNode, setOnPlaybackEnd };
}
