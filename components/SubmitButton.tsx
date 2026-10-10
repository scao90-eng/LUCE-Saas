'use client';

import { useFormStatus } from 'react-dom';

// Bottone che si disattiva e cambia testo durante le azioni lunghe (es. chiamate AI).
export default function SubmitButton({ children, pendingText, disabled = false }: { children: React.ReactNode; pendingText: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn pri" type="submit" disabled={disabled || pending}>{pending ? pendingText : children}</button>;
}
