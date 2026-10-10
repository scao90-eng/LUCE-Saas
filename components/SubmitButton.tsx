'use client';

import { useFormStatus } from 'react-dom';

// Bottone che si disattiva e cambia testo durante le azioni lunghe (es. chiamate AI).
export default function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return <button className="btn pri" type="submit" disabled={pending}>{pending ? pendingText : children}</button>;
}
