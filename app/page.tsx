'use client';

import { useState } from 'react';
import Script from '../components/Script';

// Helper function to calculate word count
const calculateWordCount = (script: { text: string }[]) => {
  return script.reduce((count, line) => count + line.text.split(/\s+/).length, 0);
};

export default function Home() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('4');
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
    } catch (error: unknown) {
      console.error('Error generating or improving script:', error);
      console.log('An error occurred while generating or improving the script. Please try again.');
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
    setIsLoading(false);
    console.log('Script generation process completed.');
  };

  const toggleInitialScript = () => {
    setIsInitialScriptVisible(!isInitialScriptVisible);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Générateur de Script de Podcast</h1>
      <div className="w-full max-w-md">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Entrez le sujet du podcast"
          className="w-full p-2 mb-4 border border-gray-300 rounded"
        />
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 rounded"
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
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Génération en cours...' : 'Générer le script'}
        </button>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {initialScript && (
        <div className="mt-8 w-full max-w-2xl">
          <button
            onClick={toggleInitialScript}
            className="mb-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
          >
            {isInitialScriptVisible ? 'Masquer' : 'Afficher'} le script initial
          </button>
          {isInitialScriptVisible && (
            <div className="border p-4 rounded">
              <h2 className="text-2xl font-bold mb-4">
                Script initial : 
                <span className="text-sm font-normal ml-2">
                  ({calculateWordCount(initialScript)} mots)
                </span>
              </h2>
              <Script script={initialScript} />
            </div>
          )}
        </div>
      )}
      {improvedScript && (
        <div className="mt-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">
            Script amélioré : 
            <span className="text-sm font-normal ml-2">
              ({calculateWordCount(improvedScript)} mots)
            </span>
          </h2>
          <Script script={improvedScript} />
        </div>
      )}
    </main>
  );
}
