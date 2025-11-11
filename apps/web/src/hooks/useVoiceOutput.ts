/**
 * useVoiceOutput Hook
 *
 * Custom hook for text-to-speech using Web Speech API
 * Provides voice output functionality for chat messages
 */

import { useCallback, useEffect, useState } from 'react';

interface UseVoiceOutputOptions {
  rate?: number; // 0.1 to 10 (default 1)
  pitch?: number; // 0 to 2 (default 1)
  volume?: number; // 0 to 1 (default 1)
  voice?: SpeechSynthesisVoice | null;
  language?: string;
}

interface UseVoiceOutputReturn {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useVoiceOutput({
  rate = 1,
  pitch = 1,
  volume = 1,
  voice = null,
  language = 'en-US',
}: UseVoiceOutputOptions = {}): UseVoiceOutputReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Check if Web Speech API is supported and load voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    setIsSupported(!!synth);

    if (synth) {
      // Load voices
      const loadVoices = () => {
        const availableVoices = synth.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      // Chrome loads voices asynchronously
      if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
      }

      // Check speaking state periodically
      const intervalId = setInterval(() => {
        setIsSpeaking(synth.speaking);
        setIsPaused(synth.paused);
      }, 100);

      return () => {
        clearInterval(intervalId);
        synth.cancel();
      };
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) {
        console.error('Speech synthesis is not supported in your browser.');
        return;
      }

      const synth = window.speechSynthesis;

      // Cancel any ongoing speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = language;

      // Set voice if specified, otherwise use default for language
      if (voice) {
        utterance.voice = voice;
      } else {
        const defaultVoice = voices.find((v) => v.lang.startsWith(language));
        if (defaultVoice) {
          utterance.voice = defaultVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      synth.speak(utterance);
    },
    [isSupported, rate, pitch, volume, voice, language, voices]
  );

  const pause = useCallback(() => {
    if (isSupported && isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    speak,
    pause,
    resume,
    stop,
  };
}
