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

export const storage = {
  async get(key, shared = false) {
    try {
      const path = shared ? `shared/${key}` : `private/${key}`;
      const snapshot = await get(ref(db, path));
      if (snapshot.exists()) {
        return { key, value: JSON.stringify(snapshot.val()), shared };
      }
      return null;
    } catch (e) {
      return null;
    }
  },
  async set(key, value, shared = false) {
    try {
      const path = shared ? `shared/${key}` : `private/${key}`;
      const parsed = (() => { try { return JSON.parse(value); } catch { return value; } })();
      await set(ref(db, path), parsed);
      return { key, value, shared };
    } catch (e) {
      return null;
    }
  },
  async delete(key, shared = false) {
    try {
      const path = shared ? `shared/${key}` : `private/${key}`;
      await set(ref(db, path), null);
      return { key, deleted: true, shared };
    } catch (e) {
      return null;
    }
  }
};