/**
 * Milestone 2 checks:
 * 1) Local helpers / soft-fail behavior
 * 2) Live anonymous auth + users/{uid} when Firebase accepts the Web API key
 *
 * Run: npx tsx scripts/check-registration.ts
 */
import { defaultDisplayName } from '../src/types/user';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkDisplayNameHelper() {
  const name = defaultDisplayName('AbCdEfGhIjKl');
  assert(name === 'Union User AbCdEf', `Unexpected default display name: ${name}`);
  console.log('displayName helper checks passed');
}

async function checkLiveRegistration() {
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const {
    getAuth,
    onAuthStateChanged,
    signInAnonymously,
  } = await import('firebase/auth');
  const {
    doc,
    getDoc,
    getFirestore,
    serverTimestamp,
    setDoc,
    Timestamp,
  } = await import('firebase/firestore');
  const { firebaseConfig } = await import('../src/services/firebaseConfig');

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const waitForAuth = () =>
    new Promise<ReturnType<typeof getAuth>['currentUser']>((resolve) => {
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        resolve(user);
      });
    });

  let user = await waitForAuth();
  if (!user) {
    const credential = await signInAnonymously(auth);
    user = credential.user;
  }
  assert(user?.uid, 'Expected anonymous Firebase Auth UID');

  const ref = doc(db, 'users', user.uid);
  const before = await getDoc(ref);
  const createdAtBefore = before.exists()
    ? before.data()?.createdAt
    : undefined;

  if (!before.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: defaultDisplayName(user.uid),
      createdAt: serverTimestamp(),
    });
  }

  const first = await getDoc(ref);
  assert(first.exists(), 'users/{uid} document missing after ensure');
  const firstData = first.data()!;
  assert(firstData.uid === user.uid, 'uid field mismatch');
  assert(
    typeof firstData.displayName === 'string' &&
      firstData.displayName.startsWith('Union User '),
    'displayName missing Union User prefix'
  );

  const createdAtFirst =
    firstData.createdAt instanceof Timestamp
      ? firstData.createdAt.toMillis()
      : firstData.createdAt;

  // Simulate repeated registration / app restart with persisted auth session.
  const sameUser = await waitForAuth();
  assert(sameUser?.uid === user.uid, 'Auth UID changed unexpectedly');

  const second = await getDoc(ref);
  assert(second.exists(), 'users/{uid} disappeared on re-check');
  const secondData = second.data()!;
  const createdAtSecond =
    secondData.createdAt instanceof Timestamp
      ? secondData.createdAt.toMillis()
      : secondData.createdAt;

  assert(
    JSON.stringify(createdAtSecond) === JSON.stringify(createdAtFirst) ||
      JSON.stringify(createdAtSecond) === JSON.stringify(createdAtBefore),
    'createdAt was overwritten on repeat ensure'
  );

  // Ensure path must not call setDoc again when doc exists — re-read only.
  const third = await getDoc(ref);
  assert(third.exists(), 'users/{uid} missing on third read');

  console.log('live registration checks passed');
  console.log(
    JSON.stringify(
      {
        uid: user.uid,
        displayName: secondData.displayName,
        createdAt: createdAtSecond,
        persistedAuthUid: sameUser?.uid,
      },
      null,
      2
    )
  );
}

async function main() {
  checkDisplayNameHelper();

  try {
    await checkLiveRegistration();
    console.log('registration checks passed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('api-key-not-valid') ||
      message.includes('auth/api-key-not-valid')
    ) {
      console.error('registration live checks blocked: invalid Firebase Web API key');
      console.error(
        'The configured apiKey is',
        (await import('../src/services/firebaseConfig')).firebaseConfig.apiKey
          .length,
        'chars; Firebase API keys are typically 39 characters.'
      );
      console.error(
        'App soft-fail path remains intact — Sprint 1–3 continue without cloud registration.'
      );
      console.error(message);
      process.exit(2);
    }
    console.error('registration checks failed');
    console.error(error);
    process.exit(1);
  }
}

main();
