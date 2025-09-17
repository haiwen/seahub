import { CaptureUpdateAction, isInvisiblySmallElement, newElementWith } from '@excalidraw/excalidraw';
import { v4 as uuidv4 } from 'uuid';
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

const DEFAULT_IMAGE = {
  'type': 'image',
  'version': 1,
  'versionNonce': null,
  'isDeleted': false,
  'id': null,
  'fillStyle': 'hachure',
  'strokeWidth': 1,
  'strokeStyle': 'solid',
  'roughness': 1,
  'opacity': 100,
  'angle': 0,
  'x': 300,
  'y': 300,
  'strokeColor': '#000000',
  'backgroundColor': 'transparent',
  'width': 300,
  'height': 200,
  'seed': 987654321,
  'groupIds': [],
  'frameId': null,
  'roundness': null,
  'boundElements': null,
  'updated': null,
  'link': null,
  'locked': false,
  'status': 'saved',
  'fileId': null,
  'scale': [1, 1],
  'dataURL': null,
};

export const generateImageElement = (filePath) => {
  const id = uuidv4();
  const image = {
    ...DEFAULT_IMAGE,
    id: id,
    fileId: id,
    dataURL: filePath,
    update: Date.now(),
    versionNonce: 1,
    status: 'saved',
    from: 'seahub',
  };

  return image;
};
