export function callIfExists(func, ...args) {
  return (typeof func === 'function') && func(...args);
}

export function hasOwnProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function uniqueId() {
  return Math.random().toString(36).substring(7);
}

export const store = {};

export const canUseDOM = Boolean(
  typeof window !== 'undefined' && window.document && window.document.createElement
);
