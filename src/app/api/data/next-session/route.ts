import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'next_session.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Next Session file:', error);
        return NextResponse.json({ error: 'Failed to load Next Session data' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedData = await request.json();
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(updatedData, null, 2));
        return NextResponse.json({ success: true, data: updatedData });
    } catch (error) {
        console.error('Error updating Next Session:', error);
        return NextResponse.json({ error: 'Failed to update Next Session' }, { status: 500 });
    }
}
