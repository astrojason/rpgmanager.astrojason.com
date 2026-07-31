import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "./firebaseAdmin";

export type ServerUserRole = "admin" | "dm" | "player" | null;

export interface VerifiedUser {
  uid: string;
  role: ServerUserRole;
  email?: string;
}

type AuthResult = { user: VerifiedUser | null } | { errorResponse: NextResponse };

interface VerifyOptions {
  allowUnauthenticated?: boolean;
  allowedRoles?: Array<Exclude<ServerUserRole, null>>;
}

function getBearerToken(request?: NextRequest | Request): string | null {
  if (!request || !("headers" in request)) return null;
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

const DEV_USER: VerifiedUser = { uid: "dev-user", role: "admin", email: "dev@local" };

/**
 * In tests, verifyRequestAuth bypasses real token verification (and the allowedRoles
 * check below, which only runs on the real-token path). Tests that need to exercise
 * role-based behavior (e.g. GET filtering) can opt into a specific role via this header;
 * it has no effect outside NODE_ENV === "test".
 */
function getTestRole(request?: NextRequest | Request): ServerUserRole {
  const header = request && "headers" in request ? request.headers.get("x-test-role") : null;
  if (header === "admin" || header === "dm" || header === "player") return header;
  return "admin";
}

export async function verifyRequestAuth(
  request?: NextRequest | Request,
  options: VerifyOptions = {}
): Promise<AuthResult> {
  if (process.env.NODE_ENV === "test") {
    return { user: { uid: "test-user", role: getTestRole(request), email: "test@local" } };
  }

  if (process.env.NODE_ENV === "development") {
    return { user: DEV_USER };
  }

  const token = getBearerToken(request);

  if (!token) {
    if (options.allowUnauthenticated) return { user: null };
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const role = (decoded.role as ServerUserRole | undefined) ?? null;

    if (options.allowedRoles && !options.allowedRoles.includes(role as Exclude<ServerUserRole, null>)) {
      return {
        errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }

    return {
      user: {
        uid: decoded.uid,
        role,
        email: decoded.email,
      },
    };
  } catch (error) {
    console.error("Auth verification failed:", error);
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
