#!/usr/bin/env tsx
// One-off cleanup: session recaps were imported from an Obsidian vault and still
// contain literal `[[Wikilink]]` / `[[Wikilink|Alias]]` syntax. The app's own
// markdown renderer doesn't understand that syntax (renders it as literal
// brackets) and has its own separate entity auto-linker, so these are just
// clutter. Strip them down to plain text (the alias, when present, otherwise
// the page name) in place.
//
// Usage:
//   npx tsx scripts/strip-obsidian-links.ts            # dry run, prints a diff
//   npx tsx scripts/strip-obsidian-links.ts --write     # applies the changes

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@libsql/client';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function stripWikilinks(text: string): string {
  return text.replace(WIKILINK, (_match, name: string, alias: string | undefined) => (alias ?? name).trim());
}

async function main() {
  const write = process.argv.includes('--write');

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  const db = createClient({ url, authToken });

  const res = await db.execute('SELECT id, title, recap FROM session_recaps');

  let changedRows = 0;
  let linksRemoved = 0;

  for (const row of res.rows) {
    const id = row.id;
    const title = String(row.title ?? '');
    const recap = String(row.recap ?? '');

    const newTitle = stripWikilinks(title);
    const newRecap = stripWikilinks(recap);
    if (newTitle === title && newRecap === recap) continue;

    changedRows++;
    linksRemoved += (recap.match(WIKILINK)?.length ?? 0) + (title.match(WIKILINK)?.length ?? 0);

    console.log(`--- recap ${id}: ${title || '(untitled)'} ---`);
    if (newRecap !== recap) {
      console.log(`  ${recap.slice(0, 120)}${recap.length > 120 ? '…' : ''}`);
      console.log(`  → ${newRecap.slice(0, 120)}${newRecap.length > 120 ? '…' : ''}`);
    }

    if (write) {
      await db.execute({
        sql: 'UPDATE session_recaps SET title=?, recap=? WHERE id=?',
        args: [newTitle, newRecap, id],
      });
    }
  }

  console.log();
  console.log(`${changedRows} recap(s), ${linksRemoved} link(s) ${write ? 'updated' : 'would be updated'}.`);
  if (!write && changedRows > 0) {
    console.log('Dry run only — re-run with --write to apply.');
  }
}

main().catch((e) => {
  console.error('strip-obsidian-links failed:', e);
  process.exit(1);
});
