"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Script from '@/components/Script';
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

interface ScriptLine {
  id: number;
  speaker: string;
  text: string;
}

export default function ScriptResultPage() {
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

  useEffect(() => {
    if (encodedScript) {
      try {
        const decodedScript = JSON.parse(decodeURIComponent(encodedScript));
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
      // Assuming an average speaking rate of 150 words per minute
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
          <div className="w-24"></div> {/* This empty div balances the layout */}
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
                <Script script={script} />
              </div>
            </div>
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
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
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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