"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/hooks/useConversation";

interface SpeechBubblesProps {
  messages: Message[];
  currentTranscript: string;
  isProcessing: boolean;
}

export default function SpeechBubbles({
  messages,
  currentTranscript,
  isProcessing,
}: SpeechBubblesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, currentTranscript]);

  const recentMessages = messages.slice(-8);

  return (
    <div
      ref={scrollRef}
      className="w-full max-w-xl mx-auto max-h-[200px] overflow-y-auto px-4"
      style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 15%)" }}
    >
      <div className="flex flex-col gap-2">
        {recentMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-[fadeIn_0.3s_ease-out]`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                message.role === "user"
                  ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-br-md"
                  : "bg-white text-gray-700 ring-1 ring-gray-200/50 rounded-bl-md"
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider mr-2 ${
                message.role === "user" ? "text-white/50" : "text-gray-400"
              }`}>
                {message.role === "user" ? "You" : "AI"}
              </span>
              {message.content}
            </div>
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-end animate-[fadeIn_0.3s_ease-out]">
            <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-400/70 to-indigo-400/70 px-4 py-2 text-sm text-white/90 shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mr-2">You</span>
              {currentTranscript}
              <span className="inline-flex gap-0.5 ml-1">
                <span className="animate-bounce [animation-delay:0ms] text-white/40">.</span>
                <span className="animate-bounce [animation-delay:150ms] text-white/40">.</span>
                <span className="animate-bounce [animation-delay:300ms] text-white/40">.</span>
              </span>
            </div>
          </div>
        )}

        {isProcessing && !currentTranscript && (
          <div className="flex justify-start animate-[fadeIn_0.3s_ease-out]">
            <div className="rounded-2xl rounded-bl-md bg-white px-4 py-2.5 shadow-sm ring-1 ring-gray-200/50">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
