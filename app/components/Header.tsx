"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Header() {
  const [isAnimal, setIsAnimal] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') === 'animal';
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = stored || prefersDark;
      if (initial) document.body.classList.add('animal-theme');
      setIsAnimal(initial);
    } catch (e) {
      // ignore (SSR safety)
    }
  }, []);

  function toggle() {
    const next = !isAnimal;
    setIsAnimal(next);
    if (next) document.body.classList.add('animal-theme');
    else document.body.classList.remove('animal-theme');
    try {
      localStorage.setItem('theme', next ? 'animal' : 'default');
    } catch {}
  }

  return (
    <header className="header w-full flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black"
          style={{ background: 'var(--accent-1, #ffd166)' }}
        >
          N
        </div>
        <Link href="/" className="text-lg font-semibold">
          Study Agent
        </Link>
      </div>

      <nav className="flex items-center gap-6">
        <Link href="/chat" className="text-sm opacity-80 hover:opacity-100">
          Chat
        </Link>
        <Link href="/dashboard" className="text-sm opacity-80 hover:opacity-100">
          Dashboard
        </Link>
        <button
          aria-label="Toggle animal theme"
          onClick={toggle}
          className="ml-2 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          {isAnimal ? 'Animal On' : 'Animal Off'}
        </button>
      </nav>
    </header>
  );
}
