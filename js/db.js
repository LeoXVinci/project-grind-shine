/**
 * PROJECT GRIND & SHINE
 * IndexedDB Persistent Storage Module
 * Single-user, zero-backend, client-side relational storage
 */

const DB = (() => {
  const DB_NAME = 'GrindAndShineDB';
  const DB_VERSION = 1;

  let dbInstance = null;

  function openDatabase() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Habits Store
        if (!db.objectStoreNames.contains('habits')) {
          const habitStore = db.createObjectStore('habits', { keyPath: 'id' });
          habitStore.createIndex('archived', 'archived', { unique: false });
          habitStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 2. Entries Store
        if (!db.objectStoreNames.contains('entries')) {
          const entryStore = db.createObjectStore('entries', { keyPath: 'id' });
          entryStore.createIndex('habitId', 'habitId', { unique: false });
          entryStore.createIndex('date', 'date', { unique: false });
          entryStore.createIndex('habitDate', ['habitId', 'date'], { unique: true });
        }

        // 3. Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 4. Motivation Store
        if (!db.objectStoreNames.contains('motivation')) {
          db.createObjectStore('motivation', { keyPath: 'id' });
        }

        // 5. Metadata Store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Generic transaction helper
  async function performTransaction(storeName, mode, callback) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let result;

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = (e) => reject(e.target.error);
      transaction.onabort = (e) => reject(e.target.error || new Error('Transaction aborted'));

      result = callback(store, transaction);
    });
  }

  return {
    async init() {
      const db = await openDatabase();
      // Ensure initial metadata
      const meta = await this.get('metadata', 'app_version');
      if (!meta) {
        await this.put('metadata', { key: 'app_version', value: '1.0.0', initializedAt: new Date().toISOString() });
        await this.put('metadata', { key: 'db_version', value: DB_VERSION });
      }
      return db;
    },

    async get(storeName, key) {
      return performTransaction(storeName, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async getAll(storeName) {
      return performTransaction(storeName, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async getAllByIndex(storeName, indexName, value) {
      return performTransaction(storeName, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const index = store.index(indexName);
          const req = index.getAll(value);
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async put(storeName, item) {
      return performTransaction(storeName, 'readwrite', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.put(item);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async putBatch(storeName, items) {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(e.target.error);

        for (const item of items) {
          store.put(item);
        }
      });
    },

    async delete(storeName, key) {
      return performTransaction(storeName, 'readwrite', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async clear(storeName) {
      return performTransaction(storeName, 'readwrite', (store) => {
        return new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = () => reject(req.error);
        });
      });
    },

    async clearAllData() {
      const stores = ['habits', 'entries', 'settings', 'motivation', 'metadata'];
      for (const s of stores) {
        await this.clear(s);
      }
      await this.put('metadata', { key: 'app_version', value: '1.0.0', initializedAt: new Date().toISOString() });
      await this.put('metadata', { key: 'db_version', value: DB_VERSION });
      return true;
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DB;
}
