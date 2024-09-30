import React from 'react';

interface DialogueLine {
  speaker: string;
  text: string;
}

interface ScriptProps {
  script: DialogueLine[];
}

const Script: React.FC<ScriptProps> = ({ script }) => {
  return (
    <div className="mt-8 w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Script généré :</h2>
      {script.map((line, index) => (
        <div key={index} className="mb-4">
          <span className="font-bold">{line.speaker}: </span>
          <span>{line.text}</span>
        </div>
      ))}
    </div>
  );
};

export default Script;