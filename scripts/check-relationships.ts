/**
 * Live Milestone 7 verification with separate Firebase Auth identities.
 * Run: npx tsx scripts/check-relationships.ts
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
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
import { relationshipDocId } from '../src/types/guardianRelationship';
import { defaultDisplayName } from '../src/types/user';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function ensureAnon(appName: string) {
  const app = getApps().some((a) => a.name === appName)
    ? getApp(appName)
    : initializeApp(firebaseConfig, appName);
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (!auth.currentUser) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Auth timeout ${appName}`)),
        10000
      );
      const unsub = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
            clearTimeout(timer);
            unsub();
            resolve();
            return;
          }
          await signInAnonymously(auth);
        } catch (error) {
          clearTimeout(timer);
          unsub();
          reject(error);
        }
      });
    });
  }

  const user = auth.currentUser;
  assert(user, `missing user ${appName}`);
  const displayName = defaultDisplayName(user.uid);
  const uref = doc(db, 'users', user.uid);
  if (!(await getDoc(uref)).exists()) {
    await setDoc(uref, {
      uid: user.uid,
      displayName,
      createdAt: serverTimestamp(),
    });
  }
  return { app, auth, db, uid: user.uid, displayName };
}

async function main() {
  const results: Record<string, string> = {};

  // A/C = guardian requesters, B = protected target (accepts)
  const A = await ensureAnon('m7-guardian');
  const B = await ensureAnon('m7-owner');
  const C = await ensureAnon('m7-guardian-2');
  assert(
    A.uid !== B.uid && A.uid !== C.uid && B.uid !== C.uid,
    'need 3 distinct users'
  );

  // Reject path
  const rejectRef = await addDoc(collection(A.db, 'guardianRequests'), {
    requesterUid: A.uid,
    requesterDisplayName: A.displayName,
    targetUid: B.uid,
    targetDisplayName: B.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(B.db, 'guardianRequests', rejectRef.id), {
    status: 'rejected',
  });
  const rejectRel = await getDoc(
    doc(B.db, 'guardianRelationships', relationshipDocId(B.uid, A.uid))
  ).catch(() => null);
  assert(!rejectRel || !rejectRel.exists(), 'reject must not create relationship');
  results['rejectNoRelationship'] = 'PASS';

  // Accept request (status only), then create relationship as owner B
  const acceptRef = await addDoc(collection(C.db, 'guardianRequests'), {
    requesterUid: C.uid,
    requesterDisplayName: C.displayName,
    targetUid: B.uid,
    targetDisplayName: B.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(B.db, 'guardianRequests', acceptRef.id), {
    status: 'accepted',
  });
  results['acceptRequestStatus'] = 'PASS';

  const relId = relationshipDocId(B.uid, C.uid);
  try {
    await setDoc(doc(B.db, 'guardianRelationships', relId), {
      ownerUid: B.uid,
      guardianUid: C.uid,
      ownerDisplayName: B.displayName,
      guardianDisplayName: C.displayName,
      relationship: 'Guardian',
      trusted: true,
      enabled: true,
      accepted: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      JSON.stringify(
        {
          results: {
            ...results,
            relationshipWrite:
              'BLOCKED — publish firestore.rules guardianRelationships section',
          },
          users: { A: A.uid, B: B.uid, C: C.uid },
          error: message,
        },
        null,
        2
      )
    );
    console.error(
      'Publish /workspace/firestore.rules (or merge the guardianRelationships match block) in Firebase Console, then re-run npm run check:relationships'
    );
    process.exit(2);
  }

  const ownerView = await getDocs(
    query(collection(B.db, 'guardianRelationships'), where('ownerUid', '==', B.uid))
  );
  assert(
    ownerView.docs.some((d) => d.id === relId),
    'owner should see relationship in My Guardians query'
  );
  results['ownerSeesGuardian'] = 'PASS';

  const guardianView = await getDocs(
    query(
      collection(C.db, 'guardianRelationships'),
      where('guardianUid', '==', C.uid)
    )
  );
  assert(
    guardianView.docs.some((d) => d.id === relId),
    'guardian should see relationship in People I Protect query'
  );
  results['guardianSeesOwner'] = 'PASS';

  // Multiple guardians
  const acceptARef = await addDoc(collection(A.db, 'guardianRequests'), {
    requesterUid: A.uid,
    requesterDisplayName: A.displayName,
    targetUid: B.uid,
    targetDisplayName: B.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(B.db, 'guardianRequests', acceptARef.id), {
    status: 'accepted',
  });
  const relAId = relationshipDocId(B.uid, A.uid);
  await setDoc(doc(B.db, 'guardianRelationships', relAId), {
    ownerUid: B.uid,
    guardianUid: A.uid,
    ownerDisplayName: B.displayName,
    guardianDisplayName: A.displayName,
    relationship: 'Guardian',
    trusted: true,
    enabled: true,
    accepted: true,
    createdAt: serverTimestamp(),
  });
  const multi = await getDocs(
    query(collection(B.db, 'guardianRelationships'), where('ownerUid', '==', B.uid))
  );
  assert(multi.size >= 2, 'multiple guardians should be listed for owner');
  results['multipleGuardians'] = `PASS count=${multi.size}`;

  await updateDoc(doc(B.db, 'guardianRelationships', relId), { enabled: false });
  const disabled = await getDoc(doc(B.db, 'guardianRelationships', relId));
  assert(disabled.data()?.enabled === false, 'enabled=false not saved');
  results['disableRespected'] = 'PASS';

  let unauthorizedBlocked = false;
  try {
    await updateDoc(doc(A.db, 'guardianRelationships', relId), { enabled: true });
  } catch {
    unauthorizedBlocked = true;
  }
  assert(unauthorizedBlocked, 'unauthorized update should fail');
  results['unauthorizedCannotModify'] = 'PASS';

  await deleteDoc(doc(B.db, 'guardianRelationships', relId)).catch(() => undefined);
  await deleteDoc(doc(B.db, 'guardianRelationships', relAId)).catch(() => undefined);

  console.log(
    JSON.stringify({ results, users: { A: A.uid, B: B.uid, C: C.uid } }, null, 2)
  );

  const failed = Object.entries(results).filter(([, v]) => !v.startsWith('PASS'));
  if (failed.length) {
    console.error('FAILED', failed);
    process.exit(1);
  }
  console.log('relationship checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('relationship checks failed');
  console.error(error);
  process.exit(1);
});
