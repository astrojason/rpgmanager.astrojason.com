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

  if (!data) return <div className="grim-mono" style={{ padding: '2rem', color: 'var(--grim-ink-4)' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link
          href="/campaign"
          className="grim-mono"
          style={{ fontSize: "1rem", color: 'var(--grim-ink-3)', textDecoration: 'none', letterSpacing: '.08em' }}
        >
          ← Back
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: "2rem", color: 'var(--grim-gold)', margin: 0 }}>
          Changelog
        </h1>
        <span className="grim-mono" style={{ fontSize: "1.0833rem", color: 'var(--grim-ink-3)', letterSpacing: '.1em' }}>
          v{data.version}
        </span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {data.entries.map(e => (
          <li
            key={e.hash}
            className="grim-mono"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--grim-line)',
              fontSize: "1.0833rem",
            }}
          >
            <span style={{ color: 'var(--grim-ink-4)', minWidth: 88, flexShrink: 0 }}>{e.date}</span>
            <code style={{ color: 'var(--grim-gold)', flexShrink: 0 }}>{e.hash}</code>
            <span style={{ color: 'var(--grim-ink-2)' }}>{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
