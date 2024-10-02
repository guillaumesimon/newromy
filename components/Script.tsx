import React, { useState } from 'react';
import Image from 'next/image';
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';

interface ScriptLine {
  speaker: string;
  text: string;
  audioUrl?: string;
}

interface ScriptProps {
  script: ScriptLine[];
}

export default function Script({ script }: ScriptProps) {
  const [audioStates, setAudioStates] = useState<{ [key: number]: { isLoading: boolean; audioUrl: string | null } }>({});

  const normalizeString = (str: string) => {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const getAvatar = (speaker: string) => {
    const normalizedSpeaker = normalizeString(speaker);
    return normalizedSpeaker === 'leo' ? '/avatars/leo.png' : '/avatars/romy.png';
  };

  const getCharacterName = (speaker: string) => {
    const normalizedSpeaker = normalizeString(speaker);
    return normalizedSpeaker === 'leo' ? leo.name : romy.name;
  };

  const handleGenerateAudio = async (text: string, speaker: string, index: number) => {
    setAudioStates(prev => ({ ...prev, [index]: { isLoading: true, audioUrl: null } }));

    try {
      const response = await fetch('/api/generate-audio-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();

      if (data.success && data.fileUrl) {
        setAudioStates(prev => ({ ...prev, [index]: { isLoading: false, audioUrl: data.fileUrl } }));
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setAudioStates(prev => ({ ...prev, [index]: { isLoading: false, audioUrl: null } }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {script.map((line, index) => {
        const isLeo = normalizeString(line.speaker) === 'leo';
        const audioState = audioStates[index] || { isLoading: false, audioUrl: null };

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
              <div className="mt-2 flex justify-between items-center">
                {audioState.audioUrl ? (
                  <a
                    href={audioState.audioUrl}
                    download={`audio_${index}.wav`}
                    className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    Download .wav
                  </a>
                ) : (
                  <button
                    onClick={() => handleGenerateAudio(line.text, line.speaker, index)}
                    disabled={audioState.isLoading}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {audioState.isLoading ? 'Generating...' : 'Generate Audio'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}