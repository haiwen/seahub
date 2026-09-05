const CREATE_TOOL_TYPES = new Set([
  'rectangle',
  'diamond',
  'ellipse',
  'arrow',
  'line',
  'freedraw',
  'image',
  'frame',
  'magicframe',
  'embeddable',
]);

const OPERATION_TYPES = {
  DRAG: 'drag',
  RESIZE: 'resize',
  FREEDRAW: 'freedraw',
  CREATE_ELEMENT: 'create-element',
  EDIT_TEXT: 'edit-text',
  SELECTION: 'selection',
  OTHER: 'other',
};

const PREVIEW_OPERATION_TYPES = new Set([
  OPERATION_TYPES.DRAG,
  OPERATION_TYPES.RESIZE,
  OPERATION_TYPES.FREEDRAW,
  OPERATION_TYPES.CREATE_ELEMENT,
  OPERATION_TYPES.EDIT_TEXT,
]);

const isPreviewOperationType = (type) => PREVIEW_OPERATION_TYPES.has(type);

const getSelectedElementIds = (appState = {}) => {
  return Object.keys(appState.selectedElementIds || {});
};

const getElementIdsFromAppState = (appState = {}) => {
  if (appState.resizingElement?.id) {
    return [appState.resizingElement.id];
  }

  if (appState.newElement?.id) {
    return [appState.newElement.id];
  }

  if (appState.editingTextElement?.id) {
    return [appState.editingTextElement.id];
  }

  if (appState.selectedElementsAreBeingDragged) {
    return getSelectedElementIds(appState);
  }

  return [];
};

const getActiveSessionType = (elements = [], appState = {}) => {
  if (appState.selectedElementsAreBeingDragged) {
    return OPERATION_TYPES.DRAG;
  }

  if (appState.resizingElement) {
    return OPERATION_TYPES.RESIZE;
  }

  if (appState.newElement?.type === 'freedraw') {
    return OPERATION_TYPES.FREEDRAW;
  }

  if (appState.newElement) {
    return OPERATION_TYPES.CREATE_ELEMENT;
  }

  if (appState.editingTextElement) {
    return OPERATION_TYPES.EDIT_TEXT;
  }

  if (appState.selectionElement) {
    return OPERATION_TYPES.SELECTION;
  }

  // Keep the parameter in the function signature because callers pass the
  // current scene when diagnosing an operation. The current appState is the
  // authoritative source for an active gesture in Excalidraw 0.18.x.
  void elements;
  return OPERATION_TYPES.OTHER;
};

const getPointerDownSessionType = (activeTool = {}, pointerDownState = {}) => {
  if (pointerDownState.resize?.isResizing) {
    return OPERATION_TYPES.RESIZE;
  }

  if (activeTool.type === 'freedraw') {
    return OPERATION_TYPES.FREEDRAW;
  }

  if (activeTool.type === 'text') {
    return OPERATION_TYPES.CREATE_ELEMENT;
  }

  if (CREATE_TOOL_TYPES.has(activeTool.type)) {
    return OPERATION_TYPES.CREATE_ELEMENT;
  }

  if (activeTool.type === 'selection') {
    return OPERATION_TYPES.SELECTION;
  }

  return OPERATION_TYPES.OTHER;
};

const getPointerDownElementIds = (pointerDownState = {}) => {
  const hitElementId = pointerDownState.hit?.element?.id;
  return hitElementId ? [hitElementId] : [];
};

const isActiveSessionType = (type) => {
  return type !== OPERATION_TYPES.OTHER;
};

export {
  OPERATION_TYPES,
  getActiveSessionType,
  getElementIdsFromAppState,
  getPointerDownElementIds,
  getPointerDownSessionType,
  isActiveSessionType,
  isPreviewOperationType,
};
