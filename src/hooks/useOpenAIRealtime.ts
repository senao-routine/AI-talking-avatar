"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export interface RealtimeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface UseOpenAIRealtimeReturn {
  status: RealtimeStatus;
  isSpeaking: boolean;
  isUserSpeaking: boolean;
  userTranscript: string;
  aiTranscript: string;
  messages: RealtimeMessage[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  clearMessages: () => void;
}

interface UseOpenAIRealtimeOptions {
  voice?: string;
}

export function useOpenAIRealtime(
  options: UseOpenAIRealtimeOptions = {}
): UseOpenAIRealtimeReturn {
  const voice = options.voice ?? "nova";

  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [aiTranscript, setAiTranscript] = useState("");
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const aiTranscriptBufRef = useRef("");

  const appendAssistantMessage = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Insert placeholder with kana text immediately, then replace with kanji when conversion returns.
    const messageId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", content: trimmed },
    ]);

    // Fire-and-forget kana→kanji conversion
    fetch("/api/kana-to-kanji", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { text?: string }) => {
        const converted = (data.text ?? "").trim();
        if (!converted || converted === trimmed) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, content: converted } : m
          )
        );
      })
      .catch((err) => {
        console.warn("[realtime] kana-to-kanji conversion failed:", err);
      });
  }, []);

  const appendUserMessage = useCallback((content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ]);
  }, []);

  const handleServerEvent = useCallback(
    (evt: Record<string, unknown>) => {
      const type = evt.type as string | undefined;
      if (!type) return;

      switch (type) {
        case "input_audio_buffer.speech_started":
          setIsUserSpeaking(true);
          setUserTranscript("");
          break;

        case "input_audio_buffer.speech_stopped":
          setIsUserSpeaking(false);
          break;

        case "conversation.item.input_audio_transcription.completed": {
          const transcript = (evt.transcript as string) ?? "";
          appendUserMessage(transcript);
          setUserTranscript("");
          break;
        }

        case "response.audio_transcript.delta": {
          const delta = (evt.delta as string) ?? "";
          aiTranscriptBufRef.current += delta;
          setAiTranscript(aiTranscriptBufRef.current);
          break;
        }

        case "response.audio_transcript.done": {
          const transcript =
            (evt.transcript as string) ?? aiTranscriptBufRef.current;
          appendAssistantMessage(transcript);
          aiTranscriptBufRef.current = "";
          setAiTranscript("");
          break;
        }

        case "output_audio_buffer.started":
        case "response.audio.delta":
          setIsSpeaking(true);
          break;

        case "output_audio_buffer.stopped":
        case "response.audio.done":
        case "response.done":
          setIsSpeaking(false);
          break;

        case "error": {
          const message =
            (evt.error as { message?: string } | undefined)?.message ??
            "Realtime API error";
          console.error("[realtime] server error:", evt);
          setError(message);
          break;
        }

        default:
          break;
      }
    },
    [appendAssistantMessage, appendUserMessage]
  );

  const disconnect = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;

    pcRef.current?.getSenders().forEach((s) => {
      try {
        s.track?.stop();
      } catch {}
    });
    pcRef.current?.close();
    pcRef.current = null;

    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    aiTranscriptBufRef.current = "";
    setAiTranscript("");
    setUserTranscript("");
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    setStatus("idle");
  }, []);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;

    setError(null);
    setStatus("connecting");

    try {
      const sessionRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice }),
      });
      if (!sessionRes.ok) {
        const errText = await sessionRes.text();
        throw new Error(`Session creation failed: ${errText}`);
      }
      const session = await sessionRes.json();
      const ephemeralKey: string | undefined = session?.client_secret?.value;
      const model: string = session?.model ?? "gpt-realtime";
      if (!ephemeralKey) {
        throw new Error("No ephemeral key returned");
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (audioRef.current && stream) {
          audioRef.current.srcObject = stream;
          audioRef.current.play().catch((err) => {
            console.warn("[realtime] audio autoplay blocked:", err);
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed" || state === "disconnected" || state === "closed") {
          if (state === "failed") setError("WebRTC connection failed");
          disconnect();
        }
      };

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", (e) => {
        try {
          const evt = JSON.parse(e.data);
          handleServerEvent(evt);
        } catch (err) {
          console.warn("[realtime] failed to parse event:", err);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
            "OpenAI-Beta": "realtime=v1",
          },
          body: offer.sdp ?? "",
        }
      );
      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`SDP exchange failed: ${errText}`);
      }
      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setStatus("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[realtime] connect error:", err);
      setError(message);
      setStatus("error");
      disconnect();
    }
  }, [status, voice, handleServerEvent, disconnect]);

  const interrupt = useCallback(() => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    dc.send(JSON.stringify({ type: "response.cancel" }));
    setIsSpeaking(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    aiTranscriptBufRef.current = "";
    setAiTranscript("");
    setUserTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    isSpeaking,
    isUserSpeaking,
    userTranscript,
    aiTranscript,
    messages,
    audioRef,
    error,
    connect,
    disconnect,
    interrupt,
    clearMessages,
  };
}
