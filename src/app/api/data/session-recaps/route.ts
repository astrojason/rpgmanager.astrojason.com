import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { SessionRecap } from '@/types/interfaces';

// Interface for session recap data
// Note: extended SessionRecap interface is imported

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'session_recaps.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data: SessionRecap[] = JSON.parse(fileContents);
        // Auto-migrate: add ids and defaults
        let mutated = false;
        const used = new Set<string>();
        for (const r of data) if (r.id) used.add(r.id);
        const genUUID = () => {
            const gt = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
            const g = gt.crypto?.randomUUID?.bind(gt.crypto);
            if (g) return g();
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
        };
        for (const recap of data) {
            if (!recap.id) {
                let id: string;
                do { id = genUUID(); } while (used.has(id));
                recap.id = id; used.add(id); mutated = true;
            }
            if (!Array.isArray(recap.notes)) {
                recap.notes = [];
                mutated = true;
            }
        }
        if (mutated) {
            await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Session Recaps file:', error);
        return NextResponse.json({ error: 'Failed to load Session Recaps' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newRecap: SessionRecap = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const recaps: SessionRecap[] = JSON.parse(fileContents);
        if (!newRecap.id) {
            const gt = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
            const g = gt.crypto?.randomUUID?.bind(gt.crypto);
            newRecap.id = g ? g() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
        if (!Array.isArray(newRecap.notes)) newRecap.notes = [];
        recaps.push(newRecap);
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(recaps, null, 2));
        return NextResponse.json({ success: true, data: newRecap });
    } catch (error) {
        console.error('Error creating Session Recap:', error);
        return NextResponse.json({ error: 'Failed to create Session Recap' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedRecap: SessionRecap = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const recaps: SessionRecap[] = JSON.parse(fileContents);
        let index = -1;
        if (updatedRecap.id) {
            index = recaps.findIndex((recap) => recap.id === updatedRecap.id);
        }
        if (index === -1) {
            index = recaps.findIndex((recap) => recap.date === updatedRecap.date && recap.title === updatedRecap.title);
        }
        if (index === -1) {
            return NextResponse.json({ error: 'Session Recap not found' }, { status: 404 });
        }
        recaps[index] = { ...recaps[index], ...updatedRecap };
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(recaps, null, 2));
        return NextResponse.json({ success: true, data: updatedRecap });
    } catch (error) {
        console.error('Error updating Session Recap:', error);
        return NextResponse.json({ error: 'Failed to update Session Recap' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const title = searchParams.get('title');
        if (!date || !title) {
            return NextResponse.json({ error: 'Date and title are required' }, { status: 400 });
        }
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const recaps = JSON.parse(fileContents);
        const filteredRecaps = recaps.filter((recap: SessionRecap) => !(recap.date === date && recap.title === title));
        if (filteredRecaps.length === recaps.length) {
            return NextResponse.json({ error: 'Session Recap not found' }, { status: 404 });
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredRecaps, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Session Recap:', error);
        return NextResponse.json({ error: 'Failed to delete Session Recap' }, { status: 500 });
    }
}
