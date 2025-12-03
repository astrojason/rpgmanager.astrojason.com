/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const isTest = process.env.NODE_ENV === 'test';
const testAuthClient = (globalThis as any).__adminAuthMock;
if (!admin.apps.length) {
    if (isTest) {
        admin.initializeApp({
            projectId: 'test',
            credential: {
                getAccessToken: async () => ({ access_token: 'test-token', expires_in: 3600 })
            } as any
        });
    } else {
        admin.initializeApp();
    }
}
const authClient = (isTest && testAuthClient) ? testAuthClient : admin.auth();

interface SetUserRoleData {
    uid: string;
    role: string;
}

// Function to assign default 'player' role to new users
// Call this from your frontend after user signs up
export const assignPlayerRoleHandler = async (request: any) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check if user already has a role
    const user = await authClient.getUser(request.auth.uid);
    const existingRole = user.customClaims?.role;

    if (existingRole) {
        logger.log(`User ${request.auth.uid} already has role: ${existingRole}`);
        return { message: `User already has role: ${existingRole}` };
    }

    // Assign player role to new user
    await authClient.setCustomUserClaims(request.auth.uid, { role: 'player' });
    logger.log(`Assigned 'player' role to new user: ${request.auth.uid}`);

    return { message: 'Player role assigned successfully' };
};
export const assignPlayerRole = onCall(assignPlayerRoleHandler);

// Function to check current user's role and claims
export const checkMyRoleHandler = async (request: any) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Get user data from Firebase Auth
    const user = await authClient.getUser(request.auth.uid);

    return {
        uid: request.auth.uid,
        email: request.auth.token.email,
        role: user.customClaims?.role || 'No role assigned',
        allClaims: user.customClaims || {},
        tokenClaims: {
            role: request.auth.token.role || 'No role in token'
        }
    };
};
export const checkMyRole = onCall(checkMyRoleHandler);

export const setUserRoleHandler = async (request: any) => {
    // Check if the caller is an admin
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can set roles')
    }

    const { uid, role } = request.data;

    // Validate role
    const validRoles = ['player', 'dm', 'admin'];
    if (!validRoles.includes(role)) {
        throw new HttpsError('invalid-argument', 'Invalid role specified');
    }

    await authClient.setCustomUserClaims(uid, { role });

    logger.log(`Role ${role} set for user ${uid} by ${request.auth.uid}`);
    return { message: `Role ${role} set for user ${uid}` }
};
export const setUserRole = onCall<SetUserRoleData>(setUserRoleHandler);

// Function to list all users (admin only)
export const listUsersHandler = async (request: any) => {
    // Check if the caller is an admin
    if (!request.auth || request.auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can list users');
    }

    try {
        const listUsersResult = await authClient.listUsers(1000); // Max 1000 users

        const users = listUsersResult.users.map(userRecord => ({
            uid: userRecord.uid,
            email: userRecord.email || '',
            displayName: userRecord.displayName || '',
            role: userRecord.customClaims?.role || 'No role',
            lastSignIn: userRecord.metadata.lastSignInTime,
            created: userRecord.metadata.creationTime,
        }));

        return users;
    } catch (error) {
        logger.error('Error listing users:', error);
        throw new HttpsError('internal', 'Failed to list users');
    }
};
export const listUsers = onCall(listUsersHandler);

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
