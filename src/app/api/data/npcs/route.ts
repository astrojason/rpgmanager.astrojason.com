import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { NPC } from '@/types/interfaces';

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'npcs.json');

function isNumericId(id: unknown): boolean {
    if (typeof id === 'number') return true;
    if (typeof id === 'string') return /^\d+$/.test(id.trim());
    return false;
}

function genUUID(): string {
    // Use crypto.randomUUID if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (globalThis as any).crypto?.randomUUID?.bind((globalThis as any).crypto);
    if (g) return g();
    // Fallback: simple v4-like generator
    const rnd = (n = 16) => Array.from({ length: n }, () => (Math.random() * 256) | 0);
    const bytes = rnd(16);
    // Set version and variant bits
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

function normalizeAka(npc: any): any {
    const out = { ...npc };
    if (Array.isArray(out.aka)) {
        out.aka = out.aka.join(', ');
    }
    return out;
}

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        let data = JSON.parse(fileContents);

        // Auto-migrate numeric IDs to UUIDs
        let mutated = false;
        const used = new Set<string>();
        for (const npc of data) {
            if (typeof npc.id === 'string') used.add(npc.id);
        }
        for (const npc of data) {
            if (isNumericId(npc.id)) {
                let uuid: string;
                do {
                    uuid = genUUID();
                } while (used.has(uuid));
                used.add(uuid);
                npc.id = uuid;
                mutated = true;
            }
        }
        if (mutated) {
            await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
        }

        // Normalize aka to string for client compatibility
        const normalized = Array.isArray(data) ? data.map((n: any) => normalizeAka(n)) : data;
        return NextResponse.json(normalized);
    } catch (error) {
        console.error('Error reading NPCs file:', error);
        return NextResponse.json({ error: 'Failed to load NPCs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newNPC = await request.json();

        // Read current data
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const npcs = JSON.parse(fileContents);

        // Add new NPC
        if (!newNPC.id) {
            newNPC.id = genUUID();
        }
        npcs.push(newNPC);

        // Write back to file
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(npcs, null, 2));

        return NextResponse.json({ success: true, data: newNPC });
    } catch (error) {
        console.error('Error creating NPC:', error);
        return NextResponse.json({ error: 'Failed to create NPC' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedNPC = await request.json();

        // Read current data
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const npcs = JSON.parse(fileContents);

        // Find and update NPC
        const index = npcs.findIndex((npc: NPC) => npc.id === updatedNPC.id);
        if (index === -1) {
            return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
        }

        npcs[index] = updatedNPC;

        // Write back to file
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(npcs, null, 2));

        return NextResponse.json({ success: true, data: updatedNPC });
    } catch (error) {
        console.error('Error updating NPC:', error);
        return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'NPC ID is required' }, { status: 400 });
        }

        // Read current data
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const npcs = JSON.parse(fileContents);

        // Filter out the NPC to delete
        const filteredNPCs = npcs.filter((npc: NPC) => npc.id !== id);

        if (filteredNPCs.length === npcs.length) {
            return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
        }

        // Write back to file
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredNPCs, null, 2));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting NPC:', error);
        return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 });
    }
}
