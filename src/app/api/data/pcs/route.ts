import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Generic interface for items with id
interface DataItem {
    id: string;
    [key: string]: unknown;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'pcs.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading PCs file:', error);
        return NextResponse.json({ error: 'Failed to load PCs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newPC = await request.json();

        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const pcs = JSON.parse(fileContents);

        pcs.push(newPC);

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(pcs, null, 2));

        return NextResponse.json({ success: true, data: newPC });
    } catch (error) {
        console.error('Error creating PC:', error);
        return NextResponse.json({ error: 'Failed to create PC' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedPC = await request.json();

        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const pcs = JSON.parse(fileContents);

        const index = pcs.findIndex((pc: DataItem) => pc.id === updatedPC.id);
        if (index === -1) {
            return NextResponse.json({ error: 'PC not found' }, { status: 404 });
        }

        pcs[index] = updatedPC;

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(pcs, null, 2));

        return NextResponse.json({ success: true, data: updatedPC });
    } catch (error) {
        console.error('Error updating PC:', error);
        return NextResponse.json({ error: 'Failed to update PC' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'PC ID is required' }, { status: 400 });
        }

        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const pcs = JSON.parse(fileContents);

        const filteredPCs = pcs.filter((pc: DataItem) => pc.id !== id);

        if (filteredPCs.length === pcs.length) {
            return NextResponse.json({ error: 'PC not found' }, { status: 404 });
        }

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredPCs, null, 2));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting PC:', error);
        return NextResponse.json({ error: 'Failed to delete PC' }, { status: 500 });
    }
}
