import { initializeApp } from 'firebase/app';
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
    try {
      const unsubscribe = onValue(
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
      return unsubscribe;
    } catch (e) {
      console.error('Firebase subscribe setup error:', e);
      return () => {};
    }
  },

  // Expose device ID so tests can inject a known ID for isolation
  getDeviceId,
};