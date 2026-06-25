import { NextResponse } from 'next/server';
import createSupabaseClient from '../../../lib/supabase';

type Body = {
  subject: string;
  concept: string;
  masteryLevel?: string;
  overviewGist?: string | null;
  deepDiveGist?: string[];
  strongAreas?: string[];
  weakAreas?: string[];
  nextSteps?: string[];
  notes?: string | null;
};

export async function POST(req: Request) {
  const body: Body = await req.json();
  const { subject, concept } = body;

  if (!subject || !concept) {
    return NextResponse.json({ error: 'subject and concept are required' }, { status: 400 });
  }

  const supabase = createSupabaseClient();

  const row = {
    subject,
    concept,
    mastery_level: body.masteryLevel ?? null,
    overview_gist: body.overviewGist ?? null,
    deep_dive_gist: body.deepDiveGist ?? [],
    strong_areas: body.strongAreas ?? [],
    weak_areas: body.weakAreas ?? [],
    next_steps: body.nextSteps ?? [],
    notes: body.notes ?? null,
    last_updated: new Date().toISOString(),
  } as any;

  try {
    const { data, error } = await supabase
      .from('concepts')
      .upsert([row], { onConflict: ['subject', 'concept'] });

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
