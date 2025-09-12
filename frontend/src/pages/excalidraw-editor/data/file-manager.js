import { isInitializedImageElement } from '../utils/element-utils';

class FileManager {

  constructor({ getFiles, saveFiles }) {
    this.fetchingFiles = new Map(); // List of images being requested
    this.erroredFiles_fetch = new Map(); // List of images with request errors
    this.savingFiles = new Map(); // List of pictures being saved
    this.savedFiles = new Map(); // List of saved pictures
    this.erroredFiles_save = new Map(); // Save error image list
    this._getFiles = getFiles; // Function used to load images in elements
    this._saveFiles = saveFiles; // Function used to save the image in the element
  }

  isFileTracked = (id) => {
    return (
      this.savedFiles.has(id) ||
      this.savingFiles.has(id) ||
      this.fetchingFiles.has(id) ||
      this.erroredFiles_fetch.has(id) ||
      this.erroredFiles_save.has(id)
    );
  };

  isFileSavedOrBeingSaved = (file) => {
    if (!file) return;
    const fileVersion = this.getFileVersion(file);
    return (
      this.savedFiles.get(file.id) === fileVersion ||
      this.savingFiles.get(file.id) === fileVersion
    );
  };

  getFileVersion = (file) => {
    return file?.version ?? 1;
  };

  saveFiles = async ({ elements, files }) => {
    const addedFiles = new Map();
    for (const element of elements) {
      const fileData = isInitializedImageElement(element) && files[element.fileId];

      if (fileData && !this.isFileSavedOrBeingSaved(fileData)) {
        addedFiles.set(element.fileId, files[element.fileId]);
        this.savingFiles.set(element.fileId, this.getFileVersion(fileData));
      }
    }

    if (!addedFiles.size) {
      return { savedFiles: new Map(), erroredFiles: new Map() };
    }

    try {
      const { savedFiles, erroredFiles } = await this._saveFiles({ addedFiles });
      for (const [fileId, fileData] of savedFiles) {
        this.savedFiles.set(fileId, this.getFileVersion(fileData));
      }
      for (const [fileId, fileData] of erroredFiles) {
        this.erroredFiles_save.set(fileId, this.getFileVersion(fileData)) ;
      }
      return {
        savedFiles,
        erroredFiles,
      };
    } finally {
      for (const [fileId] of addedFiles) {
        this.savingFiles.delete(fileId);
      }
    }
  };

  getFiles = async (ids) => {
    if (!ids.length) {
      return {
        loadedFiles: [],
        erroredFiles: new Map(),
      };
    }

    for (const filename of ids) {
      const id = filename.split('.')[0];
      this.fetchingFiles.set(id, true);
    }

    try {
      const { loadedFiles, erroredFiles } = await this._getFiles(ids);
      for (const file of loadedFiles) {
        if (file.origin) {
          this.savedFiles.set(file.id, undefined);
        } else {
          this.savedFiles.set(file.id, this.getFileVersion(file));
        }
      }
      for (const [fileId] of erroredFiles) {
        this.erroredFiles_fetch.set(fileId, true);
      }
      return { loadedFiles, erroredFiles };
    } finally {
      for (const id of ids) {
        this.fetchingFiles.delete(id);
      }
    }
  };

  shouldPreventUnload = (elements) => {
    const hasUnsavedImage = elements.some(element => {
      return isInitializedImageElement(element) && !element.isDeleted && this.savingFiles.has(element.fileId);
    });
    return hasUnsavedImage;
  };

  shouldUpdateImageElementStatus = (element) => {
    return (
      isInitializedImageElement(element) &&
      this.savedFiles.has(element.fileId) &&
      element.status === 'pending'
    );
  };

  reset() {
    this.fetchingFiles.clear();
    this.savingFiles.clear();
    this.savedFiles.clear();
    this.erroredFiles_fetch.clear();
    this.erroredFiles_save.clear();
  }
}

export default FileManager;
