import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly dbName = 'senatiTaskDB';
  private readonly storeName = 'entregas_pendientes';

  async abrirDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async guardarEntregaLocal(entrega: Record<string, unknown>): Promise<void> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const registro = {
        ...entrega,
        fechaRegistro: new Date().toISOString(),
        estadoSincronizacion: 'PENDIENTE'
      };

      const request = store.add(registro);

      transaction.oncomplete = () => {
        console.log('✅ Entrega/observación guardada localmente en IndexedDB');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
      request.onerror = () => reject(request.error);
    });
  }
}
