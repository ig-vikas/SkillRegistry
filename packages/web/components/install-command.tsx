'use client';

import { useState } from 'react';

interface InstallCommandProps {
  name: string;
}

export function InstallCommand({ name }: InstallCommandProps) {
  const cmd = `npx skillregistry add ${name}`;
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="w-full rounded bg-zinc-800 px-3 py-2 text-left font-mono text-xs text-zinc-300 hover:bg-zinc-700"
      aria-label={`Copy install command for ${name}`}
    >
      {copied ? 'Copied!' : cmd}
    </button>
  );
}
