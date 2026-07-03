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
  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [bubblePopped, setBubblePopped] = useState(false);
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
    setBubbleText(text || 'Hey, how are you?');
    setShowBubble(true);
    setBubblePopped(false);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.15),_transparent_30%),linear-gradient(180deg,#020617,#0f172a)] text-zinc-100 font-sans">
      <nav className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-sm shadow-slate-950/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Study Agent</p>
            <div className="text-lg font-semibold text-white">Friendly pastel chat</div>
          </div>
          <div className="flex gap-3 text-sm text-slate-300">
            <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:bg-white/10 hover:text-white">
              Chat
            </Link>
            <Link href="/dashboard" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:bg-white/10 hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto h-screen flex flex-col">
        <section className="mt-6 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-xl text-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Study companion</p>
              <h1 className="text-3xl font-semibold text-white">Ask anything, learn faster</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                A pastel chat studio to help you study smarter, keep ideas bright, and make learning feel fun.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm text-sky-200">Fast help</span>
              <span className="rounded-full bg-fuchsia-500/15 px-3 py-1 text-sm text-fuchsia-200">Soft style</span>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-200">Easy focus</span>
            </div>
          </div>
        </section>
        <main ref={listRef} className="chat-main relative flex-1 overflow-y-auto p-6 space-y-4">
          <div className="chat-decorations pointer-events-none">
            <span className="chat-shape shape-1" />
            <span className="chat-shape shape-2" />
            <span className="chat-shape shape-3" />
          </div>
          {showBubble && !bubblePopped ? (
            <button
              className="bubble-pop absolute left-8 top-16 z-10 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-2xl shadow-slate-900/20 transition-transform hover:-translate-y-1"
              onClick={() => setBubblePopped(true)}
            >
              {bubbleText}
            </button>
          ) : null}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`message-bubble ${m.role === 'user' ? 'user rounded-xl rounded-br-none' : 'assistant rounded-xl rounded-bl-none'}`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
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
          <div className="relative flex gap-3 items-center">
            <input
              className="flex-1 rounded-full border border-white/10 bg-slate-950/90 px-4 py-3 text-zinc-100 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/70 focus:ring-2 focus:ring-sky-400/20"
              placeholder="Type your study question or message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-500/20 transition hover:-translate-y-0.5 disabled:opacity-50"
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
