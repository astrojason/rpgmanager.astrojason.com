import { getDb } from '@/lib/turso';

export async function ensureSchema() {
  const db = getDb();
  await db.execute('PRAGMA foreign_keys = ON');

  // Factions (using TEXT id to match route implementation)
  await db.execute(`CREATE TABLE IF NOT EXISTS factions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pronunciation TEXT,
    type TEXT,
    description TEXT,
    location TEXT,
    status TEXT,
    goals TEXT,
    background TEXT,
    relationships TEXT,
    image TEXT,
    gm_notes TEXT
  )`);

  // NPCs
  await db.execute(`CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY,
    name TEXT,
    aka TEXT,
    display_name TEXT,
    pronunciation TEXT,
    race TEXT,
    gender TEXT,
    location TEXT,
    status TEXT,
    description TEXT,
    background TEXT,
    personality TEXT,
    image TEXT,
    hidden INTEGER NOT NULL DEFAULT 0,
    nameHidden INTEGER NOT NULL DEFAULT 0,
    hide_name INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    gm_notes TEXT
  )`);

  // PCs
  await db.execute(`CREATE TABLE IF NOT EXISTS pcs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT,
    race TEXT NOT NULL,
    hometown TEXT NOT NULL,
    status TEXT NOT NULL,
    class TEXT NOT NULL,
    image TEXT,
    gif TEXT,
    player TEXT,
    gm_notes TEXT
  )`);

  // Junctions (faction_id is TEXT to match factions table)
  await db.execute(`CREATE TABLE IF NOT EXISTS npc_factions (
    npc_id INTEGER NOT NULL,
    faction_id TEXT NOT NULL,
    PRIMARY KEY(npc_id, faction_id),
    FOREIGN KEY(npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
    FOREIGN KEY(faction_id) REFERENCES factions(id) ON DELETE CASCADE
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS pc_factions (
    pc_id INTEGER NOT NULL,
    faction_id TEXT NOT NULL,
    PRIMARY KEY(pc_id, faction_id),
    FOREIGN KEY(pc_id) REFERENCES pcs(id) ON DELETE CASCADE,
    FOREIGN KEY(faction_id) REFERENCES factions(id) ON DELETE CASCADE
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_npc_factions_faction ON npc_factions(faction_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_pc_factions_faction ON pc_factions(faction_id)`);

  // Locations
  await db.execute(`CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    pronunciation TEXT,
    mapImg TEXT,
    x REAL,
    y REAL,
    width REAL,
    height REAL,
    teaser TEXT,
    detail TEXT,
    gm_notes TEXT,
    locations TEXT
  )`);

  // Quests
  await db.execute(`CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    status TEXT,
    gm_notes TEXT
  )`);

  // Timeline
  await db.execute(`CREATE TABLE IF NOT EXISTS timeline (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    category TEXT,
    gm_notes TEXT
  )`);

  // Session recaps
  await db.execute(`CREATE TABLE IF NOT EXISTS session_recaps (
    id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    recap TEXT,
    author TEXT,
    notes TEXT
  )`);

  // Calendar (single row)
  await db.execute(`CREATE TABLE IF NOT EXISTS calendar (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT,
    showIntercalarySeparately INTEGER NOT NULL DEFAULT 0,
    current_day INTEGER NOT NULL DEFAULT 0,
    current_month INTEGER NOT NULL DEFAULT 0,
    current_year INTEGER NOT NULL DEFAULT 0,
    static TEXT,
    events TEXT,
    categories TEXT
  )`);

  // Next session (single row)
  await db.execute(`CREATE TABLE IF NOT EXISTS next_session (
    id INTEGER PRIMARY KEY,
    date TEXT,
    agenda TEXT,
    reminders TEXT,
    currentGameDate TEXT,
    location TEXT,
    notes TEXT,
    lastUpdated TEXT,
    isSkipped INTEGER NOT NULL DEFAULT 0,
    skipReason TEXT
  )`);

  // Entity tags — junctions linking recaps/quests to NPCs and locations
  await db.execute(`CREATE TABLE IF NOT EXISTS recap_npcs (
    recap_id INTEGER NOT NULL,
    npc_id INTEGER NOT NULL,
    PRIMARY KEY(recap_id, npc_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS recap_locations (
    recap_id INTEGER NOT NULL,
    location_id TEXT NOT NULL,
    PRIMARY KEY(recap_id, location_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS quest_npcs (
    quest_id INTEGER NOT NULL,
    npc_id INTEGER NOT NULL,
    PRIMARY KEY(quest_id, npc_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS quest_locations (
    quest_id INTEGER NOT NULL,
    location_id TEXT NOT NULL,
    PRIMARY KEY(quest_id, location_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS recap_quests (
    recap_id INTEGER NOT NULL,
    quest_id INTEGER NOT NULL,
    PRIMARY KEY(recap_id, quest_id)
  )`);

  // Items
  await db.execute(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    pronunciation TEXT,
    type_tag TEXT,
    description TEXT,
    properties TEXT,
    image TEXT,
    hidden INTEGER NOT NULL DEFAULT 0,
    gm_notes TEXT,
    notes TEXT
  )`);

  // Item junctions
  await db.execute(`CREATE TABLE IF NOT EXISTS item_npcs (
    item_id INTEGER NOT NULL,
    npc_id INTEGER NOT NULL,
    PRIMARY KEY(item_id, npc_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS item_pcs (
    item_id INTEGER NOT NULL,
    pc_id INTEGER NOT NULL,
    PRIMARY KEY(item_id, pc_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS item_locations (
    item_id INTEGER NOT NULL,
    location_id TEXT NOT NULL,
    PRIMARY KEY(item_id, location_id)
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS recap_items (
    recap_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    PRIMARY KEY(recap_id, item_id)
  )`);
}

