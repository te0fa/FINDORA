'use client'

/**
 * FINDORA — Client-Side PWA Offline Storage & Sync Manager
 * Utilizes IndexedDB to queue and submit offline quotes for field agents.
 */

const DB_NAME = 'findora_offline_db';
const STORE_NAME = 'pending_quotes';

interface OfflineQuote {
  id: string;
  requestId: string;
  merchantName: string;
  priceAmount: number;
  notes: string;
  timestamp: number;
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window undefined'));
    
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a new offline quote locally.
 */
export async function saveQuoteOffline(quote: Omit<OfflineQuote, 'id' | 'timestamp'>): Promise<string> {
  const db = await openOfflineDatabase();
  const id = `off-${Math.random().toString(36).substring(2, 9)}`;
  const record: OfflineQuote = {
    ...quote,
    id,
    timestamp: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Returns all saved offline quotes.
 */
export async function getOfflineQuotes(): Promise<OfflineQuote[]> {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes an offline quote by ID.
 */
export async function deleteOfflineQuote(id: string): Promise<boolean> {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Automatically uploads all offline quotes to the server when connection is restored.
 */
export async function syncOfflineQuotesToServer(uploadAction: (quote: any) => Promise<any>): Promise<number> {
  const quotes = await getOfflineQuotes();
  if (quotes.length === 0) return 0;

  console.log(`[PWA] Found ${quotes.length} offline quotes to sync.`);
  let count = 0;

  for (const quote of quotes) {
    try {
      await uploadAction({
        requestId: quote.requestId,
        merchantName: quote.merchantName,
        priceAmount: quote.priceAmount,
        notes: quote.notes
      });
      await deleteOfflineQuote(quote.id);
      count++;
    } catch (err) {
      console.error('[PWA] Failed to sync offline quote ID:', quote.id, err);
    }
  }

  return count;
}
