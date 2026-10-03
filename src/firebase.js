import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBGLaOTtQaeGX4gYtlcSaRAp-fMdwsAWOE",
  authDomain: "duffbook-c75ef.firebaseapp.com",
  databaseURL: "https://duffbook-c75ef-default-rtdb.firebaseio.com",
  projectId: "duffbook-c75ef",
  storageBucket: "duffbook-c75ef.firebasestorage.app",
  messagingSenderId: "334046831039",
  appId: "1:334046831039:web:6b52562d168c2381d8810a"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
const auth = getAuth(app);

// ─── ANONYMOUS AUTH ─────────────────────────────────────────────────────────
// Firebase Realtime Database rules have no way to see "who" is making a
// request unless the request carries a Firebase Auth token. This app has no
// login system and isn't getting one — but rules still need *some* signal to
// tell a real client apart from a bot hitting the database directly over
// the REST API. Anonymous auth provides exactly that, invisibly, with no
// UI change: every browser gets a stable, unique Firebase UID in the
// background before it's allowed to read or write anything.
//
// This does NOT identify a person, a player, or an admin. It only proves
// "this request came from something that went through the Firebase Auth
// SDK" rather than an arbitrary HTTP call. Role/identity enforcement
// (admin vs. player) is a separate, larger piece of work — see the
// accompanying security notes.
let authReadyResolve;
export const authReady = new Promise((resolve) => { authReadyResolve = resolve; });

onAuthStateChanged(auth, (user) => {
  if (user) {
    authReadyResolve(user);
  } else {
    signInAnonymously(auth).catch((e) => {
      console.error('Anonymous sign-in failed:', e);
      // Resolve anyway so storage calls don't hang forever; they will fail
      // against the database rules instead, which is the correct behavior.
      authReadyResolve(null);
    });
  }
});

// ─── ADMIN ACCOUNTS (email/password) ───────────────────────────────────────
// Players never see a login screen — the anonymous auth above covers them.
// Tournament creators can optionally sign up for a real account so their
// tournaments are tied to them permanently instead of a 3-item local device
// list. Signing in with email/password REPLACES the current session's
// anonymous user with a real one — Firebase only tracks one current user at
// a time — which is exactly what we want: the admin's writes from that point
// on carry their real, verifiable identity.
//
// Every function here returns { ok: true, ... } or { ok: false, error } so
// UI code never needs try/catch scattered around — check `.ok` and show
// `.error` if it's false.
function friendlyAuthError(e) {
  const code = e?.code || '';
  if (code.includes('email-already-in-use')) return 'An account already exists with that email. Try logging in instead.';
  if (code.includes('invalid-email')) return 'That doesn\'t look like a valid email address.';
  if (code.includes('weak-password')) return 'Password needs to be at least 6 characters.';
  if (code.includes('user-not-found') || code.includes('invalid-credential') || code.includes('wrong-password')) return 'Email or password is incorrect.';
  if (code.includes('too-many-requests')) return 'Too many attempts — wait a bit and try again.';
  if (code.includes('network-request-failed')) return 'Network error — check your connection and try again.';
  return e?.message || 'Something went wrong. Try again.';
}

export async function signUpAdmin(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    // Record the sign-up itself, not just tournaments hosted — this is what
    // lets the owner console see "signed up but never created anything,"
    // which the tournament registry alone can never show.
    try {
      await set(ref(db, `shared/owner-console/accounts/${cred.user.uid}`), {
        email: cred.user.email, createdAt: Date.now(),
      });
    } catch (e) { console.error('Account registry write error:', e); }
    return { ok: true, uid: cred.user.uid, email: cred.user.email };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export async function signInAdmin(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, uid: cred.user.uid, email: cred.user.email };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export async function resetAdminPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { ok: true };
  } catch (e) {
    // Deliberately vague to the UI on "does this email exist" — a stranger
    // probing the app shouldn't be able to tell who has an account. Still
    // logged to console so YOU can actually debug it during development;
    // this never reaches the person using the app.
    console.error('Password reset error (hidden from UI on purpose):', e?.code, e?.message);
    if (e?.code?.includes('invalid-email')) return { ok: false, error: 'That doesn\'t look like a valid email address.' };
    return { ok: true };
  }
}

export async function signOutAdmin() {
  try {
    await signOut(auth);
    // Immediately restore an anonymous session so the app keeps working
    // for whoever's using this device next, without a visible login screen.
    await signInAnonymously(auth);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

// Reactive subscription for the currently signed-in admin account. Calls
// back with null when signed out or signed in only anonymously, or
// { uid, email } when a real admin account is active. Returns an
// unsubscribe function.
export function onAdminAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
      callback({ uid: user.uid, email: user.email });
    } else {
      callback(null);
    }
  });
}

// ─── DEVICE ID ────────────────────────────────────────────────────────────────
// Scopes all "private" Firebase keys to this specific device so that
// joining the same round on two phones doesn't mix up identity or admin state.
// Stored in localStorage so it persists across page reloads on the same browser.
function getDeviceId() {
  try {
    let id = localStorage.getItem('duffbook_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('duffbook_device_id', id);
    }
    return id;
  } catch {
    // localStorage unavailable (private browsing edge case) — use session-only id
    if (!getDeviceId._fallback) {
      getDeviceId._fallback = 'dev_' + Math.random().toString(36).slice(2, 10);
    }
    return getDeviceId._fallback;
  }
}

function sanitizeKey(key) {
  return key.replace(/[.#$[\]/]/g, '_');
}

function makePath(key, shared) {
  if (shared) return 'shared/' + sanitizeKey(key);
  // Device-scoped private path — prevents cross-device identity bleed
  return 'private/' + sanitizeKey(getDeviceId()) + '/' + sanitizeKey(key);
}

function isNumericObject(obj) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return keys.every(k => /^\d+$/.test(k) && parseInt(k) < keys.length + 10);
}

function restoreArrays(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(restoreArrays);
  if (isNumericObject(data)) {
    const maxIndex = Math.max(...Object.keys(data).map(Number));
    const arr = Array(maxIndex + 1).fill(null);
    for (const key of Object.keys(data)) {
      arr[parseInt(key)] = restoreArrays(data[key]);
    }
    return arr;
  }
  const result = {};
  for (const key of Object.keys(data)) {
    result[key] = restoreArrays(data[key]);
  }
  return result;
}

export const storage = {
  async get(key, shared = false) {
    try {
      await authReady;
      const snapshot = await get(ref(db, makePath(key, shared)));
      if (snapshot.exists()) {
        const restored = restoreArrays(snapshot.val());
        return { key, value: JSON.stringify(restored), shared };
      }
      return null;
    } catch (e) {
      console.error('Firebase get error:', e);
      return null;
    }
  },

  async set(key, value, shared = false) {
    try {
      await authReady;
      let parsed;
      try { parsed = JSON.parse(value); } catch { parsed = value; }
      await set(ref(db, makePath(key, shared)), parsed);
      return { key, value, shared };
    } catch (e) {
      console.error('Firebase set error:', e);
      return null;
    }
  },

  async delete(key, shared = false) {
    try {
      await authReady;
      await set(ref(db, makePath(key, shared)), null);
      return { key, deleted: true, shared };
    } catch (e) {
      return null;
    }
  },

  async list(prefix, shared = false) {
    return { keys: [], prefix, shared };
  },

  // Offline-capable real-time subscription via onValue().
  // Firebase caches onValue data locally so the app works offline.
  subscribe(key, shared = false, callback) {
    let unsubscribe = () => {};
    let cancelled = false;
    authReady.then(() => {
      if (cancelled) return;
      try {
        unsubscribe = onValue(
          ref(db, makePath(key, shared)),
          (snapshot) => {
            try {
              if (snapshot.exists()) {
                const restored = restoreArrays(snapshot.val());
                callback({ key, value: JSON.stringify(restored), shared });
              } else {
                callback(null);
              }
            } catch (e) {
              console.error('Firebase subscribe callback error:', e);
            }
          },
          (error) => console.error('Firebase subscribe error:', error)
        );
      } catch (e) {
        console.error('Firebase subscribe setup error:', e);
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  },

  // Expose device ID so tests can inject a known ID for isolation
  getDeviceId,
};

// ─── OWNER CONSOLE REGISTRY ─────────────────────────────────────────────────
// A lightweight index of every tournament ever created, written by whoever
// creates it, readable only by the app owner (enforced in database rules,
// not here — this file just provides the plumbing).
//
// Deliberately NOT built on the `storage` get/set-a-whole-blob pattern above:
// that pattern reads the whole object, edits it, writes it back, which is a
// real race if two tournaments get created in the same moment. This writes
// directly to each tournament's own nested path instead, so two creations
// can never step on each other.
export async function registerTournamentInOwnerIndex(code, meta) {
  try {
    await authReady;
    await set(ref(db, `shared/owner-console/tournaments/${sanitizeKey(code)}`), {
      code, ...meta, registeredAt: Date.now(),
    });
  } catch (e) {
    console.error('Owner registry write error:', e);
  }
}

// Owner-only: fetch every account that's ever signed up, regardless of
// whether they went on to create a tournament. Same fail-safe-empty
// behavior as the tournament index above.
export async function getOwnerAccountIndex() {
  try {
    await authReady;
    const snapshot = await get(ref(db, 'shared/owner-console/accounts'));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (e) {
    console.error('Account registry read error (expected if not the owner):', e);
    return {};
  }
}

// Owner-only: fetch the entire registry in one read. Firebase rules should
// reject this for anyone whose UID isn't the owner's — if that read fails,
// this resolves to an empty object rather than throwing, so a non-owner
// account never sees a scary error, just an empty console.
export async function getOwnerTournamentIndex() {
  try {
    await authReady;
    const snapshot = await get(ref(db, 'shared/owner-console/tournaments'));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (e) {
    console.error('Owner registry read error (expected if not the owner):', e);
    return {};
  }
}