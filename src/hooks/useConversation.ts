"use client";

import { useState, useRef, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface UseConversationReturn {
  messages: Message[];
  isProcessing: boolean;
  currentTranscript: string;
  sendMessage: (text: string) => Promise<void>;
  setCurrentTranscript: (text: string) => void;
  clearMessages: () => void;
  setOnAudioChunk: (cb: ((base64Audio: string) => void) | null) => void;
}

export function useConversation(): UseConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const onAudioChunkRef = useRef<((base64Audio: string) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  messagesRef.current = messages;

  const setOnAudioChunk = useCallback(
    (cb: ((base64Audio: string) => void) | null) => {
      onAudioChunkRef.current = cb;
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setCurrentTranscript("");
      setIsProcessing(true);

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let assistantText = "";
        const assistantId = crypto.randomUUID();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          const parts = sseBuffer.split("\n\n");
          sseBuffer = parts.pop() || "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;

            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "text") {
                assistantText += data.content;
                setMessages((prev) => {
                  const existing = prev.find((m) => m.id === assistantId);
                  if (existing) {
                    return prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: assistantText }
                        : m
                    );
                  }
                  return [
                    ...prev,
                    {
                      id: assistantId,
                      role: "assistant" as const,
                      content: assistantText,
                      timestamp: Date.now(),
                    },
                  ];
                });
              } else if (data.type === "audio") {
                // Play immediately as each chunk arrives
                onAudioChunkRef.current?.(data.content);
              } else if (data.type === "error") {
                console.error("[Conversation] Server error:", data.content);
              }
            } catch {
              // Skip
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Conversation error:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentTranscript("");
  }, []);

  return {
    messages,
    isProcessing,
    currentTranscript,
    sendMessage,
    setCurrentTranscript,
    clearMessages,
    setOnAudioChunk,
  };
}
