import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Interface for session recap data
interface SessionRecap {
    date: string;
    title: string;
    recap: string;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'session_recaps.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Session Recaps file:', error);
        return NextResponse.json({ error: 'Failed to load Session Recaps' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newRecap = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const recaps = JSON.parse(fileContents);
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
        const updatedRecap = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const recaps = JSON.parse(fileContents);
        const index = recaps.findIndex((recap: SessionRecap) => recap.date === updatedRecap.date && recap.title === updatedRecap.title);
        if (index === -1) {
            return NextResponse.json({ error: 'Session Recap not found' }, { status: 404 });
        }
        recaps[index] = updatedRecap;
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
