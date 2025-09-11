import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Generic interface for items with id
interface DataItem {
    id: string;
    [key: string]: unknown;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'locations.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Locations file:', error);
        return NextResponse.json({ error: 'Failed to load Locations' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newLocation = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const locations = JSON.parse(fileContents);
        locations.push(newLocation);
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(locations, null, 2));
        return NextResponse.json({ success: true, data: newLocation });
    } catch (error) {
        console.error('Error creating Location:', error);
        return NextResponse.json({ error: 'Failed to create Location' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedLocation = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const locations = JSON.parse(fileContents);
        const index = locations.findIndex((location: DataItem) => location.id === updatedLocation.id);
        if (index === -1) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        locations[index] = updatedLocation;
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(locations, null, 2));
        return NextResponse.json({ success: true, data: updatedLocation });
    } catch (error) {
        console.error('Error updating Location:', error);
        return NextResponse.json({ error: 'Failed to update Location' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
        }
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const locations = JSON.parse(fileContents);
        const filteredLocations = locations.filter((location: DataItem) => location.id !== id);
        if (filteredLocations.length === locations.length) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 });
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(filteredLocations, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Location:', error);
        return NextResponse.json({ error: 'Failed to delete Location' }, { status: 500 });
    }
}
