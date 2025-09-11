import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { NPC } from '@/types/interfaces';

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'npcs.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
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
