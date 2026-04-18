"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AvatarDisplay from "./AvatarDisplay";
import ChatPanel from "./ChatPanel";
import ControlBar from "./ControlBar";
import { useConversation } from "@/hooks/useConversation";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSimliAvatar } from "@/hooks/useSimliAvatar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useOpenAIRealtime } from "@/hooks/useOpenAIRealtime";

import type { Message } from "@/hooks/useConversation";

type ConversationMode = "classic" | "realtime";

const REALTIME_VOICES = [
  { id: "marin", label: "Marin (新・推奨)" },
  { id: "cedar", label: "Cedar (新)" },
  { id: "coral", label: "Coral (落ち着いた女性)" },
  { id: "shimmer", label: "Shimmer (warm女性)" },
  { id: "sage", label: "Sage (中性)" },
  { id: "verse", label: "Verse (表現豊か)" },
  { id: "ballad", label: "Ballad" },
  { id: "alloy", label: "Alloy" },
  { id: "ash", label: "Ash" },
  { id: "echo", label: "Echo (男性)" },
] as const;

const SILENCE_TIMEOUT_MS = 800;

function SpeechColumn({
  messages,
  side,
  currentTranscript,
  isProcessing,
}: {
  messages: Message[];
  side: "user" | "ai";
  currentTranscript?: string;
  isProcessing?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, currentTranscript]);

  const recent = messages.slice(-10);
  const isUser = side === "user";

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto flex flex-col justify-end"
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 10%)" }}
    >
      <div className="flex flex-col gap-2.5">
        {recent.map((msg) => (
          <div key={msg.id} className={`animate-[fadeIn_0.3s_ease-out] ${isUser ? "flex justify-end" : ""}`}>
            <div
              className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                isUser
                  ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-br-sm"
                  : "bg-white text-gray-700 ring-1 ring-gray-200/50 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Live transcript (user side) */}
        {isUser && currentTranscript && (
          <div className="animate-[fadeIn_0.3s_ease-out] flex justify-end">
            <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-400/60 to-indigo-400/60 px-3.5 py-2.5 text-[13px] text-white/80 shadow-sm">
              {currentTranscript}
              <span className="inline-flex gap-0.5 ml-1">
                <span className="animate-bounce [animation-delay:0ms] text-white/40">.</span>
                <span className="animate-bounce [animation-delay:150ms] text-white/40">.</span>
                <span className="animate-bounce [animation-delay:300ms] text-white/40">.</span>
              </span>
            </div>
          </div>
        )}

        {/* Streaming AI transcript (AI side) */}
        {!isUser && currentTranscript && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="rounded-2xl rounded-bl-sm bg-white/80 px-3.5 py-2.5 text-[13px] text-gray-600 ring-1 ring-gray-200/50 shadow-sm inline-block">
              {currentTranscript}
              <span className="inline-flex gap-0.5 ml-1">
                <span className="animate-bounce [animation-delay:0ms] text-gray-400">.</span>
                <span className="animate-bounce [animation-delay:150ms] text-gray-400">.</span>
                <span className="animate-bounce [animation-delay:300ms] text-gray-400">.</span>
              </span>
            </div>
          </div>
        )}

        {/* Thinking indicator (AI side only) */}
        {!isUser && isProcessing && !currentTranscript && (
          <div className="animate-[fadeIn_0.3s_ease-out]">
            <div className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 shadow-sm ring-1 ring-gray-200/50 inline-block">
              <div className="flex gap-1.5">
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AvatarApp() {
  const [mode, setMode] = useState<ConversationMode>("classic");

  const {
    messages,
    isProcessing,
    currentTranscript,
    sendMessage,
    setCurrentTranscript,
    clearMessages,
    setOnAudioChunk,
  } = useConversation();

  const fallbackPlayer = useAudioPlayer();
  const [simliConfig, setSimliConfig] = useState({ apiKey: "", faceId: "" });
  const simli = useSimliAvatar(simliConfig);
  const classicIsPlaying = simli.isConnected ? simli.isPlaying : fallbackPlayer.isPlaying;

  const [realtimeVoice, setRealtimeVoice] = useState<string>("marin");
  const realtime = useOpenAIRealtime({ voice: realtimeVoice });
  const isRealtime = mode === "realtime";
  const isPlaying = isRealtime ? realtime.isSpeaking : classicIsPlaying;

  // Unified display values (switches by mode)
  const displayMessages: Message[] = isRealtime
    ? realtime.messages.map((m) => ({ id: m.id, role: m.role, content: m.content, timestamp: 0 }))
    : messages;
  const displayTranscript = isRealtime ? realtime.userTranscript : currentTranscript;
  const displayIsProcessing = isRealtime ? false : isProcessing;
  const displayAiTranscript = isRealtime ? realtime.aiTranscript : "";

  const {
    isListening,
    isPaused,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [textInput, setTextInput] = useState("");
  const [micActive, setMicActive] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef("");
  const isSendingRef = useRef(false);
  const micActiveRef = useRef(false);

  micActiveRef.current = micActive;

  // Fetch Simli config
  useEffect(() => {
    fetch("/api/simli")
      .then((r) => r.json())
      .then((data) => {
        if (data.apiKey && data.faceId) setSimliConfig({ apiKey: data.apiKey, faceId: data.faceId });
      })
      .catch(() => {});
  }, []);

  // Route audio
  useEffect(() => {
    setOnAudioChunk((base64Audio: string) => {
      simli.isConnected ? simli.sendAudio(base64Audio) : fallbackPlayer.pushAudioChunk(base64Audio);
    });
  }, [setOnAudioChunk, simli.isConnected, simli.sendAudio, fallbackPlayer.pushAudioChunk]);

  // Resume STT on playback end
  useEffect(() => {
    const cb = () => { if (micActiveRef.current) resumeListening(); };
    simli.setOnPlaybackEnd(cb);
    fallbackPlayer.setOnPlaybackEnd(cb);
  }, [simli.setOnPlaybackEnd, fallbackPlayer.setOnPlaybackEnd, resumeListening]);

  // Pause STT during AI
  useEffect(() => {
    if (micActive && (isProcessing || isPlaying)) pauseListening();
  }, [isProcessing, isPlaying, micActive, pauseListening]);

  // Update transcript display
  useEffect(() => {
    setCurrentTranscript(transcript + interimTranscript);
  }, [transcript, interimTranscript, setCurrentTranscript]);

  // Auto-send on silence
  useEffect(() => {
    if (!micActive || !isListening || isPaused) return;
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = transcript.trim();
        if (text && !isSendingRef.current) {
          isSendingRef.current = true;
          resetTranscript();
          lastTranscriptRef.current = "";
          pauseListening();
          sendMessage(text).finally(() => { isSendingRef.current = false; });
        }
      }, SILENCE_TIMEOUT_MS);
    }
    return () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
  }, [transcript, micActive, isListening, isPaused, sendMessage, resetTranscript, pauseListening]);

  const handleToggleMic = useCallback(() => {
    if (isRealtime) {
      if (realtime.status === "connected" || realtime.status === "connecting") {
        realtime.disconnect();
        setMicActive(false);
      } else {
        setMicActive(true);
        realtime.connect();
      }
      return;
    }

    if (micActive) {
      setMicActive(false);
      stopListening();
      const remaining = transcript.trim();
      if (remaining && !isSendingRef.current) {
        isSendingRef.current = true;
        resetTranscript();
        lastTranscriptRef.current = "";
        sendMessage(remaining).finally(() => { isSendingRef.current = false; });
      }
    } else {
      setMicActive(true);
      simli.isConnected ? simli.clearBuffer() : fallbackPlayer.stopAudio();
      resetTranscript();
      lastTranscriptRef.current = "";
      startListening();
    }
  }, [isRealtime, realtime, micActive, transcript, stopListening, startListening, sendMessage, resetTranscript, simli, fallbackPlayer]);

  const handleStopAudio = useCallback(() => {
    if (isRealtime) {
      realtime.interrupt();
      return;
    }
    simli.isConnected ? simli.clearBuffer() : fallbackPlayer.stopAudio();
  }, [isRealtime, realtime, simli, fallbackPlayer]);

  const handleConnect = useCallback(async () => { await simli.connect(); }, [simli]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) { sendMessage(textInput); setTextInput(""); }
  }, [textInput, sendMessage]);

  const handleClearChat = useCallback(() => {
    handleStopAudio();
    stopListening();
    setMicActive(false);
    clearMessages();
    realtime.clearMessages();
    resetTranscript();
    lastTranscriptRef.current = "";
  }, [handleStopAudio, stopListening, clearMessages, realtime, resetTranscript]);

  const needsReconnectRef = useRef(false);

  const handleVoiceChange = useCallback(
    (nextVoice: string) => {
      const wasConnected = realtime.status === "connected" || realtime.status === "connecting";
      if (wasConnected) {
        realtime.disconnect();
        needsReconnectRef.current = true;
      }
      setRealtimeVoice(nextVoice);
    },
    [realtime]
  );

  // Auto-reconnect after voice change
  useEffect(() => {
    if (needsReconnectRef.current && realtime.status === "idle") {
      needsReconnectRef.current = false;
      realtime.connect();
    }
  }, [realtimeVoice, realtime]);

  const handleToggleMode = useCallback(() => {
    if (isRealtime) {
      realtime.disconnect();
      setMicActive(false);
      setMode("classic");
    } else {
      if (micActive) {
        stopListening();
        setMicActive(false);
      }
      setMode("realtime");
    }
  }, [isRealtime, realtime, micActive, stopListening]);

  const realtimeStatusText =
    realtime.status === "connecting"
      ? "Connecting..."
      : realtime.status === "connected"
        ? realtime.isSpeaking
          ? "Speaking..."
          : realtime.isUserSpeaking
            ? "Listening..."
            : "Ready"
        : realtime.error
          ? `Error: ${realtime.error}`
          : "Tap mic to connect";

  const statusText = isRealtime
    ? realtimeStatusText
    : micActive
      ? isPaused
        ? isProcessing ? "Thinking..." : isPlaying ? "Speaking..." : "Preparing..."
        : interimTranscript || transcript ? "Listening..." : "Ready to listen"
      : "Tap mic to start";

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200/60 bg-white/70 backdrop-blur-md px-6 py-3 z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20">
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800">AI Avatar</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
              {isRealtime ? "Realtime (GPT)" : "Powered by Claude"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Voice selector (realtime mode only) */}
          {isRealtime && (
            <select
              value={realtimeVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="rounded-full bg-gray-50 ring-1 ring-gray-200/60 px-3 py-1 text-[11px] font-semibold text-gray-600 outline-none hover:bg-gray-100 cursor-pointer"
              title="Voice selection"
            >
              {REALTIME_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
          {/* Mode toggle */}
          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 text-[11px] font-semibold transition-all ${
              isRealtime
                ? "bg-violet-50 ring-violet-200/60 text-violet-700 hover:bg-violet-100"
                : "bg-gray-50 ring-gray-200/60 text-gray-600 hover:bg-gray-100"
            }`}
            title="Toggle conversation mode"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isRealtime ? "bg-violet-500 animate-pulse" : "bg-gray-400"}`} />
            {isRealtime ? "Realtime" : "Classic"}
          </button>
          {!isRealtime && simli.isConnected && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 ring-1 ring-blue-200/50">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-[11px] font-semibold text-blue-600">Avatar</span>
            </div>
          )}
          {isRealtime && realtime.status === "connected" && (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ${realtime.isSpeaking ? "bg-violet-50 ring-violet-200/50" : "bg-emerald-50 ring-emerald-200/50"}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${realtime.isSpeaking ? "bg-violet-500 animate-pulse" : "animate-pulse bg-emerald-500"}`} />
              <span className={`text-[11px] font-semibold ${realtime.isSpeaking ? "text-violet-600" : "text-emerald-600"}`}>
                {realtime.isSpeaking ? "Speaking" : "Live"}
              </span>
            </div>
          )}
          {!isRealtime && micActive && (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ${isPaused ? "bg-amber-50 ring-amber-200/50" : "bg-emerald-50 ring-emerald-200/50"}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isPaused ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
              <span className={`text-[11px] font-semibold ${isPaused ? "text-amber-600" : "text-emerald-600"}`}>
                {isPaused ? "Paused" : "Mic ON"}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* 3-column layout: AI bubbles | Avatar | User bubbles */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column - AI responses */}
          <div className="flex flex-col justify-end w-[280px] flex-shrink-0 p-4 pb-6 overflow-hidden">
            <SpeechColumn
              messages={displayMessages.filter(m => m.role === "assistant")}
              side="ai"
              currentTranscript={displayAiTranscript}
              isProcessing={displayIsProcessing}
            />
          </div>

          {/* Center - Avatar */}
          <div className="flex flex-1 flex-col items-center justify-center py-4 min-w-0">
            <div className="w-full h-full flex items-center justify-center">
              <AvatarDisplay
                isPlaying={isPlaying}
                isConnected={simli.isConnected}
                videoRef={simli.videoRef}
                audioRef={simli.audioRef}
                onConnect={handleConnect}
              />
            </div>
            <div className="flex-shrink-0 mt-3">
              <p className="text-sm font-medium text-gray-400 bg-white/60 backdrop-blur-sm rounded-full px-4 py-1.5">{statusText}</p>
            </div>
          </div>

          {/* Right column - User messages */}
          <div className="flex flex-col justify-end w-[280px] flex-shrink-0 p-4 pb-6 overflow-hidden">
            <SpeechColumn
              messages={displayMessages.filter(m => m.role === "user")}
              side="user"
              currentTranscript={displayTranscript}
              isProcessing={displayIsProcessing}
            />
          </div>
        </div>

        {/* Chat panel - slide in/out */}
        <div className={`flex flex-col border-l border-gray-200/60 bg-gray-50/95 backdrop-blur-md transition-all duration-300 ease-in-out z-10 ${
          chatOpen ? "w-[400px] opacity-100" : "w-0 opacity-0 overflow-hidden"
        }`}>
          <div className="flex-1 overflow-hidden min-w-[400px]">
            <ChatPanel messages={displayMessages} currentTranscript={displayTranscript} isProcessing={displayIsProcessing} />
          </div>

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="border-t border-gray-200/60 bg-white/60 backdrop-blur-sm p-4 min-w-[400px]">
            <div className="flex gap-2.5">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none transition-all focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={isProcessing || !textInput.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg hover:scale-105 active:scale-95 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom control bar */}
      <ControlBar
        isRecording={isRealtime ? realtime.status === "connected" : micActive}
        isProcessing={displayIsProcessing}
        isPlaying={isPlaying}
        isChatOpen={chatOpen}
        onToggleRecording={handleToggleMic}
        onStopAudio={handleStopAudio}
        onClearChat={handleClearChat}
        onToggleChat={() => setChatOpen((v) => !v)}
      />

      {/* Hidden audio element for Realtime playback */}
      <audio ref={realtime.audioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}
