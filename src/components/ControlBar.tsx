"use client";

interface ControlBarProps {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  isChatOpen: boolean;
  onToggleRecording: () => void;
  onStopAudio: () => void;
  onClearChat: () => void;
  onToggleChat: () => void;
}

export default function ControlBar({
  isRecording,
  isProcessing,
  isPlaying,
  isChatOpen,
  onToggleRecording,
  onStopAudio,
  onClearChat,
  onToggleChat,
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-center gap-5 border-t border-gray-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
      {/* Clear button */}
      <button
        onClick={onClearChat}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 hover:scale-105 active:scale-95"
        title="Clear conversation"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Stop playback button */}
      <button
        onClick={onStopAudio}
        disabled={!isPlaying}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 ${
          isPlaying
            ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-md shadow-amber-400/20"
            : "bg-gray-100 text-gray-300 cursor-not-allowed"
        }`}
        title="Stop playback"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>

      {/* Main microphone button */}
      <button
        onClick={onToggleRecording}
        disabled={isProcessing}
        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
          isRecording
            ? "bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25"
            : isProcessing
              ? "bg-gray-200 cursor-not-allowed"
              : "bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/25"
        }`}
      >
        {isRecording && (
          <div className="absolute inset-0 animate-ping rounded-2xl bg-rose-500 opacity-15" />
        )}
        {isRecording ? (
          <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Chat toggle button */}
      <button
        onClick={onToggleChat}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 ${
          isChatOpen
            ? "bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/20"
            : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        }`}
        title="Toggle chat panel"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </button>

      {/* Settings placeholder */}
      <button
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 hover:scale-105 active:scale-95"
        title="Settings"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
}
