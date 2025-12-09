import './polyfills';
import * as Utils from './utils';
import * as constants from './constants';
import { addStyleToHead, addCursorStyleToBody, removeStyle } from './styles';
import dragScroller from './dragscroller';
import { debounce, isMobile } from '../../../utils/utils';
import { defaultOptions } from './defaults';

const grabEvents = ['mousedown', 'touchstart'];
const moveEvents = ['mousemove', 'touchmove'];
const releaseEvents = ['mouseup', 'touchend'];

let dragListeningContainers = null;
let grabbedElement = null;
let ghostInfo = null;
let draggableInfo = null;
let containers = [];
let isDragging = false;
let isCanceling = false;
let dropAnimationStarted = false;
let missedDrag = false;
let handleDrag = null;
let handleScroll = null;
let sourceContainerLockAxis = null;
let cursorStyleElement = null;

const containerRectableWatcher = watchRectangles();

function listenEvents() {
  if (typeof window !== 'undefined') {
    addGrabListeners();
  }
}

function addGrabListeners() {
  grabEvents.forEach(e => {
    window.document.addEventListener(e, onMouseDown, { passive: false });
  });
}

function addMoveListeners() {
  moveEvents.forEach(e => {
    window.document.addEventListener(e, onMouseMove, { passive: false });
  });
}

function removeMoveListeners() {
  moveEvents.forEach(e => {
    window.document.removeEventListener(e, onMouseMove, { passive: false });
  });
}

function addReleaseListeners() {
  releaseEvents.forEach(e => {
    window.document.addEventListener(e, onMouseUp, { passive: false });
  });
}

function removeReleaseListeners() {
  releaseEvents.forEach(e => {
    window.document.removeEventListener(e, onMouseUp, { passive: false });
  });
}

function getGhostParent() {
  if (draggableInfo && draggableInfo.ghostParent) {
    return draggableInfo.ghostParent;
  }

  if (grabbedElement) {
    return grabbedElement.parentElement || window.document.body;
  } else {
    return window.document.body;
  }
}

function getGhostElement(wrapperElement, { x, y }, container, cursor) {
  const wrapperRect = wrapperElement.getBoundingClientRect();
  const { left, top, right, bottom } = wrapperRect;

  const wrapperVisibleRect = Utils.getIntersection(container.layout.getContainerRectangles().visibleRect, wrapperRect);

  const midX = wrapperVisibleRect.left + (wrapperVisibleRect.right - wrapperVisibleRect.left) / 2;
  const midY = wrapperVisibleRect.top + (wrapperVisibleRect.bottom - wrapperVisibleRect.top) / 2;
  const ghost = wrapperElement.cloneNode(true);
  ghost.style.zIndex = '1000';
  ghost.style.boxSizing = 'border-box';
  ghost.style.position = 'fixed';
  ghost.style.top = '0px';
  ghost.style.left = '0px';
  ghost.style.transform = null;
  ghost.style.removeProperty('transform');

  if (container.shouldUseTransformForGhost()) {
    ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  } else {
    ghost.style.top = `${top}px`;
    ghost.style.left = `${left}px`;
  }

  ghost.style.width = (right - left) + 'px';
  ghost.style.height = (bottom - top) + 'px';
  ghost.style.overflow = 'visible';
  ghost.style.transition = null;
  ghost.style.removeProperty('transition');
  ghost.style.pointerEvents = 'none';
  ghost.style.userSelect = 'none';

  if (container.getOptions().dragClass) {
    Utils.addClass(ghost.firstElementChild, container.getOptions().dragClass);
    const dragCursor = window.getComputedStyle(ghost.firstElementChild).cursor;
    cursorStyleElement = addCursorStyleToBody(dragCursor);
  } else {
    cursorStyleElement = addCursorStyleToBody(cursor);
  }
  Utils.addClass(ghost, container.getOptions().orientation || 'vertical');
  Utils.addClass(ghost, constants.ghostClass);

  return {
    ghost: ghost,
    centerDelta: { x: midX - x, y: midY - y },
    positionDelta: { left: left - x, top: top - y },
    topLeft: {
      x: left,
      y: top
    }
  };
}

function getDraggableInfo(draggableElement) {
  const container = containers.filter(p => draggableElement.parentElement === p.element)[0];
  const draggableIndex = container.draggables.indexOf(draggableElement);
  const getGhostParent = container.getOptions().getGhostParent;
  const draggableRect = draggableElement.getBoundingClientRect();
  return {
    container,
    element: draggableElement,
    size: {
      offsetHeight: draggableRect.bottom - draggableRect.top,
      offsetWidth: draggableRect.right - draggableRect.left,
    },
    elementIndex: draggableIndex,
    payload: container.getOptions().getChildPayload
      ? container.getOptions().getChildPayload(draggableIndex)
      : undefined,
    targetElement: null,
    position: { x: 0, y: 0 },
    groupName: container.getOptions().groupName,
    ghostParent: getGhostParent ? getGhostParent() : null,
    invalidateShadow: null,
    mousePosition: null,
    relevantContainers: null
  };
}

function handleDropAnimation(callback) {
  function endDrop() {
    Utils.removeClass(ghostInfo.ghost, 'animated');
    ghostInfo.ghost.style.transitionDuration = null;
    getGhostParent().removeChild(ghostInfo.ghost);
    callback();
  }

  function animateGhostToPosition({ top, left }, duration, dropClass) {
    Utils.addClass(ghostInfo.ghost, 'animated');
    if (dropClass) {
      Utils.addClass(ghostInfo.ghost.firstElementChild, dropClass);
    }

    ghostInfo.topLeft.x = left;
    ghostInfo.topLeft.y = top;
    translateGhost(duration);
    setTimeout(function () {
      endDrop();
    }, duration + 20);
  }

  function shouldAnimateDrop(options) {
    return options.shouldAnimateDrop
      ? options.shouldAnimateDrop(draggableInfo.container.getOptions(), draggableInfo.payload)
      : true;
  }

  function disappearAnimation(duration, clb) {
    Utils.addClass(ghostInfo.ghost, 'animated');
    translateGhost(duration, 0.9, true);
    // ghostInfo.ghost.style.transitionDuration = duration + 'ms';
    // ghostInfo.ghost.style.opacity = '0';
    // ghostInfo.ghost.style.transform = 'scale(0.90)';
    setTimeout(function () {
      clb();
    }, duration + 20);
  }

  if (draggableInfo.targetElement) {
    const container = containers.filter(p => p.element === draggableInfo.targetElement)[0];
    if (shouldAnimateDrop(container.getOptions())) {
      const dragResult = container.getDragResult();
      animateGhostToPosition(
        dragResult.shadowBeginEnd.rect,
        Math.max(150, container.getOptions().animationDuration / 2),
        container.getOptions().dropClass
      );
    } else {
      endDrop();
    }
  } else {
    const container = containers.filter(p => p === draggableInfo.container)[0];
    if (container) {
      const { behaviour, removeOnDropOut } = container.getOptions();
      if ((behaviour === 'move' || behaviour === 'contain') && (isCanceling || !removeOnDropOut) && container.getDragResult()) {
        const rectangles = container.layout.getContainerRectangles();

        // container is hidden somehow
        // move ghost back to last seen position
        if (!Utils.isVisible(rectangles.visibleRect) && Utils.isVisible(rectangles.lastVisibleRect)) {
          animateGhostToPosition(
            {
              top: rectangles.lastVisibleRect.top,
              left: rectangles.lastVisibleRect.left
            },
            container.getOptions().animationDuration,
            container.getOptions().dropClass
          );
        } else {
          const { removedIndex, elementSize } = container.getDragResult();
          const layout = container.layout;
          // drag ghost to back
          container.getTranslateCalculator({
            dragResult: {
              removedIndex,
              addedIndex: removedIndex,
              elementSize,
              pos: undefined,
              shadowBeginEnd: undefined,
            },
          });
          const prevDraggableEnd =
            removedIndex > 0
              ? layout.getBeginEnd(container.draggables[removedIndex - 1]).end
              : layout.getBeginEndOfContainer().begin;
          animateGhostToPosition(
            layout.getTopLeftOfElementBegin(prevDraggableEnd),
            container.getOptions().animationDuration,
            container.getOptions().dropClass
          );
        }
      } else {
        disappearAnimation(container.getOptions().animationDuration, endDrop);
      }
    } else {
      // container is disposed due to removal
      disappearAnimation(defaultOptions.animationDuration, endDrop);
    }
  }
}

const handleDragStartConditions = (function handleDragStartConditions() {
  let startEvent;
  let delay;
  let clb;
  let timer = null;
  const moveThreshold = 1;
  const maxMoveInDelay = 5;

  function onMove(event) {
    const { clientX: currentX, clientY: currentY } = getPointerEvent(event);
    if (!delay) {
      if (
        Math.abs(startEvent.clientX - currentX) > moveThreshold ||
        Math.abs(startEvent.clientY - currentY) > moveThreshold
      ) {
        return callCallback();
      }
    } else {
      if (
        Math.abs(startEvent.clientX - currentX) > maxMoveInDelay ||
        Math.abs(startEvent.clientY - currentY) > maxMoveInDelay
      ) {
        deregisterEvent();
      }
    }
  }

  function onUp() {
    deregisterEvent();
  }
  function onHTMLDrag() {
    deregisterEvent();
  }

  function registerEvents() {
    if (delay) {
      timer = setTimeout(callCallback, delay);
    }

    moveEvents.forEach(e => window.document.addEventListener(e, onMove), {
      passive: false
    });
    releaseEvents.forEach(e => window.document.addEventListener(e, onUp), {
      passive: false
    });
    window.document.addEventListener('drag', onHTMLDrag, {
      passive: false
    });
  }

  function deregisterEvent() {
    clearTimeout(timer);
    moveEvents.forEach(e => window.document.removeEventListener(e, onMove), {
      passive: false
    });
    releaseEvents.forEach(e => window.document.removeEventListener(e, onUp), {
      passive: false
    });
    window.document.removeEventListener('drag', onHTMLDrag, {
      passive: false
    });
  }

  function callCallback() {
    clearTimeout(timer);
    deregisterEvent();
    clb();
  }

  return function (_startEvent, _delay, _clb) {
    startEvent = getPointerEvent(_startEvent);
    delay = (typeof _delay === 'number') ? _delay : (isMobile ? 200 : 0);
    clb = _clb;

    registerEvents();
  };
})();

function onMouseDown(event) {
  const e = getPointerEvent(event);
  if (!isDragging && (e.button === undefined || e.button === 0)) {
    grabbedElement = Utils.getParent(e.target, '.' + constants.wrapperClass);
    if (grabbedElement) {
      const containerElement = Utils.getParent(grabbedElement, '.' + constants.containerClass);
      const container = containers.filter(p => p.element === containerElement)[0];
      const dragHandleSelector = container.getOptions().dragHandleSelector;
      const nonDragAreaSelector = container.getOptions().nonDragAreaSelector;

      let startDrag = true;
      if (dragHandleSelector && !Utils.getParent(e.target, dragHandleSelector)) {
        startDrag = false;
      }

      if (nonDragAreaSelector && Utils.getParent(e.target, nonDragAreaSelector)) {
        startDrag = false;
      }

      if (startDrag) {
        container.layout.invalidate();
        Utils.addClass(window.document.body, constants.disableTouchActions);
        Utils.addClass(window.document.body, constants.noUserSelectClass);

        const onMouseUp = () => {
          Utils.removeClass(window.document.body, constants.disableTouchActions);
          Utils.removeClass(window.document.body, constants.noUserSelectClass);
          window.document.removeEventListener('mouseup', onMouseUp);
        };

        window.document.addEventListener('mouseup', onMouseUp);
      }

      if (startDrag) {
        handleDragStartConditions(e, container.getOptions().dragBeginDelay, () => {
          Utils.clearSelection();
          initiateDrag(e, Utils.getElementCursor(event.target));
          addMoveListeners();
          addReleaseListeners();
        });
      }
    }
  }
}

function handleMouseMoveForContainer({ clientX, clientY }, orientation = 'vertical') {
  const beginEnd = draggableInfo.container.layout.getBeginEndOfContainerVisibleRect();
  let mousePos;
  let axis;
  let leftTop;
  let size;

  if (orientation === 'vertical') {
    mousePos = clientY;
    axis = 'y';
    leftTop = 'top';
    size = draggableInfo.size.offsetHeight;
  } else {
    mousePos = clientX;
    axis = 'x';
    leftTop = 'left';
    size = draggableInfo.size.offsetWidth;
  }

  const beginBoundary = beginEnd.begin;
  const endBoundary = beginEnd.end - size;
  const positionInBoundary = Math.max(beginBoundary, Math.min(endBoundary, (mousePos + ghostInfo.positionDelta[leftTop])));

  ghostInfo.topLeft[axis] = positionInBoundary;
  draggableInfo.position[axis] = Math.max(beginEnd.begin, Math.min(beginEnd.end, (mousePos + ghostInfo.centerDelta[axis])));
  draggableInfo.mousePosition[axis] = Math.max(beginEnd.begin, Math.min(beginEnd.end, mousePos));

  if (draggableInfo.position[axis] < (beginEnd.begin + (size / 2))) {
    draggableInfo.position[axis] = beginEnd.begin + 2;
  }

  if (draggableInfo.position[axis] > (beginEnd.end - (size / 2))) {
    draggableInfo.position[axis] = beginEnd.end - 2;
  }
}

function onMouseMove(event) {
  event.preventDefault();
  const e = getPointerEvent(event);
  if (!draggableInfo) {
    initiateDrag(e, Utils.getElementCursor(event.target));
  } else {
    const containerOptions = draggableInfo.container.getOptions();
    const isContainDrag = containerOptions.behaviour === 'contain';
    if (isContainDrag) {
      handleMouseMoveForContainer(e, containerOptions.orientation);
    } else if (sourceContainerLockAxis) {
      if (sourceContainerLockAxis === 'y') {
        ghostInfo.topLeft.y = e.clientY + ghostInfo.positionDelta.top;
        draggableInfo.position.y = e.clientY + ghostInfo.centerDelta.y;
        draggableInfo.mousePosition.y = e.clientY;
      } else if (sourceContainerLockAxis === 'x') {
        ghostInfo.topLeft.x = e.clientX + ghostInfo.positionDelta.left;
        draggableInfo.position.x = e.clientX + ghostInfo.centerDelta.x;
        draggableInfo.mousePosition.x = e.clientX;
      }
    } else {
      ghostInfo.topLeft.x = e.clientX + ghostInfo.positionDelta.left;
      ghostInfo.topLeft.y = e.clientY + ghostInfo.positionDelta.top;
      draggableInfo.position.x = e.clientX + ghostInfo.centerDelta.x;
      draggableInfo.position.y = e.clientY + ghostInfo.centerDelta.y;
      draggableInfo.mousePosition.x = e.clientX;
      draggableInfo.mousePosition.y = e.clientY;
    }

    translateGhost();

    if (!handleDrag(draggableInfo)) {
      missedDrag = true;
    } else {
      missedDrag = false;
    }

    if (missedDrag) {
      debouncedHandleMissedDragFrame();
    }
  }
}

var debouncedHandleMissedDragFrame = debounce(handleMissedDragFrame, 20, false);

function handleMissedDragFrame() {
  if (missedDrag) {
    missedDrag = false;
    handleDragImmediate(draggableInfo, dragListeningContainers);
  }
}

function onMouseUp() {
  removeMoveListeners();
  removeReleaseListeners();
  handleScroll({ reset: true });

  if (cursorStyleElement) {
    removeStyle(cursorStyleElement);
    cursorStyleElement = null;
  }

  if (draggableInfo) {
    containerRectableWatcher.stop();
    handleMissedDragFrame();
    dropAnimationStarted = true;
    handleDropAnimation(() => {
      isDragging = false; //
      fireOnDragStartEnd(false);
      const containers = dragListeningContainers || [];

      let containerToCallDrop = containers.shift();
      while (containerToCallDrop !== undefined) {
        containerToCallDrop.handleDrop(draggableInfo);
        containerToCallDrop = containers.shift();
      }

      dragListeningContainers = null;
      grabbedElement = null;
      ghostInfo = null;
      draggableInfo = null;
      sourceContainerLockAxis = null;
      handleDrag = null;
      dropAnimationStarted = false;
    });
  }
}

function getPointerEvent(e) {
  return e.touches ? e.touches[0] : e;
}

function handleDragImmediate(draggableInfo, dragListeningContainers) {
  let containerBoxChanged = false;
  dragListeningContainers.forEach((p) => {
    const dragResult = p.handleDrag(draggableInfo);
    containerBoxChanged = !!dragResult.containerBoxChanged || false;
    dragResult.containerBoxChanged = false;
  });

  if (containerBoxChanged) {
    containerBoxChanged = false;
    requestAnimationFrame(() => {
      containers.forEach(p => {
        p.layout.invalidateRects();
        p.onTranslated();
      });
    });
  }
}

function dragHandler(dragListeningContainers) {
  let targetContainers = dragListeningContainers;
  let animationFrame = null;
  return function (draggableInfo) {
    if (animationFrame === null && isDragging && !dropAnimationStarted) {
      animationFrame = requestAnimationFrame(() => {
        if (isDragging && !dropAnimationStarted) {
          handleDragImmediate(draggableInfo, targetContainers);
          handleScroll({ draggableInfo });
        }
        animationFrame = null;
      });
      return true;
    }
    return false;
  };
}

function getScrollHandler(container, dragListeningContainers) {
  if (container.getOptions().autoScrollEnabled) {
    return dragScroller(dragListeningContainers, 1500);
  } else {
    return (props) => null;
  }
}

function fireOnDragStartEnd(isStart) {
  containers.forEach(p => {
    const fn = isStart ? p.getOptions().onDragStart : p.getOptions().onDragEnd;
    if (fn) {
      const options = {
        isSource: p === draggableInfo.container,
        payload: draggableInfo.payload,
      };
      if (p.isDragRelevant(draggableInfo.container, draggableInfo.payload)) {
        options.willAcceptDrop = true;
      } else {
        options.willAcceptDrop = false;
      }
      fn(options);
    }
  });
}

function initiateDrag(position, cursor) {
  if (grabbedElement !== null) {
    isDragging = true;
    const container = (containers.filter(p => grabbedElement.parentElement === p.element)[0]);
    container.setDraggables();
    sourceContainerLockAxis = container.getOptions().lockAxis ? container.getOptions().lockAxis.toLowerCase() : null;

    draggableInfo = getDraggableInfo(grabbedElement);
    ghostInfo = getGhostElement(
      grabbedElement,
      { x: position.clientX, y: position.clientY },
      draggableInfo.container,
      cursor
    );
    draggableInfo.position = {
      x: position.clientX + ghostInfo.centerDelta.x,
      y: position.clientY + ghostInfo.centerDelta.y,
    };
    draggableInfo.mousePosition = {
      x: position.clientX,
      y: position.clientY,
    };

    dragListeningContainers = containers.filter(p => p.isDragRelevant(container, draggableInfo.payload));
    draggableInfo.relevantContainers = dragListeningContainers;
    handleDrag = dragHandler(dragListeningContainers);
    if (handleScroll) {
      handleScroll({ reset: true, draggableInfo: undefined });
    }
    handleScroll = getScrollHandler(container, dragListeningContainers);
    dragListeningContainers.forEach(p => p.prepareDrag(p, dragListeningContainers));
    fireOnDragStartEnd(true);
    handleDrag(draggableInfo);
    getGhostParent().appendChild(ghostInfo.ghost);

    containerRectableWatcher.start();
  }
}

let ghostAnimationFrame = null;
function translateGhost(translateDuration = 0, scale = 1, fadeOut = false) {
  const { ghost, topLeft: { x, y } } = ghostInfo;
  const useTransform = draggableInfo.container ? draggableInfo.container.shouldUseTransformForGhost() : true;

  let transformString = useTransform ? `translate3d(${x}px,${y}px, 0)` : null;

  if (scale !== 1) {
    transformString = transformString ? `${transformString} scale(${scale})` : `scale(${scale})`;
  }

  if (translateDuration > 0) {
    ghostInfo.ghost.style.transitionDuration = translateDuration + 'ms';
    requestAnimationFrame(() => {
      transformString && (ghost.style.transform = transformString);
      if (!useTransform) {
        ghost.style.left = x + 'px';
        ghost.style.top = y + 'px';
      }
      ghostAnimationFrame = null;
      if (fadeOut) {
        ghost.style.opacity = '0';
      }
    });
    return;
  }

  if (ghostAnimationFrame === null) {
    ghostAnimationFrame = requestAnimationFrame(() => {
      transformString && (ghost.style.transform = transformString);
      if (!useTransform) {
        ghost.style.left = x + 'px';
        ghost.style.top = y + 'px';
      }
      ghostAnimationFrame = null;
      if (fadeOut) {
        ghost.style.opacity = '0';
      }
    });
  }
}

function registerContainer(container) {
  containers.push(container);

  if (isDragging && draggableInfo) {
    if (container.isDragRelevant(draggableInfo.container, draggableInfo.payload)) {
      dragListeningContainers.push(container);
      container.prepareDrag(container, dragListeningContainers);

      if (handleScroll) {
        handleScroll({ reset: true, draggableInfo: undefined });
      }
      handleScroll = getScrollHandler(container, dragListeningContainers);
      handleDrag = dragHandler(dragListeningContainers);
      container.handleDrag(draggableInfo);
    }
  }
}

function unregisterContainer(container) {
  containers.splice(containers.indexOf(container), 1);

  if (isDragging && draggableInfo) {
    if (draggableInfo.container === container) {
      container.fireRemoveElement();
    }

    if (draggableInfo.targetElement === container.element) {
      draggableInfo.targetElement = null;
    }

    const indexInDragListeners = dragListeningContainers.indexOf(container);
    if (indexInDragListeners > -1) {
      dragListeningContainers.splice(indexInDragListeners, 1);
      if (handleScroll) {
        handleScroll({ reset: true, draggableInfo: undefined });
      }
      handleScroll = getScrollHandler(container, dragListeningContainers);
      handleDrag = dragHandler(dragListeningContainers);
    }
  }
}

function watchRectangles() {
  let animationHandle = null;
  let isStarted = false;
  function _start() {
    animationHandle = requestAnimationFrame(() => {
      dragListeningContainers.forEach(p => p.layout.invalidateRects());
      setTimeout(() => {
        if (animationHandle !== null) _start();
      }, 50);
    });
  }

  function stop() {
    if (animationHandle !== null) {
      cancelAnimationFrame(animationHandle);
      animationHandle = null;
    }
    isStarted = false;
  }

  return {
    start: () => {
      if (!isStarted) {
        isStarted = true;
        _start();
      }
    },
    stop
  };
}

function cancelDrag() {
  if (isDragging && !isCanceling && !dropAnimationStarted) {
    isCanceling = true;
    missedDrag = false;

    const outOfBoundsDraggableInfo = Object.assign({}, draggableInfo, {
      targetElement: null,
      position: { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
      mousePosition: { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
    });

    dragListeningContainers.forEach(container => {
      container.handleDrag(outOfBoundsDraggableInfo);
    });

    draggableInfo.targetElement = null;
    draggableInfo.cancelDrop = true;

    onMouseUp();
    isCanceling = false;
  }
}

function Mediator() {
  listenEvents();
  return {
    register: function (container) {
      registerContainer(container);
    },
    unregister: function (container) {
      unregisterContainer(container);
    },
    isDragging: function () {
      return isDragging;
    },
    cancelDrag,
  };
}

if (typeof window !== 'undefined') {
  addStyleToHead();
}

export default Mediator();
