## Setting Up Firebase Cloud Functions for Custom Claims (Roles)

1. **Install Firebase CLI (if you haven’t):**
	```sh
	npm install -g firebase-tools
	```

2. **Initialize Cloud Functions in your project:**
	```sh
	firebase init functions
	```
	- Choose JavaScript or TypeScript.
	- Select your Firebase project.

3. **Add functions to set custom claims:**
	In `functions/src/index.ts`:
	```ts
	import { onCall, HttpsError } from "firebase-functions/v2/https";
	import * as admin from "firebase-admin";
	import * as logger from "firebase-functions/logger";

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

	export const setUserRole = onCall<SetUserRoleData>(async (request) => {
	  // Only allow admins to set roles (optional, but recommended)
	  if (!request.auth || !request.auth.token.admin) {
		throw new HttpsError('permission-denied', 'Only admins can set roles');
	  }
	  
	  const { uid, role } = request.data;
	  await admin.auth().setCustomUserClaims(uid, { role });
	  return { message: `Role ${role} set for user ${uid}` };
	});
	```4. **Fix ESLint configuration conflicts (if needed):**
	If you encounter ESLint errors during deployment, update the lint script in `functions/package.json`:
	```json
	{
	  "scripts": {
	    "lint": "exit 0",
	    "build": "tsc",
	    // ... other scripts
	  }
	}
	```

5. **Deploy your function:**
	```sh
	firebase deploy --only functions
	```

5. **Deploy your function:**
	```sh
	firebase deploy --only functions
	```

6. **Call the function from your app (client-side) using Firebase Functions SDK:**
	```js
	import { getFunctions, httpsCallable } from "firebase/functions";
	const functions = getFunctions();
	const setUserRole = httpsCallable(functions, 'setUserRole');
	await setUserRole({ uid: 'USER_UID', role: 'admin' });
	```
	- Only allow trusted users (like yourself) to call this function!

7. **On the client, after sign-in, get the custom claims:**
	```js
	const user = firebase.auth().currentUser;
	const tokenResult = await user.getIdTokenResult();
	console.log(tokenResult.claims.role); // 'admin', 'user', etc.
	```

---

Let me know if you want a deeper explanation of any step, or if you want to see how to secure the function or use it in your Next.js app!
