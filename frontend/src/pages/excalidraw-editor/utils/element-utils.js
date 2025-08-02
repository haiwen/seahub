
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
  let fileExt = mimeType.split('/')[1];
  fileExt = fileExt === 'svg+xml' ? 'svg' : fileExt;
  return `${fileUuid}.${fileExt}`;
};

