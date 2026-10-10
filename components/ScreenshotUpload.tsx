'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

// Ridimensiona gli screenshot nel browser (max 1400px, JPEG) prima dell'invio:
// restano leggibili per l'AI e stanno nei limiti di dimensione della richiesta.
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn pri" type="submit" disabled={disabled || pending}>{pending ? 'Lettura in corso…' : '◎ Leggi gli screenshot'}</button>;
}

export default function ScreenshotUpload({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setBusy(true);
    const picked = Array.from(e.target.files ?? []).slice(0, 6);
    setFiles(await Promise.all(picked.map(shrink)));
    setBusy(false);
  }

  return (
    <form action={(fd) => { fd.delete('shots'); files.forEach((f) => fd.append('shots', f)); return action(fd); }}>
      <label className="fld" htmlFor="shots">Screenshot (fino a 6)</label>
      <input className="fin" id="shots" name="shots" type="file" accept="image/*" multiple onChange={onPick} />
      <p className="muted small" style={{ marginTop: 6 }}>
        {busy ? 'Preparazione immagini…' : files.length ? `${files.length} immagini pronte` : 'Profilo, Dashboard professionale → Insight, e la schermata "Visualizza insight" dei singoli contenuti.'}
      </p>
      <div className="form-actions"><Submit disabled={busy || !files.length} /></div>
    </form>
  );
}
