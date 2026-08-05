'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type ChangelogData = {
  version: string;
  entries: { hash: string; message: string; date: string }[];
};

export default function ChangelogPage() {
  const [data, setData] = useState<ChangelogData | null>(null);

  useEffect(() => {
    fetch('/api/changelog').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="grim-mono p-8 text-grim-ink-4">Loading...</div>;

  return (
    <div className="p-8 max-w-180">
      <div className="flex items-baseline gap-4 mb-6">
        <Link
          href="/campaign"
          className="grim-mono text-base text-grim-ink-3 no-underline tracking-widest"
        >
          ← Back
        </Link>
        <h1 className="font-display text-3xl text-grim-gold m-0">
          Changelog
        </h1>
        <span className="grim-mono text-lg text-grim-ink-3 tracking-widest">
          v{data.version}
        </span>
      </div>
      <ul className="list-none p-0 m-0">
        {data.entries.map(e => (
          <li
            key={e.hash}
            className="grim-mono flex items-baseline gap-3 py-2 border-b border-grim-line text-lg"
          >
            <span className="text-grim-ink-4 min-w-22 shrink-0">{e.date}</span>
            <code className="text-grim-gold shrink-0">{e.hash}</code>
            <span className="text-grim-ink-2">{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
