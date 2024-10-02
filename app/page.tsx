'use client';

import { useState } from 'react';
import Script from '../components/Script';

// Helper function to calculate word count
const calculateWordCount = (script: { text: string }[]) => {
  return script.reduce((count, line) => count + line.text.split(/\s+/).length, 0);
};

export default function Home() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('4'); // Default to 4 minutes
  const [initialScript, setInitialScript] = useState(null);
  const [improvedScript, setImprovedScript] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitialScriptVisible, setIsInitialScriptVisible] = useState(false);

  const durationOptions = [
    { value: '2', label: '2 minutes (environ 250 mots)' },
    { value: '4', label: '4 minutes (environ 500 mots)' },
    { value: '6', label: '6 minutes (environ 750 mots)' },
  ];

  const generateScript = async () => {
    setIsLoading(true);
    setError('');
    setInitialScript(null);
    setImprovedScript(null);
    setIsInitialScriptVisible(false);

    try {
      if (!topic.trim()) {
        throw new Error('Please enter a topic');
      }

      if (!duration) {
        throw new Error('Please select a duration');
      }

      console.log(`Generating script for topic: "${topic}", duration: ${duration} minutes`);

      // Generate initial script
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, duration }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate initial script');
      }

      setInitialScript(data.script);

      // Validate and improve the script
      const improvedResponse = await fetch('/api/validate-and-improve-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: data.script, duration }),
      });
      const improvedData = await improvedResponse.json();

      if (!improvedResponse.ok) {
        throw new Error(improvedData.error || 'Failed to improve script');
      }

      setImprovedScript(improvedData.script);

      // Add logs to display the first few dialogue lines of the generated script
      console.log('First few dialogue lines of the improved script:');
      console.log(JSON.stringify(improvedData.script.slice(0, 3), null, 2));

    } catch (error: unknown) {
      console.error('Error generating or improving script:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
      console.log('Script generation process completed.');
    }
  };

  const toggleInitialScript = () => {
    setIsInitialScriptVisible(!isInitialScriptVisible);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold mb-8">Script Generator and Text-to-Speech</h1>
      </div>
      <div className="w-full max-w-2xl">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter topic"
          className="w-full p-2 mb-4 border rounded"
        />
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        >
          {durationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          onClick={generateScript}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Script'}
        </button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        {improvedScript && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Generated Script</h2>
            <Script script={improvedScript} />
            <button
              onClick={toggleInitialScript}
              className="mt-4 bg-gray-200 text-gray-800 p-2 rounded hover:bg-gray-300 transition-colors"
            >
              {isInitialScriptVisible ? 'Hide' : 'Show'} Initial Script
            </button>
            {isInitialScriptVisible && initialScript && (
              <div className="mt-4">
                <h3 className="text-xl font-bold mb-2">Initial Script</h3>
                <Script script={initialScript} />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}