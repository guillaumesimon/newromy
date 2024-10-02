"use client";

import { Suspense } from 'react';
import ScriptResultContent from './ScriptResultContent';

export default function ScriptResultPage() {
  console.log("ScriptResultPage is rendering");

  return (
    <div className="min-h-screen bg-gray-100">
      <Suspense fallback={<div className="p-4 text-center">Loading ScriptResultContent...</div>}>
        <ScriptResultContent />
      </Suspense>
    </div>
  );
}