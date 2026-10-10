import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import ContentCard, { type ContentItem } from '@/components/ContentCard';
import { requireSession } from '@/lib/session';
import { generateReel } from './actions';

export const maxDuration = 120;

export default async function ReelStudio({ searchParams }: { searchParams: { tema?: string; ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  const { data } = await supabase.from('content_items').select('*').eq('format', 'reel').not('script', 'is', null)
    .order('created_at', { ascending: false }).limit(20);
  const reels = (data ?? []) as ContentItem[];

  return (
    <>
      <PageHeader title="Studio reel" sub="Script scena per scena, testi a schermo e consigli di ripresa" />
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <form action={generateReel} className="card pad">
          <h3>Nuovo reel</h3>
          <div className="form-grid">
            <div className="form-full"><label className="fld" htmlFor="tema">Tema</label>
              <input className="fin" id="tema" name="tema" defaultValue={searchParams.tema} required placeholder="es. 3 posizioni di yoga per chi lavora al computer" /></div>
            <div><label className="fld" htmlFor="durata">Durata</label>
              <select className="fin" id="durata" name="durata" defaultValue="30"><option value="15">15 secondi</option><option value="30">30 secondi</option><option value="60">60 secondi</option><option value="90">90 secondi</option></select></div>
            <div><label className="fld" htmlFor="stile">Stile</label>
              <select className="fin" id="stile" name="stile"><option>parlato in camera</option><option>voce fuori campo su riprese</option><option>tutorial passo passo</option><option>trend con testo a schermo</option><option>dietro le quinte</option></select></div>
            <div><label className="fld" htmlFor="planned_for">Da pubblicare il</label><input className="fin" type="date" id="planned_for" name="planned_for" /></div>
          </div>
          <div className="form-actions"><button className="btn pri" type="submit">▶ Scrivi lo script</button></div>
        </form>

        <div className="sec-label">I tuoi script</div>
        {reels.length ? <div className="grid g2">{reels.map((c) => <ContentCard key={c.id} c={c} />)}</div>
          : <div className="card empty"><h3>Nessuno script</h3><p>Scrivi un tema e Luce prepara il reel scena per scena, pronto da girare con lo smartphone.</p></div>}
      </div>
    </>
  );
}
