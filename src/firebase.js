import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

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

function sanitizeKey(key) {
  return key.replace(/[.#$[\]/]/g, '_');
}

function restoreArrays(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object' || Array.isArray(data)) return data;
  const keys = Object.keys(data);
  if (keys.length > 0) {
    const isArray = keys.every((k, i) => String(i) === k);
    if (isArray) return keys.map(k => restoreArrays(data[k]));
  }
  const result = {};
  for (const key of keys) {
    result[key] = restoreArrays(data[key]);
  }
  return result;
}

export const storage = {
  async get(key, shared = false) {
    try {
      const path = (shared ? 'shared/' : 'private/') + sanitizeKey(key);
      const snapshot = await get(ref(db, path));
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
      const path = (shared ? 'shared/' : 'private/') + sanitizeKey(key);
      let parsed;
      try { parsed = JSON.parse(value); } catch { parsed = value; }
      await set(ref(db, path), parsed);
      return { key, value, shared };
    } catch (e) {
      console.error('Firebase set error:', e);
      return null;
    }
  },
  async delete(key, shared = false) {
    try {
      const path = (shared ? 'shared/' : 'private/') + sanitizeKey(key);
      await set(ref(db, path), null);
      return { key, deleted: true, shared };
    } catch (e) {
      return null;
    }
  },
  async list(prefix, shared = false) {
    return { keys: [], prefix, shared };
  }
};