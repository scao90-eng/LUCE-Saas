import Link from 'next/link';
import { dateIt } from '@/lib/format';
import { setContentStatus, deleteContent } from '@/app/(app)/contenuti/actions';

export type Scene = { secondi: string; visivo: string; testo_schermo: string; voce: string };
export type ContentItem = {
  id: string; format: string; title: string; pillar: string | null; hook: string | null; caption: string | null;
  hashtags: string | null; planned_for: string | null; status: string; slides?: unknown[] | null;
  script: { durata_secondi?: number; scene?: Scene[]; audio?: string; cta?: string; consigli_ripresa?: string } | null;
};

const STATUS = ['idea', 'pronto', 'pubblicato'] as const;
const STATUS_PILL: Record<string, string> = { idea: 'mut', pronto: 'acc', pubblicato: 'ok' };

export default function ContentCard({ c }: { c: ContentItem }) {
  return (
    <div className="card content-card">
      <div className="row-between">
        <div className="toolbar">
          <span className="pill sage">{c.format}</span>
          {c.pillar && <span className="pill mut">{c.pillar}</span>}
          <span className={`pill ${STATUS_PILL[c.status]}`}>{c.status}</span>
        </div>
        {c.planned_for && <span className="muted small">{dateIt(c.planned_for)}</span>}
      </div>
      <h4>{c.title}</h4>
      {c.hook && <p className="hook">“{c.hook}”</p>}

      {c.script?.scene?.length ? (
        <div>
          {c.script.scene.map((s, i) => (
            <div className="scene" key={i}>
              <div className="t">{s.secondi}</div>
              <div>
                <div><span className="k">Inquadratura</span> {s.visivo}</div>
                {s.testo_schermo && <div><span className="k">Testo a schermo</span> {s.testo_schermo}</div>}
                {s.voce && <div><span className="k">Voce</span> {s.voce}</div>}
              </div>
            </div>
          ))}
          {c.script.audio && <p className="small"><b>Audio:</b> {c.script.audio}</p>}
          {c.script.consigli_ripresa && <p className="small"><b>Ripresa:</b> {c.script.consigli_ripresa}</p>}
        </div>
      ) : null}

      {c.caption && <pre>{c.caption}</pre>}
      {c.hashtags && <div className="tags">{c.hashtags}</div>}

      <div className="toolbar" style={{ marginTop: 4 }}>
        {STATUS.filter((s) => s !== c.status).map((s) => (
          <form key={s} action={setContentStatus}>
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={s} />
            <button className="btn sm" type="submit">→ {s}</button>
          </form>
        ))}
        {c.format === 'reel' && !c.script?.scene?.length && (
          <Link className="btn sm" href={`/reel?tema=${encodeURIComponent(c.title)}`}>▶ Crea lo script</Link>
        )}
        {c.format === 'carosello' && (c.slides?.length
          ? <Link className="btn sm" href={`/caroselli/${c.id}`}>▦ Vedi le slide</Link>
          : <Link className="btn sm" href={`/caroselli?tema=${encodeURIComponent(c.title)}&da=${c.id}`}>▦ Crea le slide</Link>)}
        <form action={deleteContent}><input type="hidden" name="id" value={c.id} /><button className="btn sm ghost" type="submit">Elimina</button></form>
      </div>
    </div>
  );
}
