import { MIMETYPE_TO_FILE_SUFFIX } from '../constants';

export const isLinearElementType = (elementType) => {
  return (elementType === 'arrow' || elementType === 'line' // || elementType === "freedraw"
  );
};

export const getNonDeletedElements = (elements) => elements.filter((element) => !element.isDeleted);

const _clearElements = (elements) => {
  return getNonDeletedElements(elements).map((element) => {
    return isLinearElementType(element.type) ? Object.assign(Object.assign({}, element), { lastCommittedPoint: null }) : element;
  });
};

export const clearElementsForLocalStorage = (elements) => _clearElements(elements);

export const isInitializedImageElement = (element) => {
  return !!element && element.type === 'image' && !!element.fileId;
};

export const getFilename = (fileUuid, fileData) => {
  const { mimeType } = fileData;
  const fileExt = MIMETYPE_TO_FILE_SUFFIX[mimeType];
  return `${fileUuid}.${fileExt}`;
};

