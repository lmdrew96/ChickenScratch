import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server-client';

const WRITING_CANON = [
  'poetry',
  'vignette',
  'flash fiction',
  'essay',
  'opinion piece',
  'free write',
  'interview',
  'colwell in context',
  'keeping up with keegan',
  'literary recommendation',
  'other writing',
];

const VISUAL_CANON = [
  'drawing',
  'painting',
  'photography',
  'digital art',
  'other visual art',
];

function canonize(s?: string | null) {
  return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCategory(type: 'writing' | 'visual', raw: string | null) {
  const v = canonize(raw);
  if (type === 'writing') {
    // accept common variants
    const map: Record<string, string> = {
      'poetry': 'poetry',
      'vignette': 'vignette',
      'flash fiction': 'flash fiction',
      'flash-fiction': 'flash fiction',
      'essay': 'essay',
      'opinion piece': 'opinion piece',
      'opinion': 'opinion piece',
      'free write': 'free write',
      'freewrite': 'free write',
      'interview': 'interview',
      'colwell in context': 'colwell in context',
      'keeping up with keegan': 'keeping up with keegan',
      'literary recommendation': 'literary recommendation',
      'other writing': 'other writing',
      'other': 'other writing',
    };
    const out = map[v];
    return out && WRITING_CANON.includes(out) ? out : null;
  } else {
    const map: Record<string, string> = {
      'drawing': 'drawing',
      'paint': 'painting',
      'painting': 'painting',
      'photography': 'photography',
      'photo': 'photography',
      'digital art': 'digital art',
      'digital-art': 'digital art',
      'other visual art': 'other visual art',
      'other visual': 'other visual art',
      'other': 'other visual art',
      'digital art ': 'digital art',
    };
    const out = map[v] ?? v;
    return VISUAL_CANON.includes(out) ? out : null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();

  const typeRaw = (form.get('kind') ?? form.get('type')) as string | null;
  const type = ((): 'writing' | 'visual' | null => {
    const v = canonize(typeRaw);
    if (v === 'writing') return 'writing';
    if (v === 'visual' || v === 'visual art' || v === 'art') return 'visual';
    return null;
  })();

  const category = normalizeCategory(type as any, (form.get('category') as string | null) ?? null);
  const preferred_name = (form.get('preferred_name') as string | null)?.toString().trim() || null;
  const title = (form.get('title') as string | null)?.toString().trim() || null;
  const summary = (form.get('summary') as string | null)?.toString().trim() || null;
  const content_warnings = (form.get('content_warnings') as string | null)?.toString().trim() || null;
  const text = (form.get('text') as string | null)?.toString().trim() || null;

  const file = form.get('file') as File | null;

  const errs: string[] = [];
  if (!type) errs.push('type');
  if (!category) errs.push('category');
  if (type === 'writing' && !text) errs.push('text');
  if (type === 'visual' && !file) errs.push('file');
  if (!preferred_name) errs.push('preferred_name');
  if (errs.length) {
    return NextResponse.json({ error: 'Invalid submission payload.', fields: errs }, { status: 400 });
  }

  // pull author name from profile (optional)
  let author_name: string | null = null;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!profErr && prof?.full_name) author_name = prof.full_name;

  // optional storage upload (visual only)
  let file_path: string | null = null;
  if (type === 'visual' && file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const key = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await supabase.storage.from('submissions').upload(key, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (up.error) {
      return NextResponse.json({ error: `upload: ${up.error.message}` }, { status: 500 });
    }
    file_path = up.data.path;
  }

  const row = {
    user_id: user.id,
    owner_id: user.id, // keep in sync with legacy constraint
    type,
    category,
    preferred_name,
    author_name,
    title,
    summary,
    content_warnings,
    text: type === 'writing' ? text : null,
    file_path,
  };

  const { error } = await supabase.from('submissions').insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}

export const dynamic = 'force-dynamic';