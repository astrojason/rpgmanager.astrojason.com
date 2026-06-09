import { vi, beforeEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';

type FnMock = ReturnType<typeof vi.fn>;

interface MockDb {
  execute: FnMock;
  transaction: FnMock;
  batch: FnMock;
}

const mockDb: MockDb = {
  execute: vi.fn(),
  transaction: vi.fn(),
  batch: vi.fn(),
};

// batch delegates to execute per-statement so sequential mock values and SQL-inspection tests work
const batchImpl = async (stmts: unknown[]) => {
  const exec = mockDb.execute as unknown as (stmt?: unknown) => Promise<unknown>;
  const results = [];
  for (const stmt of stmts) {
    results.push(await exec(stmt));
  }
  return results;
};

mockDb.batch.mockImplementation(batchImpl);

const ensureSchemaMock = vi.fn();

vi.mock('@/lib/turso', () => ({
  getDb: () => mockDb,
}));

vi.mock('@/lib/schema', () => ({
  ensureSchema: ensureSchemaMock,
}));

beforeEach(() => {
  mockDb.execute.mockReset();
  mockDb.transaction.mockReset();
  mockDb.batch.mockReset();
  mockDb.batch.mockImplementation(batchImpl);
  ensureSchemaMock.mockReset();
  ensureSchemaMock.mockResolvedValue(undefined);
});

// Provide a lightweight mock for next/image so component tests can render
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { src, alt, priority: _priority, ...rest } = props;
    return React.createElement('img', { src: typeof src === 'string' ? src : '', alt, ...rest });
  },
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => React.createElement('a', { href, ...rest }, children),
}));

// Basic ResizeObserver mock for jsdom environment
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// attach to global for tests
(globalThis as any).ResizeObserver = ResizeObserver;

declare global {
  var __mockDb: MockDb;
  var __ensureSchemaMock: FnMock;
}

globalThis.__mockDb = mockDb;
globalThis.__ensureSchemaMock = ensureSchemaMock;
