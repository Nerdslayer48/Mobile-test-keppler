export interface BoardMedia {
  id: string;
  name: string;
  kind: "image" | "video" | "rectangle" | "ellipse" | "line" | "text";
  file?: Blob;
  height?: number;
  text?: string;
  title?: string;
  flipLine?: boolean;
  x: number;
  y: number;
  width?: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("keppler-workspaces", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("boards");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Workspace storage is blocked by another tab."));
  });
}

export async function readBoard(key: string): Promise<BoardMedia[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("boards", "readonly");
      const request = transaction.objectStore("boards").get(key);
      transaction.oncomplete = () => resolve(request.result ?? []);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function writeBoard(key: string, items: BoardMedia[]): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("boards", "readwrite");
      transaction.objectStore("boards").put(items, key);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
