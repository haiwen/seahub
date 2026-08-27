import { gestureDebug } from '../utils/debug';
import { CaptureUpdateAction, restoreElements } from '@excalidraw/excalidraw';
import throttle from 'lodash.throttle';
import { v4 as uuidv4 } from 'uuid';
import {
  OPERATION_TYPES,
  getActiveSessionType,
  getElementIdsFromAppState,
  getPointerDownElementIds,
  getPointerDownSessionType,
  isActiveSessionType,
  isPreviewOperationType,
} from '../utils/operation-type';

const PREVIEW_SYNC_TIMEOUT = 50;
const MAX_PENDING_REMOTE_PREVIEW_CHANGES = 100;

class PreviewManager {

  constructor(excalidrawAPI, socketClient, onCommit) {
    this.excalidrawAPI = excalidrawAPI;
    this.socketClient = socketClient;
    this.onCommit = onCommit;
    this.activeGesture = null;
    this.remotePreviewSequenceByGesture = new Map();
    this.remotePreviewElementsById = new Map();
    this.leftRemotePreviewUsers = new Set();
    this.isApplyingRemotePreview = false;
    this.pendingRemotePreviewChanges = [];
  }

  logGesture = (phase, gesture, extra = {}) => {
    if (!gesture) {
      return;
    }

    gestureDebug(`gesture ${phase}`, {
      gestureId: gesture.gestureId,
      type: gesture.type,
      phase,
      activeTool: gesture.activeTool,
      elementIds: gesture.elementIds,
      updateCount: gesture.updateCount,
      durationMs: Date.now() - gesture.startedAt,
      ...extra,
    });
  };

  startGesture = (activeTool, pointerDownState) => {
    if (this.activeGesture) {
      // A new pointer-down can arrive before the previous gesture's pointer-up
      // (for example after a fast tool switch). Commit the previous gesture
      // before replacing its state, otherwise its final change only exists in
      // the volatile preview channel.
      const previousGesture = this.activeGesture;
      const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
      this.commitGesture(elements, previousGesture, 'new-pointer-down');
    }

    const sceneElementIds = new Set(
      this.excalidrawAPI.getSceneElementsIncludingDeleted().map((element) => element.id),
    );
    this.activeGesture = {
      gestureId: uuidv4(),
      type: getPointerDownSessionType(activeTool, pointerDownState),
      activeTool: activeTool?.type || OPERATION_TYPES.OTHER,
      elementIds: getPointerDownElementIds(pointerDownState),
      sceneElementIds,
      startedAt: Date.now(),
      updateCount: 0,
      previewSequence: 0,
      pointerUpPending: false,
      pointerUpSceneSignature: null,
    };

    this.logGesture('start', this.activeGesture, {
      hitElementType: pointerDownState?.hit?.element?.type || null,
      isResizing: Boolean(pointerDownState?.resize?.isResizing),
    });
  };

  updateGesture = (elements, appState) => {
    const currentType = getActiveSessionType(elements, appState);

    // Text input can continue after pointerup. Start a logical text session
    // when Excalidraw exposes editingTextElement through onChange.
    if (!this.activeGesture && currentType === OPERATION_TYPES.EDIT_TEXT) {
      this.activeGesture = {
        gestureId: uuidv4(),
        type: currentType,
        activeTool: appState?.activeTool?.type || OPERATION_TYPES.OTHER,
        elementIds: getElementIdsFromAppState(appState),
        sceneElementIds: new Set(elements.map((element) => element.id)),
        startedAt: Date.now(),
        updateCount: 0,
        previewSequence: 0,
        pointerUpPending: false,
        pointerUpSceneSignature: null,
      };
      this.logGesture('start', this.activeGesture, { source: 'onChange' });
    }

    if (!this.activeGesture) {
      return { gesture: null, ended: false };
    }

    const previousType = this.activeGesture.type;
    if (
      isActiveSessionType(currentType) &&
      (previousType === OPERATION_TYPES.SELECTION || previousType === OPERATION_TYPES.OTHER)
    ) {
      this.activeGesture.type = currentType;
    }

    // Creating a text element transitions into a text editing session after
    // the pointer is released. Keep one gestureId for both phases.
    if (
      previousType === OPERATION_TYPES.CREATE_ELEMENT &&
      currentType === OPERATION_TYPES.EDIT_TEXT
    ) {
      this.activeGesture.type = OPERATION_TYPES.EDIT_TEXT;
    }

    if (this.activeGesture.type === OPERATION_TYPES.SELECTION && currentType === OPERATION_TYPES.DRAG) {
      this.activeGesture.type = OPERATION_TYPES.DRAG;
    }

    if (this.activeGesture.type === OPERATION_TYPES.SELECTION && currentType === OPERATION_TYPES.RESIZE) {
      this.activeGesture.type = OPERATION_TYPES.RESIZE;
    }

    let elementIds = getElementIdsFromAppState(appState);
    if (
      elementIds.length === 0 &&
      (this.activeGesture.type === OPERATION_TYPES.FREEDRAW ||
        this.activeGesture.type === OPERATION_TYPES.CREATE_ELEMENT)
    ) {
      elementIds = elements
        .filter((element) => !this.activeGesture.sceneElementIds?.has(element.id))
        .map((element) => element.id);
    }
    if (elementIds.length > 0) {
      this.activeGesture.elementIds = elementIds;
    }
    this.activeGesture.updateCount += 1;

    if (previousType !== this.activeGesture.type) {
      this.logGesture('transition', this.activeGesture, {
        from: previousType,
        to: this.activeGesture.type,
      });
    }

    this.logGesture('update', this.activeGesture, {
      currentType,
    });

    const gesture = this.activeGesture;
    const isTextEditFinished =
      gesture.type === OPERATION_TYPES.EDIT_TEXT && currentType === OPERATION_TYPES.OTHER;
    // Excalidraw can dispatch onPointerUp before it publishes the last scene
    // change (for example the last freedraw point or the final resize/move).
    // Wait for the next onChange so the reliable operation uses the scene that
    // Excalidraw has actually finalized, rather than the scene read in
    // handlePointerUp.
    const isPointerUpFinalChange = gesture.pointerUpPending && !(
      gesture.activeTool === 'text' && currentType === OPERATION_TYPES.EDIT_TEXT
    );
    const ended = isTextEditFinished || isPointerUpFinalChange;
    const endReason = isTextEditFinished
      ? 'text-edit-finished'
      : 'pointer-up-final-change';
    if (ended) {
      gesture.pointerUpPending = false;
      this.endGesture(endReason);
    }

    return { gesture, ended, endReason };
  };

  broadcastPreviewElements = throttle((elements, gesture) => {
    if (!gesture || !isPreviewOperationType(gesture.type)) {
      return;
    }

    const elementIds = new Set(gesture.elementIds);
    const previewElements = elementIds.size > 0
      ? elements.filter(element => elementIds.has(element.id))
      : [];
    if (previewElements.length === 0) {
      return;
    }

    gesture.previewSequence += 1;
    this.socketClient.broadcastPreviewElements({
      elements: previewElements,
      gestureId: gesture.gestureId,
      seq: gesture.previewSequence,
      type: gesture.type,
    });
  }, PREVIEW_SYNC_TIMEOUT);

  getPreviewUserKey = (user) => {
    return user?._username || user?.username || user?.id || 'unknown';
  };

  getSceneSignature = (elements) => {
    return elements.map((element) => `${element.id}:${element.version}:${element.versionNonce}:${element.isDeleted ? 1 : 0}`).join('|');
  };

  clearPendingRemotePreviewChange = () => {
    this.pendingRemotePreviewChanges = [];
  };

  consumeRemotePreviewChange = (elements) => {
    const sceneSignature = this.getSceneSignature(elements);
    const pendingIndex = this.pendingRemotePreviewChanges.findIndex(
      (pendingChange) => pendingChange.sceneSignature === sceneSignature,
    );

    if (pendingIndex !== -1) {
      // updateScene() callbacks can be coalesced. If a later preview scene is
      // observed, all earlier pending scenes have either already been applied
      // or will not produce a separate callback.
      this.pendingRemotePreviewChanges.splice(0, pendingIndex + 1);
      return true;
    }

    // updateScene() may invoke onChange synchronously. Do not treat that
    // callback as a local edit, but keep other pending preview scenes intact.
    return this.isApplyingRemotePreview;
  };

  getElementsWithoutRemotePreview = (elements) => {
    return elements.reduce((result, element) => {
      const previewRecord = this.remotePreviewElementsById.get(element.id);
      if (!previewRecord) {
        result.push(element);
      } else if (previewRecord.baseElement) {
        result.push(previewRecord.baseElement);
      }
      return result;
    }, []);
  };

  clearRemotePreviewRecords = (user, elementIds = null, gestureId = null) => {
    const userKey = user ? this.getPreviewUserKey(user) : null;
    const elementIdSet = elementIds ? new Set(elementIds) : null;

    for (const [elementId, previewRecord] of this.remotePreviewElementsById) {
      const isSameUser = !userKey || previewRecord.userKey === userKey;
      const isMatchingElement = !elementIdSet || elementIdSet.has(elementId);
      const isDifferentGesture = !gestureId || previewRecord.gestureId !== gestureId;
      if (isSameUser && isMatchingElement && isDifferentGesture) {
        this.remotePreviewElementsById.delete(elementId);
      }
    }
  };

  markRemotePreviewUserActive = (user) => {
    if (!user) {
      return;
    }

    this.leftRemotePreviewUsers.delete(this.getPreviewUserKey(user));
  };

  clearRemotePreviewForUser = (user) => {
    if (!user) {
      return;
    }

    const userKey = this.getPreviewUserKey(user);
    this.leftRemotePreviewUsers.add(userKey);
    const localElements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const previewRecordsById = new Map();
    for (const [elementId, previewRecord] of this.remotePreviewElementsById) {
      if (previewRecord.userKey === userKey) {
        previewRecordsById.set(elementId, previewRecord);
        this.remotePreviewElementsById.delete(elementId);
      }
    }

    const didClearPreview = previewRecordsById.size > 0;
    const nextSceneElements = [];
    localElements.forEach((element) => {
      const previewRecord = previewRecordsById.get(element.id);
      if (!previewRecord) {
        nextSceneElements.push(element);
        return;
      }

      if (previewRecord.baseElement) {
        nextSceneElements.push(previewRecord.baseElement);
      }
    });

    // Keep the sequence cache so a delayed packet from an old gesture is
    // rejected if the user rejoins before that packet arrives.

    if (!didClearPreview) {
      return;
    }

    // Keep the update out of the reliable operation pipeline. The pending
    // scene signature also prevents Excalidraw's onChange from treating this
    // cleanup as a local edit.
    this.pendingRemotePreviewChanges.push({
      sceneSignature: this.getSceneSignature(nextSceneElements),
    });
    if (this.pendingRemotePreviewChanges.length > MAX_PENDING_REMOTE_PREVIEW_CHANGES) {
      this.pendingRemotePreviewChanges.splice(
        0,
        this.pendingRemotePreviewChanges.length - MAX_PENDING_REMOTE_PREVIEW_CHANGES,
      );
    }

    this.isApplyingRemotePreview = true;
    try {
      this.excalidrawAPI.updateScene({
        elements: nextSceneElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } finally {
      this.isApplyingRemotePreview = false;
    }

    gestureDebug('clear preview after user left', {
      user: userKey,
    });
  };

  handleRemotePreviewElements = (params) => {
    const { gestureId, seq, type, user, elements = [] } = params;
    if (!gestureId || !Number.isFinite(seq) || !Array.isArray(elements)) {
      return;
    }

    const userKey = this.getPreviewUserKey(user);
    if (this.leftRemotePreviewUsers.has(userKey)) {
      return;
    }

    const previewKey = `${userKey}:${gestureId}`;
    const lastSeq = this.remotePreviewSequenceByGesture.get(previewKey);
    if (lastSeq !== undefined && seq <= lastSeq) {
      return;
    }

    if (!this.remotePreviewSequenceByGesture.has(previewKey) && this.remotePreviewSequenceByGesture.size >= 100) {
      const oldestPreviewKey = this.remotePreviewSequenceByGesture.keys().next().value;
      this.remotePreviewSequenceByGesture.delete(oldestPreviewKey);
    }
    this.remotePreviewSequenceByGesture.set(previewKey, seq);

    // A user can only have one active gesture. Remove an older gesture's
    // temporary elements before applying the latest preview.
    this.clearRemotePreviewRecords(user, null, gestureId);

    const localElements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const sceneElements = this.getElementsWithoutRemotePreview(localElements);
    const previewElements = restoreElements(elements, null);
    const sceneElementById = new Map(sceneElements.map(element => [element.id, element]));
    const previewElementById = new Map(previewElements.map(element => [element.id, element]));

    previewElementById.forEach((previewElement, elementId) => {
      const previousRecord = this.remotePreviewElementsById.get(elementId);
      this.remotePreviewElementsById.set(elementId, {
        userKey,
        gestureId,
        type,
        element: previewElement,
        baseElement: previousRecord?.baseElement || sceneElementById.get(elementId) || null,
      });
      sceneElementById.set(elementId, previewElement);
    });

    const nextSceneElements = Array.from(sceneElementById.values());
    // updateScene() schedules Excalidraw's onChange. Keep each scene
    // signature so callbacks from multiple remote previews can be matched
    // without one remote update overwriting another.
    this.pendingRemotePreviewChanges.push({
      sceneSignature: this.getSceneSignature(nextSceneElements),
    });
    if (this.pendingRemotePreviewChanges.length > MAX_PENDING_REMOTE_PREVIEW_CHANGES) {
      this.pendingRemotePreviewChanges.splice(
        0,
        this.pendingRemotePreviewChanges.length - MAX_PENDING_REMOTE_PREVIEW_CHANGES,
      );
    }
    this.isApplyingRemotePreview = true;
    try {
      this.excalidrawAPI.updateScene({
        elements: nextSceneElements,
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } finally {
      this.isApplyingRemotePreview = false;
    }

    gestureDebug('apply preview', {
      gestureId,
      type,
      seq,
      user: userKey,
      elementIds: previewElements.map(element => element.id),
    });
  };

  endGesture = (reason = 'pointer-up') => {
    if (!this.activeGesture) {
      return;
    }

    this.logGesture('end', this.activeGesture, { reason });
    this.activeGesture = null;
  };

  commitGesture = (elements, gesture = this.activeGesture, reason = 'pointer-up') => {
    if (!gesture) {
      return false;
    }

    // Ensure the final Preview is sent before the reliable commit. The
    // throttle may still have a trailing update waiting to be dispatched.
    this.broadcastPreviewElements.flush();

    // Preview updates are deliberately not part of the reliable operation
    // queue. Once the gesture ends, explicitly enqueue the final scene as a
    // real operation so the change is persisted even when no further
    // Excalidraw onChange event is emitted.
    if (this.onCommit) {
      this.onCommit(elements);
    }

    if (this.activeGesture === gesture) {
      this.endGesture(reason);
    }
    return true;
  };

  handlePointerDown = (activeTool, pointerDownState) => {
    this.startGesture(activeTool, pointerDownState);
  };

  handlePointerUp = (activeTool, pointerDownState) => {
    if (!this.activeGesture) {
      return;
    }

    const elements = this.excalidrawAPI.getSceneElementsIncludingDeleted();
    const appState = this.excalidrawAPI.getAppState();
    const currentType = getActiveSessionType(elements, appState);
    const previousType = this.activeGesture.type;
    if (currentType === OPERATION_TYPES.EDIT_TEXT && previousType !== currentType) {
      this.activeGesture.type = currentType;
      this.logGesture('transition', this.activeGesture, {
        from: previousType,
        to: currentType,
      });
    }
    this.logGesture('pointer-up', this.activeGesture, {
      currentType,
      activeTool: activeTool?.type || this.activeGesture.activeTool,
      hitElementType: pointerDownState?.hit?.element?.type || null,
    });

    // Text editing continues after the pointer is released and is committed
    // by the onChange that observes editingTextElement becoming null. For all
    // other gestures, wait for that onChange because PointerUp may arrive
    // before Excalidraw applies the final scene update.
    if (currentType !== OPERATION_TYPES.EDIT_TEXT) {
      this.activeGesture.pointerUpPending = true;
      this.activeGesture.pointerUpSceneSignature = this.getSceneSignature(elements);
      this.logGesture('pointer-up-waiting-for-final-change', this.activeGesture, {
        sceneSignature: this.activeGesture.pointerUpSceneSignature,
      });
    }
    return false;
  };
}

export default PreviewManager;
