// Messaggi di esito passati via querystring dalle server action (?ok=... / ?error=...).
export default function Flash({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  if (searchParams.error) return <div className="banner err" role="alert">{searchParams.error}</div>;
  if (searchParams.ok) return <div className="banner ok" role="status">{searchParams.ok}</div>;
  return null;
}
