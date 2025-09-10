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

admin.initializeApp();

interface SetUserRoleData {
    uid: string;
    role: string;
}

// Function to assign default 'player' role to new users
// Call this from your frontend after user signs up
export const assignPlayerRole = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check if user already has a role
    const user = await admin.auth().getUser(request.auth.uid);
    const existingRole = user.customClaims?.role;

    if (existingRole) {
        logger.log(`User ${request.auth.uid} already has role: ${existingRole}`);
        return { message: `User already has role: ${existingRole}` };
    }

    // Assign player role to new user
    await admin.auth().setCustomUserClaims(request.auth.uid, { role: 'player' });
    logger.log(`Assigned 'player' role to new user: ${request.auth.uid}`);

    return { message: 'Player role assigned successfully' };
});

// Function to check current user's role and claims
export const checkMyRole = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Get user data from Firebase Auth
    const user = await admin.auth().getUser(request.auth.uid);

    return {
        uid: request.auth.uid,
        email: request.auth.token.email,
        role: user.customClaims?.role || 'No role assigned',
        allClaims: user.customClaims || {},
        tokenClaims: {
            role: request.auth.token.role || 'No role in token',
            admin: request.auth.token.admin || false
        }
    };
});

export const setUserRole = onCall<SetUserRoleData>(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Only admins can set roles')
    }

    const { uid, role } = request.data;
    await admin.auth().setCustomUserClaims(uid, { role });
    logger.log(`Role ${role} set for user ${uid}`);
    return { message: `Role ${role} set for user ${uid}` }
});

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
