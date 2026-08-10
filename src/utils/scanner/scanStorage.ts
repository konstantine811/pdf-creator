import type { ScannedPage } from '../../types/scanner'

const DB_NAME = 'pdf-creator-scans'
const STORE_NAME = 'scans'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB error'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const request = action(store)

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
        tx.oncomplete = () => db.close()
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
      }),
  )
}

export async function saveScannedPage(page: ScannedPage): Promise<void> {
  await runTransaction('readwrite', (store) => store.put(page))
}

export async function listScannedPages(): Promise<ScannedPage[]> {
  const pages = await runTransaction<ScannedPage[]>('readonly', (store) => store.getAll())
  return pages.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getScannedPage(id: string): Promise<ScannedPage | undefined> {
  return runTransaction('readonly', (store) => store.get(id))
}

export async function deleteScannedPage(id: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(id))
}

export async function markScannedPageAdded(id: string): Promise<void> {
  const page = await getScannedPage(id)
  if (!page) return
  await saveScannedPage({ ...page, addedToPages: true })
}

export async function clearScannedPages(): Promise<void> {
  await runTransaction('readwrite', (store) => store.clear())
}
