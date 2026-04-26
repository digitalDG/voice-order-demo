"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

function getSupportedMimeType(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

const SILENCE_MS = 3000;

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioBufferRef = useRef<Blob[]>([]);
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearSilenceTimer();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    audioBufferRef.current = [];
  }, [clearSilenceTimer]);

  const closeWs = useCallback(() => {
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
    wsReadyRef.current = false;
  }, []);

  const prewarm = useCallback(async () => {
    try {
      const res = await fetch("/api/deepgram-token");
      const { key } = await res.json();
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true&endpointing=800&vad_events=true`,
        ["token", key]
      );
      wsRef.current = ws;
      ws.onopen = () => {
        wsReadyRef.current = true;
        // Keep idle connection alive so it's ready when user clicks
        keepaliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && !mediaRecorderRef.current) {
            ws.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
      };
      ws.onerror = () => { wsReadyRef.current = false; wsRef.current = null; };
      ws.onclose = () => {
        wsReadyRef.current = false;
        if (keepaliveIntervalRef.current) {
          clearInterval(keepaliveIntervalRef.current);
          keepaliveIntervalRef.current = null;
        }
        // Re-prewarm if this was an idle connection (not mid-session)
        if (!mediaRecorderRef.current) prewarm();
      };
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    prewarm();
    return () => { cleanup(); closeWs(); };
  }, [prewarm, cleanup, closeWs]);

  const stopListening = useCallback(() => {
    cleanup();
    closeWs();
  }, [cleanup, closeWs]);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => stopListening(), SILENCE_MS);
  }, [clearSilenceTimer, stopListening]);

  const attachWsHandlers = useCallback((ws: WebSocket) => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "UtteranceEnd") {
        if (transcriptRef.current) stopListening();
        return;
      }
      const text = data?.channel?.alternatives?.[0]?.transcript;
      if (!text) return;
      resetSilenceTimer();
      if (data.is_final) {
        transcriptRef.current += (transcriptRef.current ? " " : "") + text;
        setTranscript(transcriptRef.current);
      } else {
        setTranscript(transcriptRef.current + (transcriptRef.current ? " " : "") + text);
      }
      if (data.speech_final && transcriptRef.current) stopListening();
    };

    ws.onclose = () => {
      setListening(false);
      if (!cancelledRef.current && transcriptRef.current) {
        onTranscript(transcriptRef.current);
      }
      cleanup();
      prewarm();
    };

    ws.onerror = () => { setListening(false); cleanup(); };
  }, [cleanup, stopListening, resetSilenceTimer, onTranscript, prewarm]);

  const startListening = useCallback(async () => {
    cancelledRef.current = false;
    transcriptRef.current = "";
    audioBufferRef.current = [];
    setTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      // Start recording immediately — buffer chunks until WS is ready
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          if (audioBufferRef.current.length > 0) {
            audioBufferRef.current.forEach((chunk) => ws.send(chunk));
            audioBufferRef.current = [];
          }
          ws.send(e.data);
        } else {
          audioBufferRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setListening(true);
      resetSilenceTimer();

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        attachWsHandlers(ws);
      } else {
        // Open fresh WS — buffered audio will flush when it opens
        const res = await fetch("/api/deepgram-token");
        const { key } = await res.json();
        const freshWs = new WebSocket(
          `wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true&endpointing=800&vad_events=true`,
          ["token", key]
        );
        wsRef.current = freshWs;
        freshWs.onopen = () => { wsReadyRef.current = true; };
        attachWsHandlers(freshWs);
      }
    } catch {
      setListening(false);
      cleanup();
    }
  }, [attachWsHandlers, cleanup, resetSilenceTimer]);

  const cancelListening = useCallback(() => {
    cancelledRef.current = true;
    transcriptRef.current = "";
    setTranscript("");
    setListening(false);
    stopListening();
  }, [stopListening]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center">
        {listening && (
          <div className="absolute flex items-end gap-0.5 h-16 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full opacity-70 animate-bounce"
                style={{
                  height: `${Math.random() * 32 + 8}px`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: `${0.5 + Math.random() * 0.4}s`,
                }}
              />
            ))}
          </div>
        )}
        <button
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          className={`relative z-10 w-24 h-24 rounded-full text-white font-bold text-sm transition-all shadow-2xl
            ${listening
              ? "bg-red-600 ring-4 ring-red-400 ring-opacity-50 scale-110"
              : "bg-red-500 hover:bg-red-600 hover:scale-105"
            }
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {listening ? "⏹ Stop" : "🎙 Speak"}
        </button>
      </div>

      {listening && (
        <button
          onClick={cancelListening}
          className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
        >
          Cancel
        </button>
      )}

      {transcript && (
        <p className="text-sm text-gray-400 italic max-w-sm text-center bg-white/5 rounded-xl px-4 py-2">
          &ldquo;{transcript}&rdquo;
        </p>
      )}
    </div>
  );
}
