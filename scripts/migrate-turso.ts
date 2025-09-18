#!/usr/bin/env ts-node
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import { config as loadEnv } from 'dotenv';

// Load environment from .env.local if present (fallback to process env)
loadEnv({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  const db = createClient({ url, authToken });

  const root = process.cwd();
  const dataDir = resolve(root, 'public', 'data');

  // Map from legacy UUID -> new numeric id for factions
  const factionIdMap = new Map<string, number>();

  // Factions first (INTEGER PK)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'factions.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS factions');
      await db.execute(`CREATE TABLE IF NOT EXISTS factions (
        id INTEGER PRIMARY KEY,
        name TEXT, pronunciation TEXT, type TEXT, description TEXT, location TEXT, status TEXT, goals TEXT, background TEXT, relationships TEXT, image TEXT, gm_notes TEXT
      )`);
      const tx = await db.transaction('write');
      try {
        await tx.execute('DELETE FROM factions');
        for (const f of parsed) {
          const res = await tx.execute({
            sql: `INSERT INTO factions (name,pronunciation,type,description,location,status,goals,background,relationships,image,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            args: [f.name, f.pronunciation ?? null, f.type ?? null, f.description ?? null, f.location ?? null, f.status ?? null, f.goals ?? null, f.background ?? null, JSON.stringify(f.relationships ?? []), f.image ?? null, f.gm_notes ?? null]
          });
          const newId = Number(res.lastInsertRowid ?? 0);
          if (f.id) factionIdMap.set(String(f.id), newId);
        }
        await tx.commit();
        console.log('Migrated factions (INTEGER PK)');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping factions:', (e as Error).message); }
  })();

  // NPCs (explicit columns + junction); join uses mapped faction ids
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'npcs.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS npc_factions');
      await db.execute('DROP TABLE IF EXISTS npcs');
      await db.execute(`CREATE TABLE IF NOT EXISTS npcs (
        id INTEGER PRIMARY KEY,
        name TEXT, aka TEXT, display_name TEXT,
        pronunciation TEXT, race TEXT, gender TEXT,
        location TEXT, status TEXT,
        description TEXT, background TEXT, personality TEXT,
        image TEXT,
        hidden INTEGER, nameHidden INTEGER, hide_name INTEGER,
        notes TEXT, gm_notes TEXT
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS npc_factions (npc_id INTEGER NOT NULL, faction_id INTEGER NOT NULL, PRIMARY KEY(npc_id,faction_id))`);
      const tx = await db.transaction('write');
      try {
        await tx.execute('DELETE FROM npcs');
        await tx.execute('DELETE FROM npc_factions');
        for (const n of parsed) {
          const { factions = [], ...rest } = n;
          const ins = await tx.execute({ sql: `INSERT INTO npcs (name,aka,display_name,pronunciation,race,gender,location,status,description,background,personality,image,hidden,nameHidden,hide_name,notes,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, args: [rest.name ?? null, (Array.isArray(rest.aka) ? rest.aka.join(', ') : rest.aka) ?? null, rest.display_name ?? null, rest.pronunciation ?? null, rest.race ?? null, rest.gender ?? null, rest.location ?? null, rest.status ?? null, rest.description ?? null, rest.background ?? null, rest.personality ?? null, rest.image ?? null, rest.hidden ? 1 : 0, rest.nameHidden ? 1 : 0, rest.hide_name ? 1 : 0, JSON.stringify(rest.notes ?? []), rest.gm_notes ?? null] });
          const npcId = Number(ins.lastInsertRowid ?? 0);
          for (const legacy of factions) {
            const mapped = factionIdMap.get(String(legacy));
            if (mapped != null) await tx.execute({ sql: `INSERT OR IGNORE INTO npc_factions (npc_id,faction_id) VALUES (?,?)`, args: [npcId, mapped] });
          }
        }
        await tx.commit();
        console.log('Migrated npcs (columns + junction mapping)');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping npcs:', (e as Error).message); }
  })();

  // PCs (explicit columns + junction); join uses mapped faction ids
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'pcs.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS pc_factions');
      await db.execute('DROP TABLE IF EXISTS pcs');
      await db.execute(`CREATE TABLE IF NOT EXISTS pcs (
        id INTEGER PRIMARY KEY,
        name TEXT,
        nickname TEXT,
        race TEXT,
        hometown TEXT,
        status TEXT,
        class TEXT,
        image TEXT,
        gif TEXT,
        player TEXT,
        gm_notes TEXT
      )`);
      await db.execute(`CREATE TABLE IF NOT EXISTS pc_factions (pc_id INTEGER NOT NULL, faction_id INTEGER NOT NULL, PRIMARY KEY(pc_id,faction_id))`);
      const tx = await db.transaction('write');
      try {
        await tx.execute('DELETE FROM pcs');
        await tx.execute('DELETE FROM pc_factions');
        for (const p of parsed) {
          const { factions = [], ...rest } = p;
          const ins = await tx.execute({ sql: `INSERT INTO pcs (name,nickname,race,hometown,status,class,image,gif,player,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [rest.name ?? null, rest.nickname ?? null, rest.race ?? null, rest.hometown ?? null, rest.status ?? null, rest.class ?? null, rest.image ?? null, rest.gif ?? null, rest.player ?? null, rest.gm_notes ?? null] });
          const pcId = Number(ins.lastInsertRowid ?? 0);
          for (const legacy of factions) {
            const mapped = factionIdMap.get(String(legacy));
            if (mapped != null) await tx.execute({ sql: `INSERT OR IGNORE INTO pc_factions (pc_id,faction_id) VALUES (?,?)`, args: [pcId, mapped] });
          }
        }
        await tx.commit();
        console.log('Migrated pcs (columns + junction mapping)');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping pcs:', (e as Error).message); }
  })();

  // Locations (INTEGER PK)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'locations.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS locations');
      await db.execute(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY,
        name TEXT, pronunciation TEXT, mapImg TEXT, x REAL, y REAL, width REAL, height REAL, teaser TEXT, detail TEXT, gm_notes TEXT, locations TEXT
      )`);
      const tx = await db.transaction('write');
      try {
        for (const l of parsed) {
          await tx.execute({ sql: `INSERT INTO locations (name,pronunciation,mapImg,x,y,width,height,teaser,detail,gm_notes,locations) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, args: [l.name, l.pronunciation ?? null, l.mapImg ?? null, l.x ?? null, l.y ?? null, l.width ?? null, l.height ?? null, l.teaser ?? null, l.detail ?? null, l.gm_notes ?? null, JSON.stringify(l.locations ?? [])] });
        }
        await tx.commit();
        console.log('Migrated locations');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping locations:', (e as Error).message); }
  })();

  // Quests (INTEGER PK)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'quests.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS quests');
      await db.execute(`CREATE TABLE IF NOT EXISTS quests (id INTEGER PRIMARY KEY, name TEXT, notes TEXT, status TEXT, gm_notes TEXT)`);
      const tx = await db.transaction('write');
      try {
        for (const q of parsed) {
          await tx.execute({ sql: `INSERT INTO quests (name,notes,status,gm_notes) VALUES (?,?,?,?)`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null] });
        }
        await tx.commit();
        console.log('Migrated quests');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping quests:', (e as Error).message); }
  })();

  // Timeline (INTEGER PK)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'timeline.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS timeline');
      await db.execute(`CREATE TABLE IF NOT EXISTS timeline (id INTEGER PRIMARY KEY, title TEXT, date TEXT, description TEXT, category TEXT, gm_notes TEXT)`);
      const tx = await db.transaction('write');
      try {
        for (const e of parsed) {
          await tx.execute({ sql: `INSERT INTO timeline (title,date,description,category,gm_notes) VALUES (?,?,?,?,?)`, args: [e.title, e.date, e.description ?? '', e.category ?? null, e.gm_notes ?? null] });
        }
        await tx.commit();
        console.log('Migrated timeline');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping timeline:', (e as Error).message); }
  })();

  // Session Recaps (INTEGER PK)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'session_recaps.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS session_recaps');
      await db.execute(`CREATE TABLE IF NOT EXISTS session_recaps (id INTEGER PRIMARY KEY, date TEXT, title TEXT, recap TEXT, author TEXT, notes TEXT)`);
      const tx = await db.transaction('write');
      try {
        for (const r of parsed) {
          await tx.execute({ sql: `INSERT INTO session_recaps (date,title,recap,author,notes) VALUES (?,?,?,?,?)`, args: [r.date, r.title, r.recap ?? '', r.author ?? null, JSON.stringify(r.notes ?? [])] });
        }
        await tx.commit();
        console.log('Migrated session_recaps');
      } catch (e) { await tx.rollback(); throw e; }
    } catch (e) { console.warn('Skipping session_recaps:', (e as Error).message); }
  })();

  // Calendar (single row JSON)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'calendar.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS calendar');
      await db.execute(`CREATE TABLE IF NOT EXISTS calendar (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        showIntercalarySeparately INTEGER,
        current_day INTEGER,
        current_month INTEGER,
        current_year INTEGER,
        static TEXT,
        events TEXT,
        categories TEXT
      )`);
      const payload = {
        name: parsed.name ?? null,
        description: parsed.description ?? null,
        showIntercalarySeparately: parsed.showIntercalarySeparately ? 1 : 0,
        current_day: Number(parsed.current?.day ?? 0),
        current_month: Number(parsed.current?.month ?? 0),
        current_year: Number(parsed.current?.year ?? 0),
        static: JSON.stringify(parsed.static ?? {}),
        events: JSON.stringify(parsed.events ?? []),
        categories: JSON.stringify(parsed.categories ?? [])
      };
      await db.execute({ sql: `INSERT INTO calendar (id,name,description,showIntercalarySeparately,current_day,current_month,current_year,static,events,categories) VALUES (1,?,?,?,?,?,?,?,?,?)`, args: [payload.name, payload.description, payload.showIntercalarySeparately, payload.current_day, payload.current_month, payload.current_year, payload.static, payload.events, payload.categories] });
      console.log('Migrated calendar (columns)');
    } catch (e) { console.warn('Skipping calendar:', (e as Error).message); }
  })();

  // Next session (single row)
  await (async () => {
    try {
      const raw = await readFile(resolve(dataDir, 'next_session.json'), 'utf8');
      const parsed = JSON.parse(raw);
      await db.execute('DROP TABLE IF EXISTS next_session');
      await db.execute(`CREATE TABLE IF NOT EXISTS next_session (
        id INTEGER PRIMARY KEY,
        date TEXT,
        agenda TEXT,
        reminders TEXT,
        currentGameDate TEXT,
        location TEXT,
        notes TEXT,
        lastUpdated TEXT,
        isSkipped INTEGER,
        skipReason TEXT
      )`);
      const payload = {
        date: parsed.date ?? null,
        agenda: parsed.agenda ?? null,
        reminders: JSON.stringify(parsed.reminders ?? []),
        currentGameDate: parsed.currentGameDate ?? null,
        location: parsed.location ?? null,
        notes: parsed.notes ?? null,
        lastUpdated: parsed.lastUpdated ?? null,
        isSkipped: parsed.isSkipped ? 1 : 0,
        skipReason: parsed.skipReason ?? null
      };
      await db.execute({ sql: `INSERT INTO next_session (id,date,agenda,reminders,currentGameDate,location,notes,lastUpdated,isSkipped,skipReason) VALUES (1,?,?,?,?,?,?,?,?,?)`, args: [payload.date, payload.agenda, payload.reminders, payload.currentGameDate, payload.location, payload.notes, payload.lastUpdated, payload.isSkipped, payload.skipReason] });
      console.log('Migrated next_session (columns)');
    } catch (e) { console.warn('Skipping next_session:', (e as Error).message); }
  })();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
