/**
 * IFC Storage Service — IndexedDB para archivos IFC binarios
 * Los archivos IFC son demasiado grandes para localStorage,
 * así que se almacenan en IndexedDB localmente.
 */

const DB_NAME = 'erp_bim_storage';
const DB_VERSION = 1;
const STORE_NAME = 'ifc_files';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(new Error('No se pudo abrir IndexedDB para BIM'));
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Guarda un archivo IFC en IndexedDB
 * @param {string} id - ID único del modelo
 * @param {ArrayBuffer} arrayBuffer - Datos binarios del archivo IFC
 */
export async function saveIFCFile(id, arrayBuffer) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, data: arrayBuffer, savedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('Error guardando archivo IFC'));
  });
}

/**
 * Carga un archivo IFC desde IndexedDB
 * @param {string} id - ID del modelo
 * @returns {ArrayBuffer|null} Datos binarios o null si no existe
 */
export async function loadIFCFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(new Error('Error leyendo archivo IFC'));
  });
}

/**
 * Elimina un archivo IFC de IndexedDB
 * @param {string} id - ID del modelo
 */
export async function deleteIFCFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('Error eliminando archivo IFC'));
  });
}

/**
 * Lista todos los IDs de archivos IFC guardados
 * @returns {string[]} Array de IDs
 */
export async function listIFCFiles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Error listando archivos IFC'));
  });
}
