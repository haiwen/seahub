import { preventAutoScrollClass } from './constants';
import {
  getScrollingAxis,
  getVisibleRect,
  hasClass,
} from './utils';

const maxSpeed = 1500; // px/s

function getScrollParams(position, axis, rect) {
  const { left, right, top, bottom } = rect;
  const { x, y } = position;
  if (x < left || x > right || y < top || y > bottom) {
    return null;
  }

  let begin;
  let end;
  let pos;
  if (axis === 'x') {
    begin = left;
    end = right;
    pos = x;
  } else {
    begin = top;
    end = bottom;
    pos = y;
  }

  const scrollerSize = end - begin;

  const moveDistance = scrollerSize > 400 ? 100 : scrollerSize / 4;
  if (end - pos < moveDistance) {
    return {
      direction: 'end',
      speedFactor: (moveDistance - (end - pos)) / moveDistance
    };
  } else if (pos - begin < moveDistance) {
    return {
      direction: 'begin',
      speedFactor: (moveDistance - (pos - begin)) / moveDistance
    };
  }

  return null;
}

function addScrollValue(element, axis, value) {
  if (element) {
    if (element !== window) {
      if (axis === 'x') {
        element.scrollLeft += value;
      } else {
        element.scrollTop += value;
      }
    } else {
      if (axis === 'x') {
        element.scrollBy(value, 0);
      } else {
        element.scrollBy(0, value);
      }
    }
  }
}

const createAnimator = (element, axis = 'y') => {
  let request = null;
  let startTime = null;
  let direction = null;
  let speed = null;

  function animate(_direction, _speed) {
    direction = _direction;
    speed = _speed;
    start();
  }

  function start() {
    if (request === null) {
      request = requestAnimationFrame((timestamp) => {
        if (startTime === null) { startTime = timestamp; }
        const timeDiff = timestamp - startTime;
        startTime = timestamp;
        let distanceDiff = (timeDiff / 1000) * speed;
        distanceDiff = direction === 'begin' ? (0 - distanceDiff) : distanceDiff;
        addScrollValue(element, axis, distanceDiff);
        request = null;
        start();
      });
    }
  }

  function stop() {
    if (request !== null) {
      cancelAnimationFrame(request);
      request = null;
    }
    startTime = null;
  }

  return {
    animate,
    stop
  };
};

function rectangleGetter(element) {
  return () => {
    return getVisibleRect(element, element.getBoundingClientRect());
  };
}

function getScrollerAnimator(container) {
  const scrollerAnimators = [];

  let current = container.element;

  while (current) {
    const scrollingAxis = getScrollingAxis(current);

    if (scrollingAxis && !hasClass(current, preventAutoScrollClass)) {

      const axisAnimations = {};
      switch (scrollingAxis) {
        case 'xy':
          axisAnimations.x = {
            animator: createAnimator(current, 'x'),
          };
          axisAnimations.y = {
            animator: createAnimator(current, 'y'),
          };
          break;
        case 'x':
          axisAnimations.x = {
            animator: createAnimator(current, 'x'),
          };
          break;
        case 'y':
          axisAnimations.y = {
            animator: createAnimator(current, 'y'),
          };
          break;
        default:
      }

      scrollerAnimators.push({
        axisAnimations,
        getRect: rectangleGetter(current),
        scrollerElement: current,
      });
    }
    current = current.parentElement;
  }
  return scrollerAnimators;
}

function setScrollParams(animatorInfos, position) {
  animatorInfos.forEach((animator) => {
    const { axisAnimations, getRect } = animator;
    const rect = getRect();
    if (axisAnimations.x) {
      axisAnimations.x.scrollParams = getScrollParams(position, 'x', rect);
      animator.cachedRect = rect;
    }

    if (axisAnimations.y) {
      axisAnimations.y.scrollParams = getScrollParams(position, 'y', rect);
      animator.cachedRect = rect;
    }
  });
}

function getTopmostScrollAnimator(animatorInfos, position) {
  let current = document.elementFromPoint(position.x, position.y);

  while (current) {
    const scrollAnimator = animatorInfos.find(p => p.scrollerElement === current);
    if (scrollAnimator) {
      return scrollAnimator;
    }

    current = current.parentElement;
  }

  return null;
}

const dragScroller = (containers, maxScrollSpeed = maxSpeed) => {
  const animatorInfos = containers.reduce((acc, container) => {
    const filteredAnimators = getScrollerAnimator(container).filter(p => {
      return !acc.find(q => q.scrollerElement === p.scrollerElement);
    });
    return [...acc, ...filteredAnimators];
  }, []);


  return ({ draggableInfo, reset }) => {
    if (reset) {
      animatorInfos.forEach(p => {
        p.axisAnimations.x && p.axisAnimations.x.animator.stop();
        p.axisAnimations.y && p.axisAnimations.y.animator.stop();
      });
      return;
    }

    if (draggableInfo) {
      setScrollParams(animatorInfos, draggableInfo.mousePosition);

      animatorInfos.forEach(animator => {
        const { x, y } = animator.axisAnimations;
        if (x) {
          if (x.scrollParams) {
            const { direction, speedFactor } = x.scrollParams;
            x.animator.animate(direction, speedFactor * maxScrollSpeed);
          } else {
            x.animator.stop();
          }
        }

        if (y) {
          if (y.scrollParams) {
            const { direction, speedFactor } = y.scrollParams;
            y.animator.animate(direction, speedFactor * maxScrollSpeed);
          } else {
            y.animator.stop();
          }
        }
      });

      const overlappingAnimators = animatorInfos.filter(p => p.cachedRect);
      if (overlappingAnimators.length && overlappingAnimators.length > 1) {
        // stop animations except topmost
        const topScrollerAnimator = getTopmostScrollAnimator(overlappingAnimators, draggableInfo.mousePosition);

        if (topScrollerAnimator) {
          overlappingAnimators.forEach(p => {
            if (p !== topScrollerAnimator) {
              p.axisAnimations.x && p.axisAnimations.x.animator.stop();
              p.axisAnimations.y && p.axisAnimations.y.animator.stop();
            }
          });
        }
      }
    }
  };
};

export default dragScroller;
