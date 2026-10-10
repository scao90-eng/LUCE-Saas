'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = 'Copia' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn sm" type="button" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    }}>{ok ? '✓ Copiato' : label}</button>
  );
}
