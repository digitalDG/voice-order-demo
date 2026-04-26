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
const DG_URL = `wss://api.deepgram.com/v1/listen?model=nova-3&language=en-US&smart_format=true&interim_results=true&endpointing=1500&vad_events=true`;

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepaliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearKeepalive = useCallback(() => {
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearSilenceTimer();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
  }, [clearSilenceTimer]);

  const closeWs = useCallback(() => {
    clearKeepalive();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, [clearKeepalive]);

  const openFreshWs = useCallback(async () => {
    const res = await fetch("/api/deepgram-token");
    const { key } = await res.json();
    const ws = new WebSocket(DG_URL, ["token", key]);
    wsRef.current = ws;
    return ws;
  }, []);

  const prewarm = useCallback(async () => {
    try {
      const ws = await openFreshWs();
      ws.onopen = () => {
        keepaliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && !mediaRecorderRef.current) {
            ws.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, 8000);
      };
      ws.onerror = () => { wsRef.current = null; };
      ws.onclose = () => {
        clearKeepalive();
        if (!mediaRecorderRef.current) prewarm();
      };
    } catch { /* silently fail */ }
  }, [openFreshWs, clearKeepalive]);

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

  const playReadyTone = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch { /* silently fail */ }
  }, []);

  const startMediaRecorder = useCallback((ws: WebSocket) => {
    const stream = streamRef.current!;
    const mimeType = getSupportedMimeType();
    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
    };
    mediaRecorder.start(100);
    playReadyTone();
    setListening(true);
    resetSilenceTimer();
  }, [resetSilenceTimer]);

  // Called on mousedown/touchstart — kicks off WS early if not already ready
  const handlePressStart = useCallback(() => {
    if (listening || disabled) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      clearKeepalive();
      openFreshWs().catch(() => {});
    }
  }, [listening, disabled, clearKeepalive, openFreshWs]);

  const startListening = useCallback(async () => {
    if (listening) return;
    cancelledRef.current = false;
    transcriptRef.current = "";
    setTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const existingWs = wsRef.current;
      if (existingWs && existingWs.readyState === WebSocket.OPEN) {
        clearKeepalive();
        attachWsHandlers(existingWs);
        startMediaRecorder(existingWs);
      } else {
        // WS is connecting (started by mousedown) — wait for open
        const ws = existingWs ?? await openFreshWs();
        wsRef.current = ws;
        attachWsHandlers(ws);
        ws.onopen = () => startMediaRecorder(ws);
      }
    } catch {
      setListening(false);
      cleanup();
    }
  }, [listening, attachWsHandlers, startMediaRecorder, cleanup, clearKeepalive, openFreshWs]);

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
          onMouseDown={handlePressStart}
          onTouchStart={handlePressStart}
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
