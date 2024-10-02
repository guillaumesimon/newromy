"use client";

import { Suspense } from 'react';
import ScriptResultContent from './ScriptResultContent';

export default function ScriptResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScriptResultContent />
    </Suspense>
  );
}