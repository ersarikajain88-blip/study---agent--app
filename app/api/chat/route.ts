import { NextResponse } from 'next/server';
import type { LanguageModelV3Prompt } from '@ai-sdk/provider';
import createSupabaseClient from '../../../lib/supabase';
import { createAnthropic } from '@ai-sdk/anthropic';

type Body = {
  userMessage: string;
  subject?: string;
  concept?: string;
};

export async function POST(req: Request) {
  const body: Body = await req.json();
  const { userMessage, subject = '', concept = '' } = body;

  const supabase = createSupabaseClient();

  let row: any = null;
  if (subject && concept) {
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .eq('subject', subject)
      .eq('concept', concept)
      .limit(1);
    if (error) {
      console.error('Supabase error:', error);
    }
    if (data && data.length > 0) row = data[0];
  }

  // Build system prompt
  let systemPrompt = '';
  if (!row) {
    systemPrompt = `Mode A (Beginner): Use beginner-friendly language, start with an analogy, and define all terms. Provide clear, step-by-step explanations.`;
  } else {
    const mastery = row.mastery_level || '';
    const weak = row.weak_areas || '';
    const strong = row.strong_areas || '';

    const areasContext = `Weak areas: ${weak || 'None specified'}\nStrong areas: ${strong || 'None specified'}`;

    if (mastery === 'Introduced' || mastery === 'Developing') {
      systemPrompt = `Mode B (Intermediate): Reference prior knowledge, mention likely weak areas, and proceed at a moderate pace. ${areasContext}`;
    } else if (mastery === 'Proficient' || mastery === 'Strong') {
      systemPrompt = `Mode C (Advanced): Use technical language, skip basic definitions, and focus on nuance and edge cases. ${areasContext}`;
    } else {
      systemPrompt = `Mode B (Default intermediate): Reference prior knowledge, mention likely weak areas, and proceed at a moderate pace. ${areasContext}`;
    }
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  const client = createAnthropic({ apiKey: anthropicKey });
  const model = client('claude-sonnet-4-5');

  const prompt: LanguageModelV3Prompt = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: [{ type: 'text', text: userMessage }] },
  ];

  const streamResult = await model.doStream({
    prompt,
    maxOutputTokens: 600,
  });

  const encoder = new TextEncoder();
  const reader = streamResult.stream.getReader();

  const textStream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (value.type === 'text-delta' || value.type === 'reasoning-delta') {
            controller.enqueue(encoder.encode(value.delta));
          } else if (value.type === 'error') {
            controller.enqueue(encoder.encode('\n[Error streaming response]'));
            controller.error(value.error);
            return;
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode('\n[Error streaming response]'));
        console.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(textStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export const runtime = 'edge';
