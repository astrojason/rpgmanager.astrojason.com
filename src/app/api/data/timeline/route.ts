import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Interface for timeline event data
interface TimelineEvent {
    id: string;
    [key: string]: unknown;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'public', 'data', 'timeline.json');

export async function GET() {
    try {
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Timeline file:', error);
        return NextResponse.json({ error: 'Failed to load Timeline' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newEvent = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const timelineData = JSON.parse(fileContents);
        // Add to events array
        if (!timelineData.events) {
            timelineData.events = [];
        }
        timelineData.events.push(newEvent);
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(timelineData, null, 2));
        return NextResponse.json({ success: true, data: newEvent });
    } catch (error) {
        console.error('Error creating Timeline event:', error);
        return NextResponse.json({ error: 'Failed to create Timeline event' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updatedEvent = await request.json();
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const timelineData = JSON.parse(fileContents);
        if (!timelineData.events) {
            return NextResponse.json({ error: 'Timeline events not found' }, { status: 404 });
        }
        const index = timelineData.events.findIndex((event: TimelineEvent) => event.id === updatedEvent.id);
        if (index === -1) {
            return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
        }
        timelineData.events[index] = updatedEvent;
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(timelineData, null, 2));
        return NextResponse.json({ success: true, data: updatedEvent });
    } catch (error) {
        console.error('Error updating Timeline event:', error);
        return NextResponse.json({ error: 'Failed to update Timeline event' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Timeline event ID is required' }, { status: 400 });
        }
        const fileContents = await fs.readFile(DATA_FILE_PATH, 'utf8');
        const timelineData = JSON.parse(fileContents);
        if (!timelineData.events) {
            return NextResponse.json({ error: 'Timeline events not found' }, { status: 404 });
        }
        const filteredEvents = timelineData.events.filter((event: TimelineEvent) => event.id !== id);
        if (filteredEvents.length === timelineData.events.length) {
            return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
        }
        timelineData.events = filteredEvents;
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(timelineData, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Timeline event:', error);
        return NextResponse.json({ error: 'Failed to delete Timeline event' }, { status: 500 });
    }
}
