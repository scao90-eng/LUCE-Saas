import { createClient } from '@/lib/supabase/server';
import { isDesign, type Slide } from '@/lib/carousel';

// Carosello + identità visiva del proprietario (la RLS garantisce che sia dell'utente).
export async function loadCarousel(id: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: item }, { data: profile }] = await Promise.all([
    supabase.from('content_items').select('id,title,slides,design').eq('id', id).maybeSingle(),
    supabase.from('profiles').select('business_name,instagram_handle,brand_color,carousel_design').eq('id', user.id).maybeSingle(),
  ]);
  const slides = (item?.slides ?? []) as Slide[];
  if (!item || !slides.length) return null;
  return {
    title: item.title as string,
    slides,
    design: isDesign(item.design) ? item.design : isDesign(profile?.carousel_design) ? profile!.carousel_design : 'crema',
    brand: /^#[0-9a-f]{6}$/i.test(profile?.brand_color ?? '') ? profile!.brand_color! : '#B8643F',
    handle: (profile?.instagram_handle ?? '').replace(/^@/, ''),
    business: profile?.business_name ?? '',
  };
}
