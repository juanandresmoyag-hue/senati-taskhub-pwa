import { Injectable } from '@angular/core';

export type EstadoSincronizacion = 'PENDIENTE' | 'SINCRONIZADO';

export interface EntregaLocal {
  id: number;
  identificadorLocal: string;
  tareaId: number;
  comentario: string;
  fechaRegistro: string;
  estadoSincronizacion: EstadoSincronizacion;
}

export type NuevaEntregaLocal = Omit<EntregaLocal, 'id'>;

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

  async guardarEntregaLocal(entrega: NuevaEntregaLocal): Promise<EntregaLocal> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const request = transaction.objectStore(this.storeName).add(entrega);
      let id: number;

      request.onsuccess = () => {
        id = request.result as number;
      };

      transaction.oncomplete = () => {
        db.close();
        resolve({ ...entrega, id });
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error ?? new Error('No se pudo guardar la entrega local.'));
      };
    });
  }

  async obtenerEntregas(): Promise<EntregaLocal[]> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).getAll();

      request.onsuccess = () => resolve(request.result as EntregaLocal[]);
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => db.close();
      transaction.onabort = () => {
        db.close();
        reject(transaction.error ?? new Error('No se pudieron consultar las entregas locales.'));
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }

  async eliminarEntrega(id: number): Promise<void> {
    const db = await this.abrirDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.objectStore(this.storeName).delete(id);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error ?? new Error('No se pudo eliminar la entrega local.'));
      };
    });
  }
}
