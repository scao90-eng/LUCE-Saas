import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { requireSession } from '@/lib/session';
import { num, pct, dateIt } from '@/lib/format';
import type { PublicStats } from '@/lib/instagram';
import type { Audit } from '../../analisi-actions';

export default async function AuditPage({ params }: { params: { id: string } }) {
  const { supabase } = await requireSession();
  const { data } = await supabase.from('profile_audits').select('*').eq('id', params.id).maybeSingle();
  if (!data) notFound();
  const a = data.audit as Audit;
  const s = data.stats as Partial<PublicStats>;

  return (
    <>
      <PageHeader title={`Analisi di @${data.username}`} sub={`${data.is_own ? 'Il tuo profilo' : 'Profilo di riferimento'} · ${dateIt(data.created_at)}`}>
        <Link className="btn sm" href="/social">← Analisi profilo</Link>
      </PageHeader>
      <div className="wrap">
        {s.followers != null && (
          <div className="grid g4">
            <div className="card kpi"><div className="lbl">Follower</div><div className="val">{num(s.followers)}</div><div className="cmp">{num(s.mediaCount ?? 0)} contenuti pubblicati</div></div>
            <div className="card kpi"><div className="lbl">Engagement medio</div><div className="val">{pct(s.avgEr ?? 0)}</div><div className="cmp">{Math.round(s.avgLikes ?? 0)} like · {Math.round(s.avgComments ?? 0)} commenti a post</div></div>
            <div className="card kpi"><div className="lbl">Frequenza</div><div className="val">{s.postsPerWeek != null ? s.postsPerWeek.toFixed(1) : '—'}</div><div className="cmp">contenuti a settimana</div></div>
            <div className="card kpi"><div className="lbl">Formato più forte</div><div className="val" style={{ textTransform: 'capitalize' }}>{s.formats?.[0]?.format ?? '—'}</div><div className="cmp">{s.bestDay ? `giorno migliore: ${s.bestDay}` : ''}</div></div>
          </div>
        )}

        <div className="grid g2" style={{ marginTop: 14, alignItems: 'start' }}>
          <div className="card pad">
            <div className="row-between"><h3>Valutazione</h3><span className="pill acc" style={{ fontSize: 14 }}>{a.voto}/10</span></div>
            <p>{a.sintesi}</p>
            <h3 style={{ marginTop: 16 }}>Bio</h3>
            {s.biography && <p className="muted small" style={{ whiteSpace: 'pre-line' }}>Attuale: {s.biography}</p>}
            <p style={{ marginTop: 6 }}>{a.bio.valutazione}</p>
            <div className="content-card" style={{ padding: 0, marginTop: 8 }}><pre>{a.bio.proposta}</pre></div>
          </div>
          <div className="card pad">
            <h3>Cosa funziona</h3>
            <ul style={{ paddingLeft: 18 }}>{a.punti_forza.map((p, i) => <li key={i}>{p}</li>)}</ul>
            <h3 style={{ marginTop: 16 }}>Da migliorare</h3>
            <ul style={{ paddingLeft: 18 }}>{a.criticita.map((p, i) => <li key={i}>{p}</li>)}</ul>
            <h3 style={{ marginTop: 16 }}>Frequenza consigliata</h3>
            <p>{a.frequenza_consigliata}</p>
          </div>
        </div>

        <div className="sec-label">Pilastri editoriali consigliati</div>
        <div className="grid g3">
          {a.pilastri_consigliati.map((p, i) => <div key={i} className="card action-card"><h4>{p.nome}</h4><p className="small">{p.descrizione}</p></div>)}
        </div>

        <div className="grid g2" style={{ marginTop: 14, alignItems: 'start' }}>
          <div className="card pad">
            <h3>Caroselli da creare</h3>
            {a.idee_caroselli.map((c, i) => (
              <div key={i} className="row-between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                <div><b>{c.titolo}</b><div className="muted small">{c.perche}</div></div>
                <Link className="btn sm" href={`/caroselli?tema=${encodeURIComponent(c.titolo)}`}>Crea le slide</Link>
              </div>
            ))}
          </div>
          <div className="card pad">
            <h3>Reel da girare</h3>
            {a.idee_reel.map((c, i) => (
              <div key={i} className="row-between" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                <div><b>{c.titolo}</b><div className="muted small">{c.perche}</div></div>
                <Link className="btn sm" href={`/reel?tema=${encodeURIComponent(c.titolo)}`}>Scrivi lo script</Link>
              </div>
            ))}
          </div>
        </div>

        {s.top && s.top.length > 0 && (
          <>
            <div className="sec-label">Contenuti con più interazioni</div>
            <div className="card tbl-wrap">
              <table className="tbl"><tbody>
                {s.top.map((t, i) => (
                  <tr key={i}>
                    <td><span className="pill sage">{t.format}</span></td>
                    <td>{t.permalink ? <a className="lnk" href={t.permalink} target="_blank" rel="noreferrer">{t.caption.slice(0, 90) || 'apri'}</a> : t.caption.slice(0, 90)}</td>
                    <td className="r">{num(t.likes)} ♥ · {num(t.comments)} 💬</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
