/**
 * Grid Selection Utilities
 * Handles coordinate conversion and collision detection for grid-based drag selection
 */

/**
 * Convert viewport coordinates to content coordinates relative to a container
 * @param {number} viewportX - X coordinate in viewport
 * @param {number} viewportY - Y coordinate in viewport
 * @param {Object} containerBounds - Result of getBoundingClientRect() for the container
 * @param {number} scrollTop - Current scrollTop value of the container
 * @returns {Object} { x, y } - Content coordinates
 */
export function viewportToContentCoords(viewportX, viewportY, containerBounds, scrollTop) {
  return {
    x: viewportX - containerBounds.left,
    y: viewportY - containerBounds.top + scrollTop
  };
}

/**
 * Constrain a point within container bounds
 * @param {Object} point - { x, y } coordinates
 * @param {Object} containerBounds - Result of getBoundingClientRect() for the container
 * @param {number} scrollHeight - Scroll height of the container (scrollHeight property)
 * @returns {Object} Constrained point { x, y }
 */
export function constrainPoint(point, containerBounds, scrollHeight) {
  return {
    x: Math.max(0, Math.min(point.x, containerBounds.width)),
    y: Math.max(0, Math.min(point.y, scrollHeight))
  };
}

/**
 * Calculate the selection rectangle from start and end points
 * @param {Object} startPoint - { x, y } start point
 * @param {Object} endPoint - { x, y } end point
 * @returns {Object} Selection rectangle { left, top, right, bottom }
 */
export function getSelectionRect(startPoint, endPoint) {
  return {
    left: Math.min(startPoint.x, endPoint.x),
    top: Math.min(startPoint.y, endPoint.y),
    right: Math.max(startPoint.x, endPoint.x),
    bottom: Math.max(startPoint.y, endPoint.y),
  };
}

/**
 * Convert viewport bounds to content bounds
 * @param {Object} viewportBounds - Result of getBoundingClientRect() for an element
 * @param {Object} containerBounds - Result of getBoundingClientRect() for the container
 * @param {number} scrollTop - Current scrollTop value of the container
 * @returns {Object} Content bounds { left, top, right, bottom }
 */
export function viewportToContentBounds(viewportBounds, containerBounds, scrollTop) {
  return {
    left: viewportBounds.left - containerBounds.left,
    top: viewportBounds.top - containerBounds.top + scrollTop,
    right: viewportBounds.right - containerBounds.left,
    bottom: viewportBounds.bottom - containerBounds.top + scrollTop,
  };
}

/**
 * Check if two rectangles intersect
 * @param {Object} rect1 - First rectangle { left, top, right, bottom }
 * @param {Object} rect2 - Second rectangle { left, top, right, bottom }
 * @returns {boolean} True if rectangles intersect
 */
export function isIntersecting(rect1, rect2) {
  return rect1.left < rect2.right &&
         rect1.right > rect2.left &&
         rect1.top < rect2.bottom &&
         rect2.top < rect1.bottom;
}

/**
 * Calculate distance between two points
 * @param {Object} point1 - First point { x, y }
 * @param {Object} point2 - Second point { x, y }
 * @returns {number} Distance between points
 */
export function getPointDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2)
  );
}

/**
 * Find all items whose bounds intersect with the selection rectangle
 * @param {NodeList} items - DOM elements to check
 * @param {Object} selectionRect - Selection rectangle { left, top, right, bottom }
 * @param {Object} containerBounds - Container bounds for coordinate conversion
 * @param {number} scrollTop - Current scroll position
 * @returns {Array} Array of items that intersect with the selection
 */
export function findIntersectingItems(items, selectionRect, containerBounds, scrollTop) {
  const intersectingItems = [];

  items.forEach(item => {
    const itemBounds = item.getBoundingClientRect();
    const contentBounds = viewportToContentBounds(itemBounds, containerBounds, scrollTop);

    if (isIntersecting(contentBounds, selectionRect)) {
      intersectingItems.push(item);
    }
  });

  return intersectingItems;
}
