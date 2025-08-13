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

3. **Add a function to set custom claims:**
	In `functions/index.js` (or `functions/src/index.ts` for TypeScript):
	```js
	const functions = require('firebase-functions');
	const admin = require('firebase-admin');
	admin.initializeApp();

	exports.setUserRole = functions.https.onCall(async (data, context) => {
	  // Only allow admins to set roles (optional, but recommended)
	  if (!context.auth || !context.auth.token.admin) {
		 throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles');
	  }
	  const { uid, role } = data;
	  await admin.auth().setCustomUserClaims(uid, { role });
	  return { message: `Role ${role} set for user ${uid}` };
	});
	```

4. **Deploy your function:**
	```sh
	firebase deploy --only functions
	```

5. **Call the function from your app (client-side) using Firebase Functions SDK:**
	```js
	import { getFunctions, httpsCallable } from "firebase/functions";
	const functions = getFunctions();
	const setUserRole = httpsCallable(functions, 'setUserRole');
	await setUserRole({ uid: 'USER_UID', role: 'admin' });
	```
	- Only allow trusted users (like yourself) to call this function!

6. **On the client, after sign-in, get the custom claims:**
	```js
	const user = firebase.auth().currentUser;
	const tokenResult = await user.getIdTokenResult();
	console.log(tokenResult.claims.role); // 'admin', 'user', etc.
	```

---

Let me know if you want a deeper explanation of any step, or if you want to see how to secure the function or use it in your Next.js app!
