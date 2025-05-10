
/**
 * Transforms array of objects containing `id` attribute,
 * or array of ids (strings), into a Map, keyd by `id`.
 */
export const arrayToMap = (items) => {
  if (items instanceof Map) {
    return items;
  }
  return items.reduce((acc, element) => {
    acc.set(typeof element === 'string' ? element : element.id, element);
    return acc;
  }, new Map());
};

const DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day

export const isSyncableElement = (element) => {
  if (element.isDeleted) {
    if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
      return true; // 同步，在删除时间之内 1day
    }
    return false; // 不同步
  }
  return !isInvisiblySmallElement(element);
};

export const isInvisiblySmallElement = (
  element
) => {
  return element.width === 0 && element.height === 0;
};
