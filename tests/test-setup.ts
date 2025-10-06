import { vi, beforeEach } from 'vitest';

type FnMock = ReturnType<typeof vi.fn>;

interface MockDb {
  execute: FnMock;
  transaction: FnMock;
}

const mockDb: MockDb = {
  execute: vi.fn(),
  transaction: vi.fn(),
};

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
  ensureSchemaMock.mockReset();
  ensureSchemaMock.mockResolvedValue(undefined);
});

declare global {
  // eslint-disable-next-line no-var
  var __mockDb: MockDb;
  // eslint-disable-next-line no-var
  var __ensureSchemaMock: FnMock;
}

globalThis.__mockDb = mockDb;
globalThis.__ensureSchemaMock = ensureSchemaMock;
