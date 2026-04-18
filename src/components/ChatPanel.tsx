"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/hooks/useConversation";

interface ChatPanelProps {
  messages: Message[];
  currentTranscript: string;
  isProcessing: boolean;
}

export default function ChatPanel({
  messages,
  currentTranscript,
  isProcessing,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, currentTranscript]);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-5 py-3.5 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <h2 className="text-sm font-semibold text-gray-700">Chat</h2>
          <span className="text-xs text-gray-400 ml-auto">{messages.length} messages</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !currentTranscript && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100">
                <svg className="h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                会話を始めましょう
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex items-end gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar icon */}
              <div className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                message.role === "user"
                  ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white"
                  : "bg-gradient-to-br from-emerald-400 to-teal-400 text-white"
              }`}>
                {message.role === "user" ? "Y" : "AI"}
              </div>

              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-br-md"
                    : "bg-white text-gray-700 border border-gray-100 rounded-bl-md"
                }`}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-end">
            <div className="flex items-end gap-2 max-w-[85%] flex-row-reverse">
              <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/50 to-indigo-500/50 text-white text-xs font-bold">
                Y
              </div>
              <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-violet-400/60 to-indigo-400/60 px-4 py-2.5 text-sm text-white/90 shadow-sm">
                {currentTranscript}
                <span className="ml-1 inline-flex gap-0.5">
                  <span className="animate-bounce [animation-delay:0ms] text-white/60">.</span>
                  <span className="animate-bounce [animation-delay:150ms] text-white/60">.</span>
                  <span className="animate-bounce [animation-delay:300ms] text-white/60">.</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {isProcessing && !currentTranscript && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 text-white text-xs font-bold">
                AI
              </div>
              <div className="rounded-2xl rounded-bl-md bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
