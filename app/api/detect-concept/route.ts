import { NextResponse } from 'next/server';
import type { LanguageModelV3Prompt } from '@ai-sdk/provider';
import { createAnthropic } from '@ai-sdk/anthropic';

type Body = {
  userMessage: string;
};

export async function POST(req: Request) {
  const body: Body = await req.json();
  const { userMessage } = body;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
  }

  const client = createAnthropic({ apiKey: anthropicKey });
  const model = client('claude-sonnet-4-5');

  const prompt: LanguageModelV3Prompt = [
    {
      role: 'system',
      content:
        'Extract the study subject and concept from the user message. Return ONLY a JSON object with exactly two fields: subject (string) and concept (string). If the message is not about studying or a concept, return subject: "" and concept: "".',
    },
    { role: 'user', content: [{ type: 'text', text: userMessage }] },
  ];

  try {
    const res = await model.doGenerate({ prompt, maxOutputTokens: 180 });

    const text = res.content
      .map((part: any) => (typeof part === 'string' ? part : part?.text ?? ''))
      .join('')
      .trim();

    // Try to find a JSON substring
    let jsonText = text;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = text.slice(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(jsonText);
      const subject = typeof parsed.subject === 'string' ? parsed.subject : '';
      const concept = typeof parsed.concept === 'string' ? parsed.concept : '';
      return NextResponse.json({ subject, concept });
    } catch (err) {
      return NextResponse.json({ subject: '', concept: '' });
    }
  } catch (err) {
    console.error('Anthropic error:', err);
    return NextResponse.json({ subject: '', concept: '' }, { status: 500 });
  }
}

export const runtime = 'edge';
