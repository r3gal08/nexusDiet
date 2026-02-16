// IndexedDB Wrapper for Nexus Diet

class NexusDB {
    constructor() {
        this.dbName = 'NexusDietDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("NexusDB open error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create an objectStore to hold page visits.
                // We use the timestamp as a key, effectively a log.
                // Alternatively, use autoIncrement key and index by timestamp.
                if (!db.objectStoreNames.contains('visits')) {
                    const store = db.createObjectStore('visits', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('url', 'url', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('wordCount', 'wordCount', { unique: false });
                }
            };
        });
    }

    async addVisit(data) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readwrite');
            const store = transaction.objectStore('visits');
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getRecentVisits(limit = 10) {
        await this.open();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['visits'], 'readonly');
            const store = transaction.objectStore('visits');
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev'); // descending order

            const results = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getStats() {
        await this.open();
        return new Promise((resolve, reject) => {
            // Calculate stats for "today"
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const isoToday = todayStart.toISOString();

            const transaction = this.db.transaction(['visits'], 'readonly');
            const store = transaction.objectStore('visits');
            const index = store.index('timestamp');
            const range = IDBKeyRange.lowerBound(isoToday);

            let count = 0;
            let totalWords = 0;

            const request = index.openCursor(range);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    count++;
                    if (cursor.value.wordCount) {
                        totalWords += parseInt(cursor.value.wordCount) || 0;
                    }
                    cursor.continue();
                } else {
                    resolve({
                        pagesToday: count,
                        wordsToday: totalWords
                    });
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }
}

// Export a singleton instance
const db = new NexusDB();
export default db;
