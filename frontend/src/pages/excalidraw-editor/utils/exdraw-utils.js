import { isInvisiblySmallElement } from '@excalidraw/excalidraw';
import { DELETED_ELEMENT_TIMEOUT } from '../constants';

export const isSyncableElement = (element) => {
  if (element.isDeleted) {
    if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
      return true;
    }
    return false;
  }
  return !isInvisiblySmallElement(element);
};

export const preventUnload = (event) => {
  event.preventDefault();
  // NOTE: modern browsers no longer allow showing a custom message here
  event.returnValue = '';
};

export const resolvablePromise = () => {
  let resolve = null;
  let reject = null;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
};
