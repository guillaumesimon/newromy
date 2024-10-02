"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const Script = dynamic(() => import('@/components/Script'), { ssr: false });

interface ScriptLine {
  id: number;
  speaker: string;
  text: string;
}

export default function ScriptResultContent() {
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

  // The rest of your component remains the same...
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ... (rest of your JSX) ... */}
    </div>
  );
}