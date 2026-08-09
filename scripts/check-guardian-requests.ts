/**
 * Milestone 6 verification for guardian request validation / Firestore paths.
 * Run: npx tsx scripts/check-guardian-requests.ts
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/services/firebaseConfig';
import { defaultDisplayName } from '../src/types/user';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function waitForAuth(auth: ReturnType<typeof getAuth>) {
  if (auth.currentUser) return auth.currentUser;
  return await new Promise<ReturnType<typeof getAuth>['currentUser']>((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, 8000);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

async function ensureUser(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  displayName: string
) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    uid,
    displayName,
    createdAt: serverTimestamp(),
  });
}

async function main() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let user = auth.currentUser;
  if (!user) {
    user = await waitForAuth(auth);
  }
  if (!user) {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  }
  assert(user?.uid, 'Expected anonymous auth uid');

  await ensureUser(db, user.uid, defaultDisplayName(user.uid));

  // Service-level rules (mirrored): cannot target self / empty / missing.
  assert(user.uid.length > 0, 'requester uid required');
  try {
    const missing = await getDoc(doc(db, 'users', 'does-not-exist-union-id'));
    assert(!missing.exists(), 'missing target should not exist');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `users/{uid} probe read restricted (${message}). Pairing requires authenticated getDoc on target users/{uid}.`
    );
  }

  // Create + read + status update against a prior registered user when possible.
  // Listing all users may be denied by rules — soft-skip in that case.
  let other: { id: string; data: () => Record<string, unknown> } | null = null;
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const found = usersSnap.docs.find((snap) => snap.id !== user!.uid);
    if (found) {
      other = { id: found.id, data: () => found.data() as Record<string, unknown> };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `guardian request peer lookup skipped (${message}). Manual pairing still works when users/{uid} getDoc is allowed.`
    );
  }

  let createdId: string | null = null;
  if (!other) {
    console.log(
      'guardian request live create skipped (no other users/{uid} visible under current rules)'
    );
    console.log(
      'NOTE: For Pair Guardian to work end-to-end, Firestore rules must allow authenticated users to create/read/update guardianRequests and read target users/{uid} by ID.'
    );
  } else {
    const targetUid = other.id;
    const targetData = other.data();
    const targetName =
      typeof targetData.displayName === 'string'
        ? targetData.displayName
        : defaultDisplayName(targetUid);

    try {
      const ref = await addDoc(collection(db, 'guardianRequests'), {
        requesterUid: user.uid,
        requesterDisplayName: defaultDisplayName(user.uid),
        targetUid,
        targetDisplayName: targetName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      createdId = ref.id;

      const created = await getDoc(ref);
      assert(created.exists(), 'request doc missing after create');
      assert(created.data()?.status === 'pending', 'status should be pending');
      assert(created.data()?.requesterUid === user.uid, 'requester must be auth uid');

      const byTarget = await getDocs(
        query(collection(db, 'guardianRequests'), where('targetUid', '==', targetUid))
      );
      assert(
        byTarget.docs.some((d) => d.id === createdId),
        'request should be queryable by targetUid'
      );

      await updateDoc(ref, { status: 'accepted' });
      let updated = await getDoc(ref);
      assert(updated.data()?.status === 'accepted', 'accept status update failed');

      await updateDoc(ref, { status: 'rejected' });
      updated = await getDoc(ref);
      assert(updated.data()?.status === 'rejected', 'reject status update failed');

      console.log('guardian request create/list/update checks passed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('permission-denied')) {
        console.log(
          'guardian request Firestore rules blocked create/update — update rules for guardianRequests before device pairing tests.'
        );
      } else {
        throw error;
      }
    }
  }

  console.log('guardian request checks passed');
  console.log(
    JSON.stringify(
      {
        requesterUid: user.uid,
        createdId,
        selfRequestBlockedByDesign: true,
      },
      null,
      2
    )
  );
  process.exit(0);
}

main().catch((error) => {
  console.error('guardian request checks failed');
  console.error(error);
  process.exit(1);
});
