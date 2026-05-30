import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

async function getIdToken(): Promise<string | null> {
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") return null;

  if (!auth) throw new Error("Authentication is not initialized");
  const clientAuth = auth;

  if (clientAuth.currentUser) {
    return clientAuth.currentUser.getIdToken();
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(clientAuth, async (user) => {
      unsubscribe();
      if (!user) {
        reject(new Error("User is not authenticated"));
        return;
      }
      try {
        const token = await user.getIdToken();
        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
