import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Generic interface for items with id
interface DataItem {
    id: string;
    [key: string]: unknown;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'quests.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Quests file:', error);
        return NextResponse.json({ error: 'Failed to load Quests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newQuest = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const quests = JSON.parse(fileContents);
        quests.push(newQuest);
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(quests, null, 2));
        return NextResponse.json({ success: true, data: newQuest });
    } catch (error) {
        console.error('Error creating Quest:', error);
        return NextResponse.json({ error: 'Failed to create Quest' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedQuest = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const quests = JSON.parse(fileContents);
        const index = quests.findIndex((quest: DataItem) => quest.id === updatedQuest.id);
        if (index === -1) {
            return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        }
        quests[index] = updatedQuest;
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(quests, null, 2));
        return NextResponse.json({ success: true, data: updatedQuest });
    } catch (error) {
        console.error('Error updating Quest:', error);
        return NextResponse.json({ error: 'Failed to update Quest' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 });
        }
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const quests = JSON.parse(fileContents);
        const filteredQuests = quests.filter((quest: DataItem) => quest.id !== id);
        if (filteredQuests.length === quests.length) {
            return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredQuests, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Quest:', error);
        return NextResponse.json({ error: 'Failed to delete Quest' }, { status: 500 });
    }
}
