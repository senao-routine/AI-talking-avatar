"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isPaused: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  resetTranscript: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const isPausedRef = useRef(false);

  const createRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      console.warn("Speech Recognition not supported in this browser");
      return null;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ja-JP";
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Ignore results while paused (AI is speaking)
      if (isPausedRef.current) return;

      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
        setTranscript(finalTranscriptRef.current);
      }
      setInterimTranscript(interim);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech" || event.error === "network") {
        return;
      }
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && isListeningRef.current) {
        setTimeout(() => {
          if (shouldRestartRef.current && isListeningRef.current) {
            const newRecognition = createRecognition();
            if (newRecognition) {
              recognitionRef.current = newRecognition;
              try {
                newRecognition.start();
              } catch {
                // Ignore
              }
            }
          }
        }, 100);
      }
    };

    return recognition;
  }, []);

  const startListening = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    isListeningRef.current = true;
    shouldRestartRef.current = true;
    isPausedRef.current = false;
    setIsListening(true);
    setIsPaused(false);

    const recognition = createRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        // Already started
      }
    }
  }, [createRecognition]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    shouldRestartRef.current = false;
    isPausedRef.current = false;
    setIsListening(false);
    setIsPaused(false);
    setInterimTranscript("");

    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped
    }
    recognitionRef.current = null;
  }, []);

  // Pause: stop recognition engine so it doesn't pick up AI audio
  const pauseListening = useCallback(() => {
    if (!isListeningRef.current) return;
    isPausedRef.current = true;
    setIsPaused(true);
    setInterimTranscript("");

    // Actually stop the recognition to prevent any audio capture
    shouldRestartRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped
    }
    recognitionRef.current = null;
  }, []);

  // Resume: restart recognition after AI finishes speaking
  const resumeListening = useCallback(() => {
    if (!isListeningRef.current) return;
    isPausedRef.current = false;
    shouldRestartRef.current = true;
    setIsPaused(false);

    // Clear any transcript that might have been captured during AI playback
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");

    const recognition = createRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        // Ignore
      }
    }
  }, [createRecognition]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    setTranscript("");
    setInterimTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      isListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore
      }
    };
  }, []);

  return {
    isListening,
    isPaused,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  };
}
