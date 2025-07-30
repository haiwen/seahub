import debounce from 'lodash.debounce';
import {
  createStore,
  entries,
  del,
  getMany,
  set,
  setMany,
} from 'idb-keyval';
import Locker from './locker';
import FileManager from './file-manager';
import { updateBrowserStateVersion } from './tab-sync';
import { SAVE_TO_LOCAL_STORAGE_TIMEOUT, STORAGE_KEYS } from '../constants';
import { saveDataStateToLocalStorage } from './local-storage';

const defaultOnFilesSaved = () => {};

const ONE_DAY = 24 * 60 * 60 * 1000;

const filesStore = createStore('seafile-files-db', 'seafile-files-store');

class LocalFileManager extends FileManager {
  clearObsoleteFiles = async ({ currentFileIds }) => {
    await entries(filesStore).then(entries => {
      for (const [id, imageData] of entries) {
        if (!imageData.lastRetrieved || Date.now() - imageData.lastRetrieved > ONE_DAY && currentFileIds.includes(id)) {
          del(id, filesStore);
        }
      }
    });
  };
}

class LocalData {
  static _save = debounce(
    async (docUuid, elements, appState, files, onFilesSaved) => {
      saveDataStateToLocalStorage(docUuid, elements, appState);

      await this.fileStorage.saveFiles({ elements, files });

      onFilesSaved();
    },
    SAVE_TO_LOCAL_STORAGE_TIMEOUT,
  );

  static save = (docUuid, elements, appState, files, onFilesSaved = defaultOnFilesSaved) => {
    // if (!this.isSavePaused()) {
    this._save(docUuid, elements, appState, files, onFilesSaved);
    // }
  };


  static flushSave = () => {
    this._save.flush();
  };

  static locker = new Locker();

  static pauseSave = (lockType) => {
    this.locker.lock(lockType);
  };

  static resumeSave = (lockType) => {
    this.locker.unlock(lockType);
  };

  static isSavePaused = () => {
    return document.hidden || this.locker.isLocked();
  };

  static fileStorage = new LocalFileManager({
    getFiles(ids) {
      return getMany(ids, filesStore).then(
        async (filesData) => {
          const loadedFiles = [];
          const erroredFiles = new Map();

          const filesToSave = [];
          filesData.forEach((data, index) => {
            const id = ids[index];
            if (data) {
              const _data = {
                ...data,
                lastRetrieved: Date.now(),
              };
              filesToSave.push([id, _data]);
              loadedFiles.push(_data);
            } else {
              erroredFiles.set(id, true);
            }
          });

          try {
            setMany(filesToSave, filesStore);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn(error);
          }

          return { loadedFiles, erroredFiles };
        }
      );
    },
    async saveFiles({ addedFiles }) {
      const savedFiles = new Map();
      const erroredFiles = new Map();

      updateBrowserStateVersion(STORAGE_KEYS.VERSION_FILES);

      await Promise.all([...addedFiles].map(async ([id, fileData]) => {
        try {
          await set(id, fileData, filesStore);
          savedFiles.set(id, fileData);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
          erroredFiles.set(id, fileData);
        }
      }));

      return { savedFiles, erroredFiles };
    }
  });
}

export default LocalData;
