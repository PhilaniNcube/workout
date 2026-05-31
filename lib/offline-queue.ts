export interface QueuedSetMutation {
  id: string
  sessionId: string
  exerciseId: string
  set: {
    reps?: number | null
    weight?: number | null
    durationSeconds?: number | null
    distance?: number | null
    rir?: number | null
    effortLevel?: number | null
    isWarmup?: boolean
  }
  notes?: string | null
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("workout-offline-queue", 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("mutations")) {
        db.createObjectStore("mutations", { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", mode)
    const store = tx.objectStore("mutations")
    fn(store)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function enqueueMutation(
  sessionId: string,
  exerciseId: string,
  set: QueuedSetMutation["set"],
  notes?: string | null
): Promise<void> {
  const mutation: QueuedSetMutation = {
    id: crypto.randomUUID(),
    sessionId,
    exerciseId,
    set,
    notes: notes ?? null,
    createdAt: Date.now(),
  }
  await withStore("readwrite", (store) => {
    store.add(mutation)
  })
}

export async function getPendingMutations(): Promise<QueuedSetMutation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readonly")
    const store = tx.objectStore("mutations")
    const req = store.getAll()
    req.onsuccess = () => {
      db.close()
      resolve(
        (req.result as QueuedSetMutation[]).sort(
          (a, b) => a.createdAt - b.createdAt
        )
      )
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function getQueueSize(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readonly")
    const store = tx.objectStore("mutations")
    const req = store.count()
    req.onsuccess = () => {
      db.close()
      resolve(req.result)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function removeMutation(id: string): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(id)
  })
}

export async function clearQueue(): Promise<void> {
  await withStore("readwrite", (store) => {
    store.clear()
  })
}
