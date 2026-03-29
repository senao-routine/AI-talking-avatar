"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import {
  SimliClient,
  generateSimliSessionToken,
  generateIceServers,
} from "simli-client";

export interface UseSimliAvatarReturn {
  isConnected: boolean;
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (base64PCM: string) => void;
  clearBuffer: () => void;
  setOnPlaybackEnd: (cb: (() => void) | null) => void;
}

interface SimliConfig {
  apiKey: string;
  faceId: string;
}

export function useSimliAvatar(config: SimliConfig): UseSimliAvatarReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simliClientRef = useRef<SimliClient | null>(null);
  const onPlaybackEndRef = useRef<(() => void) | null>(null);
  const leftoverByteRef = useRef<number | null>(null);
  const hasSentAudioRef = useRef(false);

  const setOnPlaybackEnd = useCallback((cb: (() => void) | null) => {
    onPlaybackEndRef.current = cb;
  }, []);

  const connect = useCallback(async () => {
    if (simliClientRef.current) return; // Already connected or connecting
    if (!videoRef.current || !audioRef.current) return;
    if (!config.apiKey || !config.faceId) return;

    try {
      const tokenData = await generateSimliSessionToken({
        apiKey: config.apiKey,
        config: {
          faceId: config.faceId,
          handleSilence: true,
          maxSessionLength: 3600,
          maxIdleTime: 600,
        },
      });

      const iceServers = await generateIceServers(config.apiKey);

      const client = new SimliClient(
        tokenData.session_token,
        videoRef.current,
        audioRef.current,
        iceServers
      );

      // Listen for speaking/silent events for accurate playback tracking
      client.on("speaking", () => {
        setIsPlaying(true);
      });

      client.on("silent", () => {
        setIsPlaying(false);
        // Only fire playback end if we actually sent audio (not idle silence)
        if (hasSentAudioRef.current) {
          hasSentAudioRef.current = false;
          onPlaybackEndRef.current?.();
        }
      });

      client.on("error", (detail) => {
        console.error("[Simli] Error:", detail);
      });

      simliClientRef.current = client;
      await client.start();
      setIsConnected(true);
    } catch (error) {
      console.error("[Simli] Connection error:", error);
    }
  }, [config.apiKey, config.faceId]);

  const disconnect = useCallback(() => {
    simliClientRef.current?.stop();
    simliClientRef.current = null;
    setIsConnected(false);
    setIsPlaying(false);
  }, []);

  const sendAudio = useCallback((base64PCM: string) => {
    if (!simliClientRef.current) return;

    const binaryStr = atob(base64PCM);
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

    hasSentAudioRef.current = true;
    const audioData = new Uint8Array(rawBytes);
    simliClientRef.current.sendAudioData(audioData);
  }, []);

  const clearBuffer = useCallback(() => {
    simliClientRef.current?.ClearBuffer();
    hasSentAudioRef.current = false;
    setIsPlaying(false);
    leftoverByteRef.current = null;
  }, []);

  useEffect(() => {
    // Close connection on page unload
    const handleBeforeUnload = () => {
      simliClientRef.current?.stop();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      simliClientRef.current?.stop();
    };
  }, []);

  return {
    isConnected,
    isPlaying,
    videoRef,
    audioRef,
    connect,
    disconnect,
    sendAudio,
    clearBuffer,
    setOnPlaybackEnd,
  };
}
