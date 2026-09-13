class LocalStorage {

  constructor(baseName) {
    this.baseName = baseName || 'sf-metadata';
  }

  getStorage() {
    try {
      return JSON.parse(window.localStorage.getItem(this.baseName) || '{}');
    } catch (error) {
      return '';
    }
  }

  setItem(key, value) {
    const storage = this.getStorage();
    const newValue = { ...storage, [key]: value };
    return window.localStorage.setItem(this.baseName, JSON.stringify(newValue));
  }

  getItem(key) {
    const storage = this.getStorage();
    return storage[key];
  }

}

export default LocalStorage;
