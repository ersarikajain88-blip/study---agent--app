import type { Metadata } from 'next';
import Link from 'next/link';
import createSupabaseClient from '../../lib/supabase';

type ConceptRow = {
  subject: string | null;
  concept: string | null;
  mastery_level: string | null;
  strong_areas: string[] | null;
  weak_areas: string[] | null;
  next_steps: string[] | null;
  last_updated: string | null;
};

const masteryScore = (level: string | null) => {
  switch (level) {
    case 'Strong':
      return 4;
    case 'Proficient':
      return 3;
    case 'Developing':
      return 2;
    case 'Introduced':
      return 1;
    default:
      return 0;
  }
};

const subjectStyle = (subject: string | null) => {
  switch (subject) {
    case 'Physics':
      return 'bg-blue-600 text-white';
    case 'Biology':
      return 'bg-emerald-600 text-white';
    case 'Mathematics':
      return 'bg-violet-600 text-white';
    case 'Computer Science':
      return 'bg-orange-600 text-white';
    case 'Chemistry':
      return 'bg-red-600 text-white';
    default:
      return 'bg-zinc-700 text-white';
  }
};

const masteryBadgeStyle = (level: string | null) => {
  switch (level) {
    case 'Strong':
      return 'bg-emerald-600 text-emerald-50';
    case 'Proficient':
      return 'bg-sky-600 text-sky-50';
    case 'Developing':
      return 'bg-amber-600 text-amber-50';
    case 'Introduced':
      return 'bg-violet-600 text-violet-50';
    default:
      return 'bg-zinc-700 text-zinc-200';
  }
};

const formatDate = (value: string | null) => {
  if (!value) return 'Never';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
};

export const metadata: Metadata = {
  title: 'Dashboard | Study Agent',
  description: 'Overview of studied concepts and mastery progress.',
};

export default async function DashboardPage() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.from('concepts').select('*');
  const rows = Array.isArray(data) ? data as ConceptRow[] : [];

  const totalConcepts = rows.length;
  const uniqueSubjects = new Set(rows.map((row) => row.subject || 'Unknown')).size;
  const averagePercent = totalConcepts
    ? Math.round(
        (rows.reduce((sum, row) => sum + masteryScore(row.mastery_level), 0) / (totalConcepts * 4)) * 100
      )
    : 0;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 font-sans">
      <nav className="border-b border-zinc-800 bg-zinc-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Concept progress overview</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">Total concepts</p>
              <p className="mt-3 text-3xl font-semibold text-white">{totalConcepts}</p>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">Unique subjects</p>
              <p className="mt-3 text-3xl font-semibold text-white">{uniqueSubjects}</p>
            </div>
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm text-zinc-400">Average mastery</p>
              <p className="mt-3 text-3xl font-semibold text-white">{averagePercent}%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {rows.map((row, index) => {
            const subject = row.subject || 'Unknown';
            const concept = row.concept || 'Untitled concept';
            const mastery = row.mastery_level || 'In Progress';
            const score = masteryScore(row.mastery_level) / 4;
            const strongAreas = Array.isArray(row.strong_areas) ? row.strong_areas : [];
            const weakAreas = Array.isArray(row.weak_areas) ? row.weak_areas : [];
            const nextSteps = Array.isArray(row.next_steps) ? row.next_steps : [];

            return (
              <details key={`${subject}-${concept}-${index}`} className="group rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-blue-500/40">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${subjectStyle(subject)}`}>
                          {subject}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${masteryBadgeStyle(mastery)}`}>
                          {mastery}
                        </span>
                      </div>
                      <h2 className="text-xl font-semibold text-white">{concept}</h2>
                      <div className="w-full max-w-md rounded-full bg-zinc-800 overflow-hidden h-2">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.round(score * 100)}%` }} />
                      </div>
                    </div>
                    <time className="text-sm text-zinc-500">Updated {formatDate(row.last_updated)}</time>
                  </div>
                </summary>
                <div className="mt-5 space-y-4 border-t border-zinc-800 pt-5 text-sm text-zinc-300">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Strong areas</p>
                      <div className="flex flex-wrap gap-2">
                        {strongAreas.length > 0 ? (
                          strongAreas.map((area) => (
                            <span key={area} className="rounded-full bg-emerald-700 px-3 py-1 text-xs text-emerald-100">
                              {area}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500">None listed</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Weak areas</p>
                      <div className="flex flex-wrap gap-2">
                        {weakAreas.length > 0 ? (
                          weakAreas.map((area) => (
                            <span key={area} className="rounded-full bg-red-700 px-3 py-1 text-xs text-red-100">
                              {area}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500">None listed</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Next steps</p>
                      <div className="flex flex-wrap gap-2">
                        {nextSteps.length > 0 ? (
                          nextSteps.map((step) => (
                            <span key={step} className="rounded-full bg-sky-700 px-3 py-1 text-xs text-sky-100">
                              {step}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500">None listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
