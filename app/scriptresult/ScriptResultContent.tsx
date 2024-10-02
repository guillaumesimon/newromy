"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon, MicrophoneIcon, PlayIcon } from '@heroicons/react/24/solid';
import { leo } from '@/app/data/leo';
import { romy } from '@/app/data/romy';

interface ScriptLine {
  id: number;
  speaker: string;
  text: string;
}

interface AudioState {
  isLoading: boolean;
  audioUrl: string | null;
  error: string | null;
}

export default function ScriptResultContent() {
  console.log("ScriptResultContent is rendering");

  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') || '';
  const duration = searchParams.get('duration') || '';
  const encodedScript = searchParams.get('script') || '';

  const [script, setScript] = useState<ScriptLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isJsonVisible, setIsJsonVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const [totalWords, setTotalWords] = useState(0);
  const [currentDuration, setCurrentDuration] = useState('');

  const [audioStates, setAudioStates] = useState<{ [key: number]: AudioState }>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log("ScriptResultContent useEffect is running");
    console.log("Encoded script:", encodedScript);
    if (encodedScript) {
      try {
        const decodedScript = JSON.parse(decodeURIComponent(encodedScript));
        console.log("Decoded script:", decodedScript);
        setScript(decodedScript);
      } catch (error) {
        console.error('Error decoding script:', error);
        setError('Failed to load the script. Please try again.');
      }
    }
  }, [encodedScript]);

  useEffect(() => {
    if (script.length > 0) {
      const words = script.reduce((acc, line) => acc + line.text.split(' ').length, 0);
      setTotalWords(words);
      const durationInMinutes = words / 150;
      setCurrentDuration(`${durationInMinutes.toFixed(1)} minutes`);
    }
  }, [script]);

  const handleBack = () => {
    console.log("Navigating back to homepage...");
    router.push('/');
  };

  const toggleJsonVisibility = () => {
    setIsJsonVisible(!isJsonVisible);
  };

  const toggleDetailsVisibility = () => {
    setIsDetailsVisible(!isDetailsVisible);
  };

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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800 transition-colors flex items-center"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Home
          </button>
          <h1 className="text-xl font-semibold text-gray-800 text-center flex-grow">
            {topic}
          </h1>
          <div className="w-24"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 pb-16">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-xl font-semibold text-gray-700">Generating script...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        ) : script.length > 0 ? (
          <>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <div className="max-w-2xl mx-auto">
                  {script.map((line) => {
                    const isLeo = normalizeString(line.speaker) === 'leo';
                    const audioState = audioStates[line.id] || { isLoading: false, audioUrl: null, error: null };
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
                </div>
              </div>
            </div>
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
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-8">
              <button
                onClick={toggleDetailsVisibility}
                className="w-full p-4 text-left font-semibold flex justify-between items-center"
              >
                <span>Script Details</span>
                {isDetailsVisible ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </button>
              {isDetailsVisible && (
                <div className="p-6 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-bold">Topic:</p>
                      <p>{topic}</p>
                    </div>
                    <div>
                      <p className="font-bold">Expected Duration:</p>
                      <p>{duration === 'short' ? '2 minutes' : duration === 'medium' ? '5 minutes' : '12 minutes'}</p>
                    </div>
                    <div>
                      <p className="font-bold">Total Words:</p>
                      <p>{totalWords}</p>
                    </div>
                    <div>
                      <p className="font-bold">Current Duration (estimated):</p>
                      <p>{currentDuration}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-4">
              <button
                onClick={toggleJsonVisibility}
                className="w-full p-4 text-left font-semibold flex justify-between items-center"
              >
                <span>View Original JSON</span>
                {isJsonVisible ? (
                  <ChevronUpIcon className="h-5 w-5" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5" />
                )}
              </button>
              {isJsonVisible && (
                <pre className="p-4 bg-gray-50 overflow-x-auto">
                  {JSON.stringify({ script }, null, 2)}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">No script generated. Please try again.</p>
          </div>
        )}
      </main>
    </div>
  );
}