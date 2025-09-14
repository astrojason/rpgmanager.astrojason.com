#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'npcs.json');

function isNumericId(id) {
  if (typeof id === 'number') return true;
  if (typeof id === 'string') return /^\d+$/.test(id.trim());
  return false;
}

function genUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const rnd = (n = 16) => Array.from({ length: n }, () => (Math.random() * 256) | 0);
  const bytes = rnd(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
  return (
    hex.slice(0, 4).join('') + '-' +
    hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' +
    hex.slice(8, 10).join('') + '-' +
    hex.slice(10, 16).join('')
  );
}

try {
  const raw = await readFile(DATA_FILE_PATH, 'utf8');
  const data = JSON.parse(raw);
  const used = new Set(data.map(n => String(n.id)));
  let changed = 0;
  for (const npc of data) {
    if (isNumericId(npc.id)) {
      let uuid;
      do { uuid = genUUID(); } while (used.has(uuid));
      used.add(uuid);
      npc.id = uuid;
      changed++;
    }
  }
  if (changed > 0) {
    await writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
    console.log(`Updated ${changed} NPC id(s) to UUID in npcs.json`);
  } else {
    console.log('No numeric NPC ids found. No changes made.');
  }
} catch (e) {
  console.error('Migration failed:', e);
  process.exit(1);
}

