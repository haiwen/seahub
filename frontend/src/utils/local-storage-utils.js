class LocalStorage {

  static setItem(key, value) {
    let savedValue;
    const valueType = typeof value;
    if (valueType === 'string') {
      savedValue = value;
    } else if (valueType === 'number') {
      savedValue = value + '';
    } else {
      savedValue = JSON.stringify(value);
    }
    return window.localStorage.setItem(key, savedValue);
  }

  static getItem(key, defaultValue) {
    const value = window.localStorage.getItem(key);
    try {
      return JSON.parse(value) || defaultValue;
    } catch {
      return value || defaultValue;
    }
  }

  static removeItem(key) {
    return window.localStorage.removeItem(key);
  }

  // The setExpire and getExpire methods used to satisfy some cases that need to be updated regularly
  static setExpire(key, value, expire) {
    let obj = {
      data: value,
      time: Date.now(),
      expire: expire
    };
    this.setItem(key, JSON.stringify(obj));
  }

  static getExpire(key) {
    let val = this.getItem(key);
    if (!val) return val;
    val = JSON.parse(val);
    if (Date.now() - val.time > val.expire) {
      this.removeItem(key);
      return null;
    }
    return val.data;
  }
}

export default LocalStorage;
