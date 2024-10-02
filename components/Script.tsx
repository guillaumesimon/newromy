import React, { useState } from 'react';
import Image from 'next/image';
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';
import { MicrophoneIcon, PlayIcon, StopIcon } from '@heroicons/react/24/solid';

interface ScriptLine {
  id: number;
  speaker: string;
  text: string;
  audioUrl?: string;
}

interface ScriptProps {
  script: ScriptLine[];
}

interface AudioState {
  isLoading: boolean;
  audioUrl: string | null;
  error: string | null;  // Change this to allow null
}

export default function Script({ script }: ScriptProps) {
  const [audioStates, setAudioStates] = useState<{ [key: number]: AudioState }>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);

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
    setAudioStates(prev => ({
      ...prev,
      [index]: { isLoading: true, audioUrl: null, error: null }
    }));

    try {
      console.log(`Requesting audio generation for speaker: ${speaker}, text: "${text.substring(0, 30)}..."`);
      const response = await fetch('/api/generate-audio-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker: speaker.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();

      if (data.success && data.fileUrl) {
        setAudioStates(prev => ({
          ...prev,
          [index]: { isLoading: false, audioUrl: data.fileUrl, error: null }
        }));
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      setAudioStates(prev => ({ 
        ...prev, 
        [index]: { 
          isLoading: false, 
          audioUrl: null, 
          error: 'Failed to generate audio. Please try again.' 
        } 
      }));
    }
  };

  const generateAllAudio = async () => {
    console.log("Starting generation of all audio dialogues...");
    setGeneratingAll(true);
    setProgress(0);
    setCombinedAudioUrl(null);
    
    try {
      const topicId = `topic_${Date.now()}`; // Generate a unique topic ID
      const response = await fetch('/api/generate-audio-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialogues: script, topicId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate combined audio');
      }

      const data = await response.json();

      if (data.success && data.fileUrl) {
        setCombinedAudioUrl(data.fileUrl);
        console.log("Combined audio file generated successfully");
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error generating combined audio:', error);
    } finally {
      setGeneratingAll(false);
      setProgress(0);
    }
  };

  const cancelGenerateAllAudio = () => {
    console.log("Cancelling generation of all audio dialogues...");
    setGeneratingAll(false);
    setProgress(0);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {script.map((line) => {
        const isLeo = normalizeString(line.speaker) === 'leo';
        const audioState = audioStates[line.id] || { isLoading: false, audioUrl: null, error: undefined };

        return (
          <div key={line.id} className={`mb-8 flex items-start ${isLeo ? 'flex-row-reverse' : ''}`}>
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
              <div className="mt-2 flex flex-col">
                {audioState.audioUrl ? (
                  <audio controls className="w-full h-8 mt-2">
                    <source src={audioState.audioUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <button
                    onClick={() => handleGenerateAudio(line.text, line.speaker, line.id)}
                    disabled={audioState.isLoading}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center"
                  >
                    {audioState.isLoading ? (
                      'Generating...'
                    ) : (
                      <>
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Generate Audio
                      </>
                    )}
                  </button>
                )}
                {audioState.error && (
                  <p className="text-red-500 text-sm mt-1">{audioState.error}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="flex flex-col items-center mt-8">
        {combinedAudioUrl && (
          <div className="w-full mb-4">
            <h2 className="text-lg font-semibold mb-2">Combined Audio</h2>
            <audio controls className="w-full">
              <source src={combinedAudioUrl} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        
        {generatingAll ? (
          <div className="w-64 h-12 bg-gray-200 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium">
                Generating Combined Audio...
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={generateAllAudio}
            className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center"
          >
            <MicrophoneIcon className="h-5 w-5 mr-2" />
            <span>Generate Combined Audio</span>
          </button>
        )}
      </div>
    </div>
  );
}