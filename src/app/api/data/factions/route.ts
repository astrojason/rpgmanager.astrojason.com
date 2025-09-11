import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Faction } from '@/types/interfaces';

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'factions.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Factions file:', error);
        return NextResponse.json({ error: 'Failed to load Factions' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newFaction = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const factions = JSON.parse(fileContents);
        factions.push(newFaction);
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(factions, null, 2));
        return NextResponse.json({ success: true, data: newFaction });
    } catch (error) {
        console.error('Error creating Faction:', error);
        return NextResponse.json({ error: 'Failed to create Faction' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedFaction = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const factions = JSON.parse(fileContents);
        const index = factions.findIndex((faction: Faction) => faction.id === updatedFaction.id);
        if (index === -1) {
            return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
        }
        factions[index] = updatedFaction;
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(factions, null, 2));
        return NextResponse.json({ success: true, data: updatedFaction });
    } catch (error) {
        console.error('Error updating Faction:', error);
        return NextResponse.json({ error: 'Failed to update Faction' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Faction ID is required' }, { status: 400 });
        }
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const factions = JSON.parse(fileContents);
        const filteredFactions = factions.filter((faction: Faction) => faction.id !== id);
        if (filteredFactions.length === factions.length) {
            return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredFactions, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Faction:', error);
        return NextResponse.json({ error: 'Failed to delete Faction' }, { status: 500 });
    }
}
