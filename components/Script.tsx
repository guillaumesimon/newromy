import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';

interface ScriptLine {
  speaker: string;
  text: string;
}

interface ScriptProps {
  script: ScriptLine[];
}

export default function Script({ script }: ScriptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const audioBuffersRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      audioContextRef.current?.close();
      websocketRef.current?.close();
    };
  }, []);

  const handleTextToSpeech = async (text: string, speaker: string, index: number) => {
    setIsLoading(true);
    setCurrentPlayingIndex(index);
    setError(null);
    audioBuffersRef.current = [];

    try {
      console.log('Sending TTS request to server');
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: speaker.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audio');
      }

      if (data.success && data.websocketUrl && data.ttsRequest) {
        console.log('Connecting to WebSocket...');
        websocketRef.current = new WebSocket(data.websocketUrl);

        websocketRef.current.onopen = () => {
          console.log('WebSocket connected');
          websocketRef.current?.send(JSON.stringify(data.ttsRequest));
        };

        websocketRef.current.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'chunk' && message.data) {
            const audioData = atob(message.data);
            const audioBuffer = new Float32Array(audioData.length / 2);
            for (let i = 0; i < audioBuffer.length; i++) {
              const int16 = (audioData.charCodeAt(i * 2) & 0xff) | ((audioData.charCodeAt(i * 2 + 1) & 0xff) << 8);
              audioBuffer[i] = int16 >= 0x8000 ? -(65536 - int16) / 32768 : int16 / 32767;
            }
            audioBuffersRef.current.push(audioBuffer);
            await playAudioChunk(audioBuffer, data.sampleRate);
          } else if (message.done) {
            console.log('Audio streaming completed');
            websocketRef.current?.close();
          }
        };

        websocketRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Error in audio streaming');
        };

        websocketRef.current.onclose = () => {
          console.log('WebSocket closed');
          setIsLoading(false);
          setCurrentPlayingIndex(null);
        };
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsLoading(false);
      setCurrentPlayingIndex(null);
    }
  };

  const playAudioChunk = async (audioBuffer: Float32Array, sampleRate: number) => {
    if (!audioContextRef.current) return;

    const buffer = audioContextRef.current.createBuffer(1, audioBuffer.length, sampleRate);
    buffer.getChannelData(0).set(audioBuffer);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.start(0);
  };

  const normalizeString = (str: string) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const getAvatar = (speaker: string) => {
    const normalizedSpeaker = normalizeString(speaker);
    return normalizedSpeaker === 'leo' ? '/avatars/leo.png' : '/avatars/romy.png';
  };

  const getCharacterName = (speaker: string) => {
    const normalizedSpeaker = normalizeString(speaker);
    return normalizedSpeaker === 'leo' ? leo.name : romy.name;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {script.map((line, index) => {
        const isLeo = normalizeString(line.speaker) === 'leo';
        return (
          <div key={index} className={`mb-8 flex items-start ${isLeo ? 'flex-row-reverse' : ''}`}>
            <div className={`flex flex-col items-center ${isLeo ? 'ml-4' : 'mr-4'}`}>
              <Image
                src={getAvatar(line.speaker)}
                alt={getCharacterName(line.speaker)}
                width={50}
                height={50}
                className="rounded-full"
              />
              <p className="text-center mt-2 text-sm font-semibold">{getCharacterName(line.speaker)}</p>
            </div>
            <div className={`flex-1 relative max-w-[70%] ${isLeo ? 'mr-4' : 'ml-4'}`}>
              <div className={`p-3 rounded-2xl ${isLeo ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                <p className="relative z-10">{line.text}</p>
              </div>
              <button
                onClick={() => handleTextToSpeech(line.text, line.speaker, index)}
                disabled={isLoading || currentPlayingIndex !== null}
                className={`mt-1 text-xs text-gray-400 hover:text-gray-600 transition-colors ${isLeo ? 'text-right w-full' : ''}`}
              >
                {isLoading && currentPlayingIndex === index ? 'Generating...' : currentPlayingIndex === index ? 'Playing' : 'Play'}
              </button>
            </div>
          </div>
        );
      })}
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}