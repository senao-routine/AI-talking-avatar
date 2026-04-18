"use client";

import { forwardRef } from "react";

interface AvatarDisplayProps {
  isPlaying: boolean;
  isConnected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onConnect: () => void;
}

const AvatarDisplay = forwardRef<HTMLDivElement, AvatarDisplayProps>(
  function AvatarDisplay({ isPlaying, isConnected, videoRef, audioRef, onConnect }, ref) {
    return (
      <div ref={ref} className="relative flex flex-col items-center justify-center w-full h-full">
        {/* Video container - large */}
        <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-violet-500/10 bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200/50 w-full h-full max-w-[600px] max-h-[600px] aspect-square">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${isConnected ? "block" : "hidden"}`}
          />
          <audio ref={audioRef} autoPlay />

          {!isConnected && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-gradient-to-br from-violet-50 via-white to-indigo-50">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 shadow-inner" style={{ animation: "float 3s ease-in-out infinite" }}>
                  <svg className="h-16 w-16 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={onConnect}
                className="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Connect Avatar
              </button>
              <p className="text-xs text-gray-400 font-medium">Click to start conversation</p>
            </div>
          )}

          {/* Speaking indicator */}
          {isConnected && isPlaying && (
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent flex items-end justify-center pb-3">
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                <div className="flex gap-0.5 items-end h-4">
                  <div className="w-1 bg-white rounded-full animate-bounce [animation-delay:0ms]" style={{ height: "40%" }} />
                  <div className="w-1 bg-white rounded-full animate-bounce [animation-delay:100ms]" style={{ height: "70%" }} />
                  <div className="w-1 bg-white rounded-full animate-bounce [animation-delay:200ms]" style={{ height: "50%" }} />
                  <div className="w-1 bg-white rounded-full animate-bounce [animation-delay:300ms]" style={{ height: "80%" }} />
                  <div className="w-1 bg-white rounded-full animate-bounce [animation-delay:100ms]" style={{ height: "60%" }} />
                </div>
                <span className="text-xs text-white/90 ml-1.5 font-medium">Speaking</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default AvatarDisplay;
