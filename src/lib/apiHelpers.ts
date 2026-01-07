import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth, VerifiedUser } from '@/lib/apiAuth';
import { ensureSchema } from '@/lib/schema';

/**
 * Standard API route handler wrapper
 * Handles auth verification and schema initialization
 */
export async function withApiHandler(
  request: NextRequest,
  handler: (user: VerifiedUser | null) => Promise<NextResponse>,
  options?: {
    allowedRoles?: Array<'admin' | 'dm' | 'player'>;
    allowUnauthenticated?: boolean;
  }
): Promise<NextResponse> {
  const authResult = await verifyRequestAuth(request, options);

  if ('errorResponse' in authResult) {
    return authResult.errorResponse;
  }

  try {
    await ensureSchema();
    return await handler(authResult.user);
  } catch (error) {
    console.error('API handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper to extract and validate ID from query params
 */
export function getRequiredParam(
  request: NextRequest,
  param: string
): { value: string } | { error: NextResponse } {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get(param);

  if (!value) {
    return {
      error: NextResponse.json(
        { error: `${param} is required` },
        { status: 400 }
      ),
    };
  }

  return { value };
}
