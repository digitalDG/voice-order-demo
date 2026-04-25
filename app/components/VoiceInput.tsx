"use client";

import { useState, useRef, useCallback } from "react";


interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const cancelledRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SILENCE_DELAY = 2000;

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    transcriptRef.current = "";
    cancelledRef.current = false;
    setTranscript("");

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      transcriptRef.current = current;
      setTranscript(current);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        recognitionRef.current?.stop();
      }, SILENCE_DELAY);
    };

    recognition.onend = () => {
      setListening(false);
      if (!cancelledRef.current && transcriptRef.current) {
        onTranscript(transcriptRef.current);
      }
    };

    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancelListening = useCallback(() => {
    cancelledRef.current = true;
    transcriptRef.current = "";
    setTranscript("");
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
  }, []);

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
