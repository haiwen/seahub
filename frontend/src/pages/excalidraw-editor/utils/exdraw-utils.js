import { CaptureUpdateAction, isInvisiblySmallElement, newElementWith } from '@excalidraw/excalidraw';
import { DELETED_ELEMENT_TIMEOUT } from '../constants';
import { isInitializedImageElement } from './element-utils';

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

export const updateStaleImageStatuses = (params) => {
  const { excalidrawAPI, erroredFiles, elements } = params;
  if (!erroredFiles.size) return;

  const newElements = elements.map(element => {
    if (isInitializedImageElement(element) && erroredFiles.has(element.fileId)) {
      return newElementWith(element, { status: 'error' });
    }
    return element;
  });

  excalidrawAPI.updateScene({
    elements: newElements,
    captureUpdate: CaptureUpdateAction.NEVER
  });
};
