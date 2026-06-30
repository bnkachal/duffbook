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

function sanitizeData(data) {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  const result = {};
  for (const key of Object.keys(data)) {
    const cleanKey = sanitizeKey(key);
    result[cleanKey] = sanitizeData(data[key]);
  }
  return result;
}

export const storage = {
  async get(key, shared = false) {
    try {
      const path = (shared ? 'shared/' : 'private/') + sanitizeKey(key);
      const snapshot = await get(ref(db, path));
      if (snapshot.exists()) {
        return { key, value: JSON.stringify(snapshot.val()), shared };
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
      const clean = sanitizeData(parsed);
      await set(ref(db, path), clean);
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