import { createStore, get, set } from 'idb-keyval';
import { STORAGE_KEYS } from '../constants';

export class LibraryIndexedDBAdapter {
  /** IndexedDB database and store name */
  static idb_name = STORAGE_KEYS.IDB_LIBRARY;
  /** library data store key */
  static key = 'libraryData';

  static store = createStore(
    `${LibraryIndexedDBAdapter.idb_name}-db`,
    `${LibraryIndexedDBAdapter.idb_name}-store`,
  );

  static async load() {
    const IDBData = await get(
      LibraryIndexedDBAdapter.key,
      LibraryIndexedDBAdapter.store,
    );

    return IDBData || null;
  }

  static save(data) {
    return set(
      LibraryIndexedDBAdapter.key,
      data,
      LibraryIndexedDBAdapter.store,
    );
  }
}
