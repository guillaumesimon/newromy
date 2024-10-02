'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('short'); // Set default to 'short'
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("Submitting topic and duration to generate script...");

    try {
      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, duration }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script');
      }

      const data = await response.json();
      console.log("Script generated successfully");

      // Encode the script data
      const encodedScript = encodeURIComponent(JSON.stringify(data.script));

      // Navigate to the ScriptResult page with query parameters including the encoded script
      router.push(`/scriptresult?topic=${encodeURIComponent(topic)}&duration=${encodeURIComponent(duration)}&script=${encodedScript}`);
    } catch (error) {
      console.error('Error generating script:', error);
      // Handle error (e.g., show error message to user)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create a New Script</h1>
        <div className="mb-4">
          <label htmlFor="topic" className="block text-gray-700 font-medium mb-2">
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter the topic"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="duration" className="block text-gray-700 font-medium mb-2">
            Podcast Duration
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          >
            <option value="short">Short - 2min</option>
            <option value="medium">Medium - 5min</option>
            <option value="long">Long - 12min</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Script'}
        </button>
      </form>
    </div>
  );
}