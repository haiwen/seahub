class ObjectUtils {

  static getDataType(data) {
    let type = typeof data;
    if (type !== 'object') {
      return type;
    }
    return Object.prototype.toString.call(data).replace(/^\[object (\S+)\]$/, '$1');
  }

  static iterable(data) {
    return ['Object', 'Array'].includes(this.getDataType(data));
  }

  static isObjectChanged(source, comparison, notIncludeKeys = []) {
    if (!this.iterable(source)) {
      throw new Error(`source should be a Object or Array , but got ${this.getDataType(source)}`);
    }
    if (this.getDataType(source) !== this.getDataType(comparison)) {
      return true;
    }
    const sourceKeys = Object.keys(source).filter(key => !notIncludeKeys.includes(key));
    const comparisonKeys = Object.keys({ ...source, ...comparison }).filter(key => !notIncludeKeys.includes(key));
    if (sourceKeys.length !== comparisonKeys.length) {
      return true;
    }
    return comparisonKeys.some(key => {
      if (this.iterable(source[key])) {
        return this.isObjectChanged(source[key], comparison[key], notIncludeKeys);
      } else {
        return source[key] !== comparison[key];
      }
    });
  }

  static isSameObject(source, comparison, notIncludeKeys = []) {
    if (!source && !comparison) return true;
    if (!source || !comparison) return false;
    return !this.isObjectChanged(source, comparison, notIncludeKeys);
  }

  static isEmpty = (target) => {
    return target && target.constructor === Object && Object.keys(target).length === 0;
  };
}

export const hasOwnProperty = (obj, propertyKey) => {
  if (!obj || !propertyKey) return false;
  return Object.prototype.hasOwnProperty.call(obj, propertyKey);
};

export default ObjectUtils;
