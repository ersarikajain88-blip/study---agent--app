"use client";

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  subject?: string;
  concept?: string;
  canSave?: boolean;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function appendMessage(m: Message) {
    setMessages((prev) => [...prev, m]);
  }

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    const userMsg: Message = { id: String(Date.now()) + '-u', role: 'user', content: text };
    appendMessage(userMsg);
    setSending(true);

    // Detect concept
    let detected = { subject: '', concept: '' };
    try {
      const dd = await fetch('/api/detect-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: text }),
      }).then((r) => r.json());
      detected.subject = dd.subject || '';
      detected.concept = dd.concept || '';
    } catch (err) {
      console.error('detect error', err);
    }

    // Add assistant placeholder
    const assistantId = String(Date.now()) + '-a';
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      subject: detected.subject,
      concept: detected.concept,
      canSave: false,
    };
    appendMessage(assistantMsg);

    // Stream chat response
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: text, subject: detected.subject, concept: detected.concept }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
        }
      }

      // After streaming completes, mark canSave if detection found subject+concept
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, canSave: Boolean(detected.subject && detected.concept), subject: detected.subject, concept: detected.concept }
            : m
        )
      );
    } catch (err) {
      console.error('chat stream error', err);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + '\n[Error]' } : m)));
    } finally {
      setSending(false);
    }
  }

  async function handleSave(msg: Message) {
    // Try to parse JSON block from assistant content
    const text = msg.content || '';
    let payload: any = {
      subject: msg.subject || '',
      concept: msg.concept || '',
      masteryLevel: null,
      overviewGist: text.slice(0, 400),
      deepDiveGist: [],
      strongAreas: msg.subject ? [] : [],
      weakAreas: msg.concept ? [] : [],
      nextSteps: [],
      notes: null,
    };

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonText = text.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonText);
        payload = {
          subject: parsed.subject ?? payload.subject,
          concept: parsed.concept ?? payload.concept,
          masteryLevel: parsed.masteryLevel ?? payload.masteryLevel,
          overviewGist: parsed.overviewGist ?? payload.overviewGist,
          deepDiveGist: parsed.deepDiveGist ?? payload.deepDiveGist,
          strongAreas: parsed.strongAreas ?? payload.strongAreas,
          weakAreas: parsed.weakAreas ?? payload.weakAreas,
          nextSteps: parsed.nextSteps ?? payload.nextSteps,
          notes: parsed.notes ?? payload.notes,
        };
      } catch (err) {
        // ignore parse errors
      }
    }

    try {
      await fetch('/api/save-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Optionally give feedback — append small system message
      appendMessage({ id: String(Date.now()) + '-s', role: 'assistant', content: 'Progress saved.' });
    } catch (err) {
      console.error('save error', err);
      appendMessage({ id: String(Date.now()) + '-s', role: 'assistant', content: 'Failed to save progress.' });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 font-sans">
      <nav className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-white">Study Agent</div>
          <div className="flex gap-3 text-sm text-zinc-300">
            <Link href="/" className="rounded-full px-3 py-1 hover:bg-zinc-800 hover:text-white">
              Chat
            </Link>
            <Link href="/dashboard" className="rounded-full px-3 py-1 hover:bg-zinc-800 hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto h-screen flex flex-col">
        <main ref={listRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-900">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`${m.role === 'user' ? 'bg-blue-900 text-white rounded-xl rounded-br-none p-3 max-w-[80%]' : 'bg-zinc-800 text-zinc-100 rounded-xl rounded-bl-none p-3 max-w-[80%]'}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
                {m.role === 'assistant' && m.canSave && m.subject && m.concept ? (
                  <div className="mt-2 flex justify-start">
                    <button
                      className="text-sm px-3 py-1 bg-zinc-700 rounded hover:bg-zinc-600"
                      onClick={() => handleSave(m)}
                    >
                      Save progress
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </main>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="px-6 py-4 border-t border-zinc-800 bg-zinc-900"
        >
          <div className="flex gap-3">
            <input
              className="flex-1 bg-zinc-800 text-zinc-100 rounded px-4 py-2 focus:outline-none"
              placeholder="Type your study question or message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
