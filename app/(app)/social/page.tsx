import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { SimpleBars } from '@/components/Bars';
import { requireSession } from '@/lib/session';
import { engagement, formatPerformance, bestWeekday, followerGrowth, type Post, type Snapshot } from '@/lib/insights';
import { num, pct, dateIt, today } from '@/lib/format';
import { addSnapshot, addPost, deletePost } from './actions';
import { analyzeFromLink, analyzeFromScreenshots } from './analisi-actions';
import ScreenshotUpload from '@/components/ScreenshotUpload';
import SubmitButton from '@/components/SubmitButton';
import { igConfigured } from '@/lib/instagram';

export const maxDuration = 120;

export default async function Social({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const { supabase, profile } = await requireSession();
  const [{ data: snaps }, { data: posts }, { data: audits }] = await Promise.all([
    supabase.from('social_snapshots').select('*').eq('platform', 'instagram').order('taken_on').limit(52),
    supabase.from('social_posts').select('*').order('published_on', { ascending: false }).limit(100),
    supabase.from('profile_audits').select('id,username,is_own,source,created_at,audit').order('created_at', { ascending: false }).limit(6),
  ]);
  const linkOn = igConfigured();
  const sn = (snaps ?? []) as Snapshot[];
  const ps = (posts ?? []) as (Post & { id: string; url: string | null })[];
  const last = sn[sn.length - 1];
  const growth = followerGrowth(sn);
  const perf = formatPerformance(ps);
  const avgEr = ps.length ? ps.reduce((s, p) => s + engagement(p), 0) / ps.length : 0;
  const day = bestWeekday(ps);
  const conv = last?.profile_visits && last.link_clicks != null ? last.link_clicks / last.profile_visits : null;

  return (
    <>
      <PageHeader title="Analisi profilo" sub={profile.instagram_handle ? `Instagram @${profile.instagram_handle.replace(/^@/, '')}` : 'Instagram'} />
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <div className="grid g2" style={{ marginBottom: 14, alignItems: 'start' }}>
          <form action={analyzeFromLink} className="card pad">
            <h3>Analizza un profilo dal link</h3>
            <p className="muted small">Il tuo profilo o uno di riferimento. Luce legge i dati pubblici (follower, ultimi 30 contenuti, interazioni, bio) e ti restituisce un&apos;analisi con idee pronte.</p>
            <label className="fld" htmlFor="link">Link o nome profilo</label>
            <input className="fin" id="link" name="link" placeholder="instagram.com/nomeprofilo" defaultValue={profile.instagram_handle ?? ''} disabled={!linkOn} />
            <div className="form-actions"><SubmitButton pendingText="Analisi in corso…" disabled={!linkOn}>◎ Analizza</SubmitButton></div>
            {!linkOn && <p className="muted small">In attivazione: richiede il collegamento della piattaforma a Meta. Nel frattempo usa gli screenshot.</p>}
            <p className="muted small">Funziona con profili pubblici di tipo professionale (business o creator).</p>
          </form>
          <div className="card pad">
            <h3>Oppure carica gli screenshot</h3>
            <p className="muted small">Luce legge i numeri dalle schermate di Instagram, compresi quelli privati come copertura, salvataggi e visite, e li inserisce per te.</p>
            <ScreenshotUpload action={analyzeFromScreenshots} />
          </div>
        </div>

        {audits && audits.length > 0 && (
          <>
            <div className="sec-label">Analisi del profilo</div>
            <div className="card tbl-wrap" style={{ marginBottom: 14 }}>
              <table className="tbl"><tbody>
                {audits.map((a) => (
                  <tr key={a.id}>
                    <td><Link className="lnk" href={`/social/analisi/${a.id}`}>@{a.username}</Link> {a.is_own ? <span className="pill sage">tuo</span> : <span className="pill mut">riferimento</span>}</td>
                    <td className="muted">{dateIt(a.created_at)}</td>
                    <td className="r"><b>{(a.audit as { voto: number }).voto}/10</b></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </>
        )}

        <div className="grid g4">
          <div className="card kpi"><div className="lbl">Follower</div><div className="val">{last ? num(last.followers) : '—'}</div>
            <div className="cmp">{growth ? <span className={growth.delta >= 0 ? 'up' : 'down'}>{growth.delta >= 0 ? '+' : ''}{num(growth.delta)} · {pct(growth.pct)}</span> : 'servono 2 rilevazioni'}</div></div>
          <div className="card kpi"><div className="lbl">Engagement medio</div><div className="val">{ps.length ? pct(avgEr) : '—'}</div><div className="cmp">interazioni / copertura</div></div>
          <div className="card kpi"><div className="lbl">Formato migliore</div><div className="val" style={{ textTransform: 'capitalize' }}>{perf[0]?.format ?? '—'}</div><div className="cmp">{perf[0] ? `${pct(perf[0].avgEr)} di engagement` : 'aggiungi contenuti'}</div></div>
          <div className="card kpi"><div className="lbl">Giorno più forte</div><div className="val" style={{ textTransform: 'capitalize' }}>{day ?? '—'}</div><div className="cmp">{conv != null ? `${pct(conv)} visite → clic link` : 'per copertura media'}</div></div>
        </div>

        <div className="grid g2" style={{ marginTop: 14 }}>
          <div className="card pad">
            <h3>Crescita follower</h3>
            {sn.length ? <SimpleBars data={sn.slice(-12).map((s) => ({ label: dateIt(s.taken_on).slice(0, 6), value: s.followers, title: `${num(s.followers)} follower` }))} />
              : <p className="muted">Nessuna rilevazione ancora.</p>}
          </div>
          <div className="card pad">
            <h3>Rendimento per formato</h3>
            {perf.length ? (
              <table className="tbl">
                <thead><tr><th>Formato</th><th className="r">N.</th><th className="r">Copertura media</th><th className="r">Engagement</th><th className="r">Salvataggi</th></tr></thead>
                <tbody>{perf.map((f) => (
                  <tr key={f.format}><td style={{ textTransform: 'capitalize' }}>{f.format}</td><td className="r">{f.n}</td><td className="r">{num(Math.round(f.avgReach))}</td><td className="r">{pct(f.avgEr)}</td><td className="r">{f.avgSaves.toFixed(1)}</td></tr>
                ))}</tbody>
              </table>
            ) : <p className="muted">Registra i contenuti pubblicati per capire cosa funziona.</p>}
            {perf.length > 0 && <p className="small" style={{ marginTop: 10 }}><Link href="/co-conduzione"><b>Chiedi a Luce cosa fare questa settimana →</b></Link></p>}
          </div>
        </div>

        <div className="grid g2" style={{ marginTop: 14, alignItems: 'start' }}>
          <details className="card pad add" open={!sn.length}>
            <summary className="btn pri">+ Rilevazione profilo</summary>
            <form action={addSnapshot}>
              <input type="hidden" name="platform" value="instagram" />
              <div className="form-grid">
                <div><label className="fld" htmlFor="taken_on">Data</label><input className="fin" type="date" id="taken_on" name="taken_on" defaultValue={today()} /></div>
                <div><label className="fld" htmlFor="followers">Follower</label><input className="fin" id="followers" name="followers" inputMode="numeric" required /></div>
                <div><label className="fld" htmlFor="reach">Account raggiunti (7 gg)</label><input className="fin" id="reach" name="reach" inputMode="numeric" /></div>
                <div><label className="fld" htmlFor="profile_visits">Visite al profilo</label><input className="fin" id="profile_visits" name="profile_visits" inputMode="numeric" /></div>
                <div><label className="fld" htmlFor="link_clicks">Clic sul link</label><input className="fin" id="link_clicks" name="link_clicks" inputMode="numeric" /></div>
              </div>
              <div className="form-actions"><button className="btn pri" type="submit">Salva</button></div>
            </form>
          </details>
          <details className="card pad add" open={!ps.length}>
            <summary className="btn pri">+ Contenuto pubblicato</summary>
            <form action={addPost}>
              <input type="hidden" name="platform" value="instagram" />
              <div className="form-grid">
                <div><label className="fld" htmlFor="published_on">Pubblicato il</label><input className="fin" type="date" id="published_on" name="published_on" defaultValue={today()} required /></div>
                <div><label className="fld" htmlFor="format">Formato</label>
                  <select className="fin" id="format" name="format"><option value="reel">Reel</option><option value="carosello">Carosello</option><option value="post">Post</option><option value="storia">Storia</option></select></div>
                <div className="form-full"><label className="fld" htmlFor="topic">Tema</label><input className="fin" id="topic" name="topic" placeholder="es. 3 respiri per calmare l'ansia" /></div>
                <div><label className="fld" htmlFor="p_reach">Copertura</label><input className="fin" id="p_reach" name="reach" inputMode="numeric" /></div>
                <div><label className="fld" htmlFor="likes">Mi piace</label><input className="fin" id="likes" name="likes" inputMode="numeric" /></div>
                <div><label className="fld" htmlFor="comments">Commenti</label><input className="fin" id="comments" name="comments" inputMode="numeric" /></div>
                <div><label className="fld" htmlFor="saves">Salvataggi</label><input className="fin" id="saves" name="saves" inputMode="numeric" /></div>
                <div><label className="fld" htmlFor="shares">Condivisioni</label><input className="fin" id="shares" name="shares" inputMode="numeric" /></div>
                <div className="form-full"><label className="fld" htmlFor="url">Link (facoltativo)</label><input className="fin" id="url" name="url" type="url" /></div>
              </div>
              <div className="form-actions"><button className="btn pri" type="submit">Aggiungi</button></div>
            </form>
          </details>
        </div>

        <div className="sec-label">Contenuti analizzati</div>
        <div className="card tbl-wrap">
          {ps.length ? (
            <table className="tbl">
              <thead><tr><th>Data</th><th>Formato</th><th>Tema</th><th className="r">Copertura</th><th className="r">Interazioni</th><th className="r">Salv.</th><th className="r">ER</th><th /></tr></thead>
              <tbody>{ps.map((p) => {
                const er = engagement(p);
                return (
                  <tr key={p.id}>
                    <td>{dateIt(p.published_on)}</td>
                    <td><span className="pill sage">{p.format}</span></td>
                    <td>{p.url ? <a className="lnk" href={p.url} target="_blank" rel="noreferrer">{p.topic ?? 'apri'}</a> : p.topic}</td>
                    <td className="r">{num(p.reach)}</td>
                    <td className="r">{num(p.likes + p.comments + p.shares)}</td>
                    <td className="r">{num(p.saves)}</td>
                    <td className={`r ${er >= avgEr ? 'up' : ''}`}>{pct(er)}</td>
                    <td className="r"><form action={deletePost}><input type="hidden" name="id" value={p.id} /><button className="btn sm ghost" type="submit" aria-label="Elimina">✕</button></form></td>
                  </tr>
                );
              })}</tbody>
            </table>
          ) : <div className="empty"><h3>Nessun contenuto</h3><p>Aggiungi gli ultimi 10–15 contenuti pubblicati: bastano per vedere i primi schemi.</p></div>}
        </div>
      </div>
    </>
  );
}
