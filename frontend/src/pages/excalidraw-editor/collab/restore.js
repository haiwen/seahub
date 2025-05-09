import {
  isInvisiblySmallElement,
  isTextElement,
  refreshTextDimensions,
  getContainerElement,
  isLinearElement,
  isArrowElement,
  isElbowArrow,
  invariant,
  isBindableElement,
  getHoveredElementForBinding,
  bindPointToSnapToElementOutline,
  snapToMid,
  getGlobalFixedPointForBindableElement,
  FIXED_BINDING_DISTANCE,
  getHeadingForElbowArrowSnap
} from '@excalidraw/excalidraw';
// import { isInvisiblySmallElement } from '@excalidraw/excalidraw/index';
// import { isTextElement } from '@excalidraw/excalidraw/element/typeChecks';
// import { refreshTextDimensions } from '@excalidraw/excalidraw/element/newElement';
// import { getContainerElement } from '@excalidraw/excalidraw/element/textElement';
// import { isLinearElement } from '@excalidraw/excalidraw/element/typeChecks';
// import { isArrowElement } from '@excalidraw/excalidraw/element/typeChecks';
// import { isElbowArrow } from '@excalidraw/excalidraw/element/typeChecks';
// import { invariant } from '@excalidraw/excalidraw/utils';
// import { isBindableElement } from '@excalidraw/excalidraw/element/typeChecks';
// import { getHoveredElementForBinding } from '@excalidraw/excalidraw/element/binding';
// import { bindPointToSnapToElementOutline } from '@excalidraw/excalidraw/element/binding';
// import { snapToMid } from '@excalidraw/excalidraw/element/binding';
// import { getGlobalFixedPointForBindableElement } from '@excalidraw/excalidraw/element/binding';
// import { FIXED_BINDING_DISTANCE } from '@excalidraw/excalidraw/element/binding';
// import { getHeadingForElbowArrowSnap } from '@excalidraw/excalidraw/element/binding';

export const restoreElements = (
  elements,
  /** NOTE doesn't serve for reconciliation */
  localElements,
  opts,
) => {
  // used to detect duplicate top-level element ids
  const existingIds = new Set();
  const localElementsMap = localElements ? arrayToMap(localElements) : null;
  const restoredElements = syncInvalidIndices(
    (elements || []).reduce((elements, element) => {
      // filtering out selection, which is legacy, no longer kept in elements,
      // and causing issues if retained
      if (element.type !== 'selection' && !isInvisiblySmallElement(element)) {
        let migratedElement = restoreElement(element);
        if (migratedElement) {
          const localElement = localElementsMap?.get(element.id);
          if (localElement && localElement.version > migratedElement.version) {
            migratedElement = bumpVersion(
              migratedElement,
              localElement.version,
            );
          }
          if (existingIds.has(migratedElement.id)) {
            migratedElement = { ...migratedElement, id: randomId() };
          }
          existingIds.add(migratedElement.id);

          elements.push(migratedElement);
        }
      }
      return elements;
    }, []),
  );

  if (!opts?.repairBindings) {
    return restoredElements;
  }

  // repair binding. Mutates elements.
  const restoredElementsMap = arrayToMap(restoredElements);
  for (const element of restoredElements) {
    if (element.frameId) {
      repairFrameMembership(element, restoredElementsMap);
    }

    if (isTextElement(element) && element.containerId) {
      repairBoundElement(element, restoredElementsMap);
    } else if (element.boundElements) {
      repairContainerElement(element, restoredElementsMap);
    }

    if (opts.refreshDimensions && isTextElement(element)) {
      Object.assign(
        element,
        refreshTextDimensions(
          element,
          getContainerElement(element, restoredElementsMap),
          restoredElementsMap,
        ),
      );
    }

    if (isLinearElement(element)) {
      if (
        element.startBinding &&
        (!restoredElementsMap.has(element.startBinding.elementId) ||
          !isArrowElement(element))
      ) {
        element.startBinding = null;
      }
      if (
        element.endBinding &&
        (!restoredElementsMap.has(element.endBinding.elementId) ||
          !isArrowElement(element))
      ) {
        element.endBinding = null;
      }
    }
  }

  // NOTE (mtolmacs): Temporary fix for extremely large arrows
  // Need to iterate again so we have attached text nodes in elementsMap
  return restoredElements.map((element) => {
    if (
      isElbowArrow(element) &&
      element.startBinding == null &&
      element.endBinding == null &&
      !validateElbowPoints(element.points)
    ) {
      return {
        ...element,
        ...updateElbowArrowPoints(
          element,
          restoredElementsMap,
          {
            points: [
              pointFrom(0, 0),
              element.points[element.points.length - 1],
            ],
          },
        ),
        index: element.index,
      };
    }

    if (
      isElbowArrow(element) &&
      element.startBinding &&
      element.endBinding &&
      element.startBinding.elementId === element.endBinding.elementId &&
      element.points.length > 1 &&
      element.points.some(
        ([rx, ry]) => Math.abs(rx) > 1e6 || Math.abs(ry) > 1e6,
      )
    ) {
      console.error('Fixing self-bound elbow arrow', element.id);
      const boundElement = restoredElementsMap.get(
        element.startBinding.elementId,
      );
      if (!boundElement) {
        console.error(
          'Bound element not found',
          element.startBinding.elementId,
        );
        return element;
      }

      return {
        ...element,
        x: boundElement.x + boundElement.width / 2,
        y: boundElement.y - 5,
        width: boundElement.width,
        height: boundElement.height,
        points: [
          pointFrom(0, 0),
          pointFrom(0, -10),
          pointFrom(boundElement.width / 2 + 5, -10),
          pointFrom(
            boundElement.width / 2 + 5,
            boundElement.height / 2 + 5,
          )
        ],
      };
    }

    return element;
  });
};

/**
 * Transforms array of objects containing `id` attribute,
 * or array of ids (strings), into a Map, keyd by `id`.
 */
export const arrayToMap = (
  items,
) => {
  if (items instanceof Map) {
    return items;
  }
  return items.reduce((acc, element) => {
    acc.set(typeof element === 'string' ? element : element.id, element);
    return acc;
  }, new Map());
};

/**
 * Synchronizes all invalid fractional indices with the array order by mutating passed elements.
 *
 * WARN: in edge cases it could modify the elements which were not moved, as it's impossible to guess the actually moved elements from the elements array itself.
 */
export const syncInvalidIndices = (elements) => {
  const indicesGroups = getInvalidIndicesGroups(elements);
  const elementsUpdates = generateIndices(elements, indicesGroups);
  for (const [element, update] of elementsUpdates) {
    mutateElement(element, update, false);
  }

  return elements;
};

/**
 * Gets contiguous groups of all invalid indices automatically detected inside the elements array.
 *
 * WARN: First and last items within the groups do NOT have to be contiguous, those are the found lower and upper bounds!
 */
const getInvalidIndicesGroups = (elements) => {
  const indicesGroups = [];

  // once we find lowerBound / upperBound, it cannot be lower than that, so we cache it for better perf.
  let lowerBound = undefined;
  let upperBound = undefined;
  let lowerBoundIndex = -1;
  let upperBoundIndex = 0;

  /** @returns maybe valid lowerBound */
  const getLowerBound = (index) => {
    const lowerBound = elements[lowerBoundIndex]
      ? elements[lowerBoundIndex].index
      : undefined;

    // we are already iterating left to right, therefore there is no need for additional looping
    const candidate = elements[index - 1]?.index;

    if (
      (!lowerBound && candidate) || // first lowerBound
      (lowerBound && candidate && candidate > lowerBound) // next lowerBound
    ) {
      // WARN: candidate's index could be higher or same as the current element's index
      return [candidate, index - 1];
    }

    // cache hit! take the last lower bound
    return [lowerBound, lowerBoundIndex];
  };

  /** @returns always valid upperBound */
  const getUpperBound = (index) => {
    const upperBound = elements[upperBoundIndex]
      ? elements[upperBoundIndex].index
      : undefined;

    // cache hit! don't let it find the upper bound again
    if (upperBound && index < upperBoundIndex) {
      return [upperBound, upperBoundIndex];
    }

    // set the current upperBoundIndex as the starting point
    let i = upperBoundIndex;
    while (++i < elements.length) {
      const candidate = elements[i]?.index;

      if (
        (!upperBound && candidate) || // first upperBound
        (upperBound && candidate && candidate > upperBound) // next upperBound
      ) {
        return [candidate, i];
      }
    }

    // we reached the end, sky is the limit
    return [undefined, i];
  };

  let i = 0;

  while (i < elements.length) {
    const current = elements[i].index;
    [lowerBound, lowerBoundIndex] = getLowerBound(i);
    [upperBound, upperBoundIndex] = getUpperBound(i);

    if (!isValidFractionalIndex(current, lowerBound, upperBound)) {
      // push the lower bound index as the first item
      const indicesGroup = [lowerBoundIndex, i];

      while (++i < elements.length) {
        const current = elements[i].index;
        const [nextLowerBound, nextLowerBoundIndex] = getLowerBound(i);
        const [nextUpperBound, nextUpperBoundIndex] = getUpperBound(i);

        if (isValidFractionalIndex(current, nextLowerBound, nextUpperBound)) {
          break;
        }

        // assign bounds only for the moved elements
        [lowerBound, lowerBoundIndex] = [nextLowerBound, nextLowerBoundIndex];
        [upperBound, upperBoundIndex] = [nextUpperBound, nextUpperBoundIndex];

        indicesGroup.push(i);
      }

      // push the upper bound index as the last item
      indicesGroup.push(upperBoundIndex);
      indicesGroups.push(indicesGroup);
    } else {
      i++;
    }
  }

  return indicesGroups;
};

const isValidFractionalIndex = (
  index,
  predecessor,
  successor
) => {
  if (!index) {
    return false;
  }

  if (predecessor && successor) {
    return predecessor < index && index < successor;
  }

  if (!predecessor && successor) {
    // first element
    return index < successor;
  }

  if (predecessor && !successor) {
    // last element
    return predecessor < index;
  }

  // only element in the array
  return !!index;
};

const generateIndices = (
  elements,
  indicesGroups
) => {
  const elementsUpdates = new Map();

  for (const indices of indicesGroups) {
    const lowerBoundIndex = indices.shift();
    const upperBoundIndex = indices.pop();

    const fractionalIndices = generateNKeysBetween(
      elements[lowerBoundIndex]?.index,
      elements[upperBoundIndex]?.index,
      indices.length,
    );

    for (let i = 0; i < indices.length; i++) {
      const element = elements[indices[i]];

      elementsUpdates.set(element, {
        index: fractionalIndices[i],
      });
    }
  }

  return elementsUpdates;
};

/**
 * Remove an element's frameId if its containing frame is non-existent
 *
 * NOTE mutates elements.
 */
const repairFrameMembership = (element, elementsMap,) => {
  if (element.frameId) {
    const containingFrame = elementsMap.get(element.frameId);

    if (!containingFrame) {
      element.frameId = null;
    }
  }
};

/**
 * Repairs target bound element's container's boundElements array,
 * or removes contaienrId if container does not exist.
 *
 * NOTE mutates elements.
 */
const repairBoundElement = (
  boundElement,
  elementsMap,
) => {
  const container = boundElement.containerId
    ? elementsMap.get(boundElement.containerId)
    : null;

  if (!container) {
    boundElement.containerId = null;
    return;
  }

  if (boundElement.isDeleted) {
    return;
  }

  if (
    container.boundElements &&
    !container.boundElements.find((binding) => binding.id === boundElement.id)
  ) {
    // copy because we're not cloning on restore, and we don't want to mutate upstream
    const boundElements = (
      container.boundElements || (container.boundElements = [])
    ).slice();
    boundElements.push({ type: 'text', id: boundElement.id });
    container.boundElements = boundElements;
  }
};

/**
 * Repairs container element's boundElements array by removing duplicates and
 * fixing containerId of bound elements if not present. Also removes any
 * bound elements that do not exist in the elements array.
 *
 * NOTE mutates elements.
 */
const repairContainerElement = (
  container,
  elementsMap,
) => {
  if (container.boundElements) {
    // copy because we're not cloning on restore, and we don't want to mutate upstream
    const boundElements = container.boundElements.slice();

    // dedupe bindings & fix boundElement.containerId if not set already
    const boundIds = new Set();
    container.boundElements = boundElements.reduce(
      (
        acc,
        binding,
      ) => {
        const boundElement = elementsMap.get(binding.id);
        if (boundElement && !boundIds.has(binding.id)) {
          boundIds.add(binding.id);

          if (boundElement.isDeleted) {
            return acc;
          }

          acc.push(binding);

          if (
            isTextElement(boundElement) &&
            // being slightly conservative here, preserving existing containerId
            // if defined, lest boundElements is stale
            !boundElement.containerId
          ) {
            boundElement.containerId =
              container.id;
          }
        }
        return acc;
      },
      [],
    );
  }
};

export const validateElbowPoints = (
  points,
  tolerance,
) => {
  points
    .slice(1)
    .map(
      (p, i) =>
        Math.abs(p[0] - points[i][0]) < tolerance ||
        Math.abs(p[1] - points[i][1]) < tolerance,
    )
    .every(Boolean);
};

const MAX_POS = 1e6;
export const updateElbowArrowPoints = (
  arrow,
  elementsMap,
  updates,
  options,
) => {
  if (arrow.points.length < 2) {
    return { points: updates.points ?? arrow.points };
  }

  // NOTE (mtolmacs): This is a temporary check to ensure that the incoming elbow
  // arrow size is valid. This check will be removed once the issue is identified
  if (
    arrow.x < -MAX_POS ||
    arrow.x > MAX_POS ||
    arrow.y < -MAX_POS ||
    arrow.y > MAX_POS ||
    arrow.x + (updates?.points?.[updates?.points?.length - 1]?.[0] ?? 0) <
      -MAX_POS ||
    arrow.x + (updates?.points?.[updates?.points?.length - 1]?.[0] ?? 0) >
      MAX_POS ||
    arrow.y + (updates?.points?.[updates?.points?.length - 1]?.[1] ?? 0) <
      -MAX_POS ||
    arrow.y + (updates?.points?.[updates?.points?.length - 1]?.[1] ?? 0) >
      MAX_POS ||
    arrow.x + (arrow?.points?.[arrow?.points?.length - 1]?.[0] ?? 0) <
      -MAX_POS ||
    arrow.x + (arrow?.points?.[arrow?.points?.length - 1]?.[0] ?? 0) >
      MAX_POS ||
    arrow.y + (arrow?.points?.[arrow?.points?.length - 1]?.[1] ?? 0) <
      -MAX_POS ||
    arrow.y + (arrow?.points?.[arrow?.points?.length - 1]?.[1] ?? 0) > MAX_POS
  ) {
    console.error(
      'Elbow arrow (or update) is outside reasonable bounds (> 1e6)',
      {
        arrow,
        updates,
      },
    );
  }
  // @ts-ignore See above note
  arrow.x = clamp(arrow.x, -MAX_POS, MAX_POS);
  // @ts-ignore See above note
  arrow.y = clamp(arrow.y, -MAX_POS, MAX_POS);
  if (updates.points) {
    updates.points = updates.points.map(([x, y]) =>
      pointFrom(
        clamp(x, -MAX_POS, MAX_POS),
        clamp(y, -MAX_POS, MAX_POS),
      ),
    );
  }

  if (!process.env.NODE_ENV === 'production') {
    invariant(
      !updates.points || updates.points.length >= 2,
      'Updated point array length must match the arrow point length, contain ' +
        'exactly the new start and end points or not be specified at all (i.e. ' +
        'you can\'t add new points between start and end manually to elbow arrows)',
    );

    invariant(
      !arrow.fixedSegments ||
        arrow.fixedSegments
          .map((s) => s.start[0] === s.end[0] || s.start[1] === s.end[1])
          .every(Boolean),
      'Fixed segments must be either horizontal or vertical',
    );

    invariant(
      !updates.fixedSegments ||
        updates.fixedSegments
          .map((s) => s.start[0] === s.end[0] || s.start[1] === s.end[1])
          .every(Boolean),
      'Updates to fixed segments must be either horizontal or vertical',
    );

    invariant(
      arrow.points
        .slice(1)
        .map(
          (p, i) => p[0] === arrow.points[i][0] || p[1] === arrow.points[i][1],
        ),
      'Elbow arrow segments must be either horizontal or vertical',
    );
  }

  const fixedSegments = updates.fixedSegments ?? arrow.fixedSegments ?? [];

  const updatedPoints = updates.points
    ? updates.points && updates.points.length === 2
      ? arrow.points.map((p, idx) =>
        idx === 0
          ? updates.points[0]
          : idx === arrow.points.length - 1
            ? updates.points[1]
            : p,
      )
      : updates.points.slice()
    : arrow.points.slice();

  // During all element replacement in the scene, we just need to renormalize
  // the arrow
  // TODO (dwelle,mtolmacs): Remove this once Scene.getScene() is removed
  const {
    startBinding: updatedStartBinding,
    endBinding: updatedEndBinding,
    ...restOfTheUpdates
  } = updates;
  const startBinding =
    typeof updatedStartBinding !== 'undefined'
      ? updatedStartBinding
      : arrow.startBinding;
  const endBinding =
    typeof updatedEndBinding !== 'undefined'
      ? updatedEndBinding
      : arrow.endBinding;
  const startElement =
    startBinding &&
    getBindableElementForId(startBinding.elementId, elementsMap);
  const endElement =
    endBinding && getBindableElementForId(endBinding.elementId, elementsMap);
  const areUpdatedPointsValid = validateElbowPoints(updatedPoints);

  if (
    (startBinding && !startElement && areUpdatedPointsValid) ||
    (endBinding && !endElement && areUpdatedPointsValid) ||
    (elementsMap.size === 0 && areUpdatedPointsValid) ||
    (Object.keys(restOfTheUpdates).length === 0 &&
      (startElement?.id !== startBinding?.elementId ||
        endElement?.id !== endBinding?.elementId))
  ) {
    return normalizeArrowElementUpdate(
      updatedPoints.map((p) =>
        pointFrom(arrow.x + p[0], arrow.y + p[1]),
      ),
      arrow.fixedSegments,
      arrow.startIsSpecial,
      arrow.endIsSpecial,
    );
  }

  const {
    startHeading,
    endHeading,
    startGlobalPoint,
    endGlobalPoint,
    hoveredStartElement,
    hoveredEndElement,
    ...rest
  } = getElbowArrowData(
    {
      x: arrow.x,
      y: arrow.y,
      startBinding,
      endBinding,
      startArrowhead: arrow.startArrowhead,
      endArrowhead: arrow.endArrowhead,
      points: arrow.points,
    },
    elementsMap,
    updatedPoints,
    options,
  );

  // 0. During all element replacement in the scene, we just need to renormalize
  // the arrow
  // TODO (dwelle,mtolmacs): Remove this once Scene.getScene() is removed
  if (elementsMap.size === 0 && areUpdatedPointsValid) {
    return normalizeArrowElementUpdate(
      updatedPoints.map((p) =>
        pointFrom(arrow.x + p[0], arrow.y + p[1]),
      ),
      arrow.fixedSegments,
      arrow.startIsSpecial,
      arrow.endIsSpecial,
    );
  }

  // //
  // 1. Renormalize the arrow
  // //
  if (
    !updates.points &&
    !updates.fixedSegments &&
    !updates.startBinding &&
    !updates.endBinding
  ) {
    return handleSegmentRenormalization(arrow, elementsMap);
  }

  // Short circuit on no-op to avoid huge performance hit
  if (
    updates.startBinding === arrow.startBinding &&
    updates.endBinding === arrow.endBinding &&
    (updates.points ?? []).every((p, i) =>
      pointsEqual(
        p,
        arrow.points[i] ?? pointFrom < LocalPoint > (Infinity, Infinity),
      ),
    ) &&
    areUpdatedPointsValid
  ) {
    return {};
  }

  // //
  // 2. Just normal elbow arrow things
  // //
  if (fixedSegments.length === 0) {
    return normalizeArrowElementUpdate(
      getElbowArrowCornerPoints(
        removeElbowArrowShortSegments(
          routeElbowArrow(arrow, {
            startHeading,
            endHeading,
            startGlobalPoint,
            endGlobalPoint,
            hoveredStartElement,
            hoveredEndElement,
            ...rest,
          }) ?? [],
        ),
      ),
      fixedSegments,
      null,
      null,
    );
  }

  // //
  // 3. Handle releasing a fixed segment
  if ((arrow.fixedSegments?.length ?? 0) > fixedSegments.length) {
    return handleSegmentRelease(arrow, fixedSegments, elementsMap);
  }

  // //
  // 4. Handle manual segment move
  // //
  if (!updates.points) {
    return handleSegmentMove(
      arrow,
      fixedSegments,
      startHeading,
      endHeading,
      hoveredStartElement,
      hoveredEndElement,
    );
  }

  // //
  // 5. Handle resize
  // //
  if (updates.points && updates.fixedSegments) {
    return updates;
  }

  // //
  // 6. One or more segments are fixed and endpoints are moved
  //
  // The key insights are:
  // - When segments are fixed, the arrow will keep the exact amount of segments
  // - Fixed segments are "replacements" for exactly one segment in the old arrow
  // //
  return handleEndpointDrag(
    arrow,
    updatedPoints,
    fixedSegments,
    startHeading,
    endHeading,
    startGlobalPoint,
    endGlobalPoint,
    hoveredStartElement,
    hoveredEndElement,
  );
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Create a properly typed Point instance from the X and Y coordinates.
 *
 * @param x The X coordinate
 * @param y The Y coordinate
 * @returns The branded and created point
 */
export function pointFrom(x, y) {
  return [x, y];
}

const getBindableElementForId = (
  id,
  elementsMap
) => {
  const element = elementsMap.get(id);
  if (element && isBindableElement(element)) {
    return element;
  }

  return null;
};

const normalizeArrowElementUpdate = (
  global,
  nextFixedSegments,
  startIsSpecial,
  endIsSpecial,
) => {
  const offsetX = global[0][0];
  const offsetY = global[0][1];
  let points = global.map((p) =>
    pointTranslate(
      p,
      vectorScale(vectorFromPoint(global[0]), -1),
    ),
  );

  // NOTE (mtolmacs): This is a temporary check to see if the normalization
  // creates an overly large arrow. This should be removed once we have an answer.
  if (
    offsetX < -MAX_POS ||
    offsetX > MAX_POS ||
    offsetY < -MAX_POS ||
    offsetY > MAX_POS ||
    offsetX + points[points.length - 1][0] < -MAX_POS ||
    offsetY + points[points.length - 1][0] > MAX_POS ||
    offsetX + points[points.length - 1][1] < -MAX_POS ||
    offsetY + points[points.length - 1][1] > MAX_POS
  ) {
    console.error(
      'Elbow arrow normalization is outside reasonable bounds (> 1e6)',
      {
        x: offsetX,
        y: offsetY,
        points,
        ...getSizeFromPoints(points),
      },
    );
  }

  points = points.map(([x, y]) =>
    pointFrom < LocalPoint > (clamp(x, -1e6, 1e6), clamp(y, -1e6, 1e6)),
  );

  return {
    points,
    x: clamp(offsetX, -1e6, 1e6),
    y: clamp(offsetY, -1e6, 1e6),
    fixedSegments:
      (nextFixedSegments?.length ?? 0) > 0 ? nextFixedSegments : null,
    ...getSizeFromPoints(points),
    startIsSpecial,
    endIsSpecial,
  };
};

/**
 * Translate a point by a vector.
 *
 * WARNING: This is not for translating Excalidraw element points!
 *          You need to account for rotation on base coordinates
 *          on your own.
 *          CONSIDER USING AN APPROPRIATE ELEMENT-AWARE TRANSLATE!
 *
 * @param p The point to apply the translation on
 * @param v The vector to translate by
 * @returns
 */
// TODO 99% of use is translating between global and local coords, which need to be formalized
export function pointTranslate(p, v) {
  return pointFrom(p[0] + v[0], p[1] + v[1]);
}

/**
 * Scale vector by a scalar.
 *
 * @param v The vector to scale
 * @param scalar The scalar to multiply the vector components with
 * @returns The new scaled vector
 */
export function vectorScale(v, scalar) {
  return vector(v[0] * scalar, v[1] * scalar);
}

/**
 * Create a vector from the x and y coordiante elements.
 *
 * @param x The X aspect of the vector
 * @param y T Y aspect of the vector
 * @returns The constructed vector with X and Y as the coordinates
 */
export function vector(
  x,
  y,
  originX = 0,
  originY = 0,
) {
  return [x - originX, y - originY];
}

/**
 * Cross product is a binary operation on two vectors in 2D space.
 * It results in a vector that is perpendicular to both vectors.
 *
 * @param a One of the vectors to use for the directed area calculation
 * @param b The other vector to use for the directed area calculation
 * @returns The directed area value for the two vectos
 */
export function vectorCross(a, b) {
  return a[0] * b[1] - b[0] * a[1];
}

/**
 * Normalize the vector (i.e. make the vector magnitue equal 1).
 *
 * @param v The vector to normalize
 * @returns The new normalized vector
 */
export const vectorNormalize = (v) => {
  const m = vectorMagnitude(v);

  if (m === 0) {
    return vector(0, 0);
  }

  return vector(v[0] / m, v[1] / m);
};

/**
 * Calculates the magnitude of a vector.
 *
 * @param v The vector to measure
 * @returns The scalar magnitude of the vector
 */
export function vectorMagnitude(v) {
  return Math.sqrt(vectorMagnitudeSq(v));
}

/**
 * Calculates the sqare magnitude of a vector. Use this if you compare
 * magnitudes as it saves you an SQRT.
 *
 * @param v The vector to measure
 * @returns The scalar squared magnitude of the vector
 */
export function vectorMagnitudeSq(v) {
  return v[0] * v[0] + v[1] * v[1];
}

/**
 * Turn a point into a vector with the origin point.
 *
 * @param p The point to turn into a vector
 * @param origin The origin point in a given coordiante system
 * @returns The created vector from the point and the origin
 */
export function vectorFromPoint(
  p,
  origin,
) {
  return vector(p[0] - origin[0], p[1] - origin[1]);
}

export const getSizeFromPoints = (
  points,
) => {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};

/**
 * Retrieves data necessary for calculating the elbow arrow path.
 *
 * @param arrow - The arrow object containing its properties.
 * @param elementsMap - A map of elements in the scene.
 * @param nextPoints - The next set of points for the arrow.
 * @param options - Optional parameters for the calculation.
 * @param options.isDragging - Indicates if the arrow is being dragged.
 * @param options.startIsMidPoint - Indicates if the start point is a midpoint.
 * @param options.endIsMidPoint - Indicates if the end point is a midpoint.
 *
 * @returns An object containing various properties needed for elbow arrow calculations:
 * - dynamicAABBs: Dynamically generated axis-aligned bounding boxes.
 * - startDonglePosition: The position of the start dongle.
 * - startGlobalPoint: The global coordinates of the start point.
 * - startHeading: The heading direction from the start point.
 * - endDonglePosition: The position of the end dongle.
 * - endGlobalPoint: The global coordinates of the end point.
 * - endHeading: The heading direction from the end point.
 * - commonBounds: The common bounding box that encompasses both start and end points.
 * - hoveredStartElement: The element being hovered over at the start point.
 * - hoveredEndElement: The element being hovered over at the end point.
 */
const getElbowArrowData = (
  arrow,
  elementsMap,
  nextPoints,
  options,
) => {
  const origStartGlobalPoint = pointTranslate(nextPoints[0], vector(arrow.x, arrow.y));
  const origEndGlobalPoint = pointTranslate(nextPoints[nextPoints.length - 1], vector(arrow.x, arrow.y));

  let hoveredStartElement = null;
  let hoveredEndElement = null;
  if (options?.isDragging) {
    const elements = Array.from(elementsMap.values());
    hoveredStartElement =
      getHoveredElement(
        origStartGlobalPoint,
        elementsMap,
        elements,
        options?.zoom,
      ) || null;
    hoveredEndElement =
      getHoveredElement(
        origEndGlobalPoint,
        elementsMap,
        elements,
        options?.zoom,
      ) || null;
  } else {
    hoveredStartElement = arrow.startBinding
      ? getBindableElementForId(arrow.startBinding.elementId, elementsMap) ||
        null
      : null;
    hoveredEndElement = arrow.endBinding
      ? getBindableElementForId(arrow.endBinding.elementId, elementsMap) || null
      : null;
  }

  const startGlobalPoint = getGlobalPoint(
    {
      ...arrow,
      type: 'arrow',
      elbowed: true,
      points: nextPoints,
    },
    'start',
    arrow.startBinding?.fixedPoint,
    origStartGlobalPoint,
    hoveredStartElement,
    options?.isDragging,
  );
  const endGlobalPoint = getGlobalPoint(
    {
      ...arrow,
      type: 'arrow',
      elbowed: true,
      points: nextPoints,
    },
    'end',
    arrow.endBinding?.fixedPoint,
    origEndGlobalPoint,
    hoveredEndElement,
    options?.isDragging,
  );
  const startHeading = getBindPointHeading(
    startGlobalPoint,
    endGlobalPoint,
    elementsMap,
    hoveredStartElement,
    origStartGlobalPoint,
  );
  const endHeading = getBindPointHeading(
    endGlobalPoint,
    startGlobalPoint,
    elementsMap,
    hoveredEndElement,
    origEndGlobalPoint,
  );
  const startPointBounds = [
    startGlobalPoint[0] - 2,
    startGlobalPoint[1] - 2,
    startGlobalPoint[0] + 2,
    startGlobalPoint[1] + 2,
  ];
  const endPointBounds = [
    endGlobalPoint[0] - 2,
    endGlobalPoint[1] - 2,
    endGlobalPoint[0] + 2,
    endGlobalPoint[1] + 2,
  ];
  const startElementBounds = hoveredStartElement
    ? aabbForElement(
      hoveredStartElement,
      offsetFromHeading(
        startHeading,
        arrow.startArrowhead
          ? FIXED_BINDING_DISTANCE * 6
          : FIXED_BINDING_DISTANCE * 2,
        1,
      ),
    )
    : startPointBounds;
  const endElementBounds = hoveredEndElement
    ? aabbForElement(
      hoveredEndElement,
      offsetFromHeading(
        endHeading,
        arrow.endArrowhead
          ? FIXED_BINDING_DISTANCE * 6
          : FIXED_BINDING_DISTANCE * 2,
        1,
      ),
    )
    : endPointBounds;
  const boundsOverlap =
    pointInsideBounds(
      startGlobalPoint,
      hoveredEndElement
        ? aabbForElement(
          hoveredEndElement,
          offsetFromHeading(endHeading, BASE_PADDING, BASE_PADDING),
        )
        : endPointBounds,
    ) ||
    pointInsideBounds(
      endGlobalPoint,
      hoveredStartElement
        ? aabbForElement(
          hoveredStartElement,
          offsetFromHeading(startHeading, BASE_PADDING, BASE_PADDING),
        )
        : startPointBounds,
    );
  const commonBounds = commonAABB(
    boundsOverlap
      ? [startPointBounds, endPointBounds]
      : [startElementBounds, endElementBounds],
  );
  const dynamicAABBs = generateDynamicAABBs(
    boundsOverlap ? startPointBounds : startElementBounds,
    boundsOverlap ? endPointBounds : endElementBounds,
    commonBounds,
    boundsOverlap
      ? offsetFromHeading(
        startHeading,
        !hoveredStartElement && !hoveredEndElement ? 0 : BASE_PADDING,
        0,
      )
      : offsetFromHeading(
        startHeading,
        !hoveredStartElement && !hoveredEndElement
          ? 0
          : BASE_PADDING -
                (arrow.startArrowhead
                  ? FIXED_BINDING_DISTANCE * 6
                  : FIXED_BINDING_DISTANCE * 2),
        BASE_PADDING,
      ),
    boundsOverlap
      ? offsetFromHeading(
        endHeading,
        !hoveredStartElement && !hoveredEndElement ? 0 : BASE_PADDING,
        0,
      )
      : offsetFromHeading(
        endHeading,
        !hoveredStartElement && !hoveredEndElement
          ? 0
          : BASE_PADDING -
                (arrow.endArrowhead
                  ? FIXED_BINDING_DISTANCE * 6
                  : FIXED_BINDING_DISTANCE * 2),
        BASE_PADDING,
      ),
    boundsOverlap,
    hoveredStartElement && aabbForElement(hoveredStartElement),
    hoveredEndElement && aabbForElement(hoveredEndElement),
  );
  const startDonglePosition = getDonglePosition(
    dynamicAABBs[0],
    startHeading,
    startGlobalPoint,
  );
  const endDonglePosition = getDonglePosition(
    dynamicAABBs[1],
    endHeading,
    endGlobalPoint,
  );

  return {
    dynamicAABBs,
    startDonglePosition,
    startGlobalPoint,
    startHeading,
    endDonglePosition,
    endGlobalPoint,
    endHeading,
    commonBounds,
    hoveredStartElement,
    hoveredEndElement,
    boundsOverlap,
    startElementBounds,
    endElementBounds,
  };
};

const getHoveredElement = (
  origPoint,
  elementsMap,
  elements,
  zoom,
) => {
  return getHoveredElementForBinding(
    tupleToCoors(origPoint),
    elements,
    elementsMap,
    zoom,
    true,
    true,
  );
};

export const tupleToCoors = (
  xyTuple,
) => {
  const [x, y] = xyTuple;
  return { x, y };
};

const getGlobalPoint = (
  arrow,
  startOrEnd,
  fixedPointRatio,
  initialPoint,
  element,
  isDragging,
) => {
  if (isDragging) {
    if (element) {
      const snapPoint = bindPointToSnapToElementOutline(
        arrow,
        element,
        startOrEnd,
      );

      return snapToMid(element, snapPoint);
    }

    return initialPoint;
  }

  if (element) {
    const fixedGlobalPoint = getGlobalFixedPointForBindableElement(
      fixedPointRatio || [0, 0],
      element,
    );

    // NOTE: Resize scales the binding position point too, so we need to update it
    return Math.abs(
      distanceToBindableElement(element, fixedGlobalPoint) -
        FIXED_BINDING_DISTANCE,
    ) > 0.01
      ? bindPointToSnapToElementOutline(arrow, element, startOrEnd)
      : fixedGlobalPoint;
  }

  return initialPoint;
};

export const distanceToBindableElement = (
  element,
  p,
) => {
  switch (element.type) {
    case 'rectangle':
    case 'image':
    case 'text':
    case 'iframe':
    case 'embeddable':
    case 'frame':
    case 'magicframe':
      return distanceToRectanguloidElement(element, p);
    case 'diamond':
      return distanceToDiamondElement(element, p);
    case 'ellipse':
      return distanceToEllipseElement(element, p);
  }
};

/**
 * Returns the distance of a point and the provided rectangular-shaped element,
 * accounting for roundness and rotation
 *
 * @param element The rectanguloid element
 * @param p The point to consider
 * @returns The eucledian distance to the outline of the rectanguloid element
 */
const distanceToRectanguloidElement = (
  element,
  p,
) => {
  const center = pointFrom(
    element.x + element.width / 2,
    element.y + element.height / 2,
  );
  // To emulate a rotated rectangle we rotate the point in the inverse angle
  // instead. It's all the same distance-wise.
  const rotatedPoint = pointRotateRads(p, center, -element.angle);

  // Get the element's building components we can test against
  const [sides, corners] = deconstructRectanguloidElement(element);

  return Math.min(
    ...sides.map((s) => distanceToLineSegment(rotatedPoint, s)),
    ...corners
      .map((a) => curvePointDistance(a, rotatedPoint))
      .filter((d) => d !== null),
  );
};

/**
 * Rotate a point by [angle] radians.
 *
 * @param point The point to rotate
 * @param center The point to rotate around, the center point
 * @param angle The radians to rotate the point by
 * @returns The rotated point
 */
export function pointRotateRads(
  [x, y],
  [cx, cy],
  angle,
) {
  return pointFrom(
    (x - cx) * Math.cos(angle) - (y - cy) * Math.sin(angle) + cx,
    (x - cx) * Math.sin(angle) + (y - cy) * Math.cos(angle) + cy,
  );
}

/**
 * Get the building components of a rectanguloid element in the form of
 * line segments and curves.
 *
 * @param element Target rectanguloid element
 * @param offset Optional offset to expand the rectanguloid shape
 * @returns Tuple of line segments (0) and curves (1)
 */
export function deconstructRectanguloidElement(
  element,
  offset = 0,
) {
  const roundness = getCornerRadius(
    Math.min(element.width, element.height),
    element,
  );

  if (roundness <= 0) {
    const r = rectangle(
      pointFrom(element.x - offset, element.y - offset),
      pointFrom(
        element.x + element.width + offset,
        element.y + element.height + offset,
      ),
    );

    const top = lineSegment(
      pointFrom(r[0][0] + roundness, r[0][1]),
      pointFrom(r[1][0] - roundness, r[0][1]),
    );
    const right = lineSegment(
      pointFrom(r[1][0], r[0][1] + roundness),
      pointFrom(r[1][0], r[1][1] - roundness),
    );
    const bottom = lineSegment(
      pointFrom(r[0][0] + roundness, r[1][1]),
      pointFrom(r[1][0] - roundness, r[1][1]),
    );
    const left = lineSegment(
      pointFrom(r[0][0], r[1][1] - roundness),
      pointFrom(r[0][0], r[0][1] + roundness),
    );
    const sides = [top, right, bottom, left];

    return [sides, []];
  }

  const center = pointFrom(
    element.x + element.width / 2,
    element.y + element.height / 2,
  );

  const r = rectangle(
    pointFrom(element.x, element.y),
    pointFrom(element.x + element.width, element.y + element.height),
  );

  const top = lineSegment(
    pointFrom(r[0][0] + roundness, r[0][1]),
    pointFrom(r[1][0] - roundness, r[0][1]),
  );
  const right = lineSegment(
    pointFrom(r[1][0], r[0][1] + roundness),
    pointFrom(r[1][0], r[1][1] - roundness),
  );
  const bottom = lineSegment(
    pointFrom(r[0][0] + roundness, r[1][1]),
    pointFrom(r[1][0] - roundness, r[1][1]),
  );
  const left = lineSegment(
    pointFrom(r[0][0], r[1][1] - roundness),
    pointFrom(r[0][0], r[0][1] + roundness),
  );

  const offsets = [
    vectorScale(
      vectorNormalize(
        vectorFromPoint(pointFrom(r[0][0] - offset, r[0][1] - offset), center),
      ),
      offset,
    ), // TOP LEFT
    vectorScale(
      vectorNormalize(
        vectorFromPoint(pointFrom(r[1][0] + offset, r[0][1] - offset), center),
      ),
      offset,
    ), // TOP RIGHT
    vectorScale(
      vectorNormalize(
        vectorFromPoint(pointFrom(r[1][0] + offset, r[1][1] + offset), center),
      ),
      offset,
    ), // BOTTOM RIGHT
    vectorScale(
      vectorNormalize(
        vectorFromPoint(pointFrom(r[0][0] - offset, r[1][1] + offset), center),
      ),
      offset,
    ), // BOTTOM LEFT
  ];

  const corners = [
    curve(
      pointFromVector(offsets[0], left[1]),
      pointFromVector(
        offsets[0],
        pointFrom(
          left[1][0] + (2 / 3) * (r[0][0] - left[1][0]),
          left[1][1] + (2 / 3) * (r[0][1] - left[1][1]),
        ),
      ),
      pointFromVector(
        offsets[0],
        pointFrom(
          top[0][0] + (2 / 3) * (r[0][0] - top[0][0]),
          top[0][1] + (2 / 3) * (r[0][1] - top[0][1]),
        ),
      ),
      pointFromVector(offsets[0], top[0]),
    ), // TOP LEFT
    curve(
      pointFromVector(offsets[1], top[1]),
      pointFromVector(
        offsets[1],
        pointFrom(
          top[1][0] + (2 / 3) * (r[1][0] - top[1][0]),
          top[1][1] + (2 / 3) * (r[0][1] - top[1][1]),
        ),
      ),
      pointFromVector(
        offsets[1],
        pointFrom(
          right[0][0] + (2 / 3) * (r[1][0] - right[0][0]),
          right[0][1] + (2 / 3) * (r[0][1] - right[0][1]),
        ),
      ),
      pointFromVector(offsets[1], right[0]),
    ), // TOP RIGHT
    curve(
      pointFromVector(offsets[2], right[1]),
      pointFromVector(
        offsets[2],
        pointFrom(
          right[1][0] + (2 / 3) * (r[1][0] - right[1][0]),
          right[1][1] + (2 / 3) * (r[1][1] - right[1][1]),
        ),
      ),
      pointFromVector(
        offsets[2],
        pointFrom(
          bottom[1][0] + (2 / 3) * (r[1][0] - bottom[1][0]),
          bottom[1][1] + (2 / 3) * (r[1][1] - bottom[1][1]),
        ),
      ),
      pointFromVector(offsets[2], bottom[1]),
    ), // BOTTOM RIGHT
    curve(
      pointFromVector(offsets[3], bottom[0]),
      pointFromVector(
        offsets[3],
        pointFrom(
          bottom[0][0] + (2 / 3) * (r[0][0] - bottom[0][0]),
          bottom[0][1] + (2 / 3) * (r[1][1] - bottom[0][1]),
        ),
      ),
      pointFromVector(
        offsets[3],
        pointFrom(
          left[0][0] + (2 / 3) * (r[0][0] - left[0][0]),
          left[0][1] + (2 / 3) * (r[1][1] - left[0][1]),
        ),
      ),
      pointFromVector(offsets[3], left[0]),
    ), // BOTTOM LEFT
  ];

  const sides = [
    lineSegment(corners[0][3], corners[1][0]),
    lineSegment(corners[1][3], corners[2][0]),
    lineSegment(corners[2][3], corners[3][0]),
    lineSegment(corners[3][3], corners[0][0]),
  ];

  return [sides, corners];
}

export const ROUNDNESS = {
  // Used for legacy rounding (rectangles), which currently works the same
  // as PROPORTIONAL_RADIUS, but we need to differentiate for UI purposes and
  // forwards-compat.
  LEGACY: 1,

  // Used for linear elements & diamonds
  PROPORTIONAL_RADIUS: 2,

  // Current default algorithm for rectangles, using fixed pixel radius.
  // It's working similarly to a regular border-radius, but attemps to make
  // radius visually similar across differnt element sizes, especially
  // very large and very small elements.
  //
  // NOTE right now we don't allow configuration and use a constant radius
  // (see DEFAULT_ADAPTIVE_RADIUS constant)
  ADAPTIVE_RADIUS: 3,
};

// Radius represented as 25% of element's largest side (width/height).
// Used for LEGACY and PROPORTIONAL_RADIUS algorithms, or when the element is
// below the cutoff size.
export const DEFAULT_PROPORTIONAL_RADIUS = 0.25;

// Fixed radius for the ADAPTIVE_RADIUS algorithm. In pixels.
export const DEFAULT_ADAPTIVE_RADIUS = 32;

export const getCornerRadius = (x, element) => {
  if (
    element.roundness?.type === ROUNDNESS.PROPORTIONAL_RADIUS ||
    element.roundness?.type === ROUNDNESS.LEGACY
  ) {
    return x * DEFAULT_PROPORTIONAL_RADIUS;
  }

  if (element.roundness?.type === ROUNDNESS.ADAPTIVE_RADIUS) {
    const fixedRadiusSize = element.roundness?.value ?? DEFAULT_ADAPTIVE_RADIUS;

    const CUTOFF_SIZE = fixedRadiusSize / DEFAULT_PROPORTIONAL_RADIUS;

    if (x <= CUTOFF_SIZE) {
      return x * DEFAULT_PROPORTIONAL_RADIUS;
    }

    return fixedRadiusSize;
  }

  return 0;
};

export function rectangle(
  topLeft,
  bottomRight,
) {
  return [topLeft, bottomRight];
}

/**
 * Create a line segment from two points.
 *
 * @param points The two points delimiting the line segment on each end
 * @returns The line segment delineated by the points
 */
export function lineSegment(
  a,
  b,
) {
  return [a, b];
}

export function curve(a, b, c, d,) {
  return [a, b, c, d];
}

/**
 * Convert a vector to a point.
 *
 * @param v The vector to convert
 * @returns The point the vector points at with origin 0,0
 */
export function pointFromVector(
  v,
  offset = pointFrom(0, 0),
) {
  return pointFrom(offset[0] + v[0], offset[1] + v[1]);
}

export const distanceToLineSegment = (
  point,
  line,
) => {
  const [x, y] = point;
  const [[x1, y1], [x2, y2]] = line;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) {
    param = dot / len_sq;
  }

  let xx;
  let yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Determines the distance between a point and the closest point on the
 * Bezier curve.
 *
 * @param c The curve to test
 * @param p The point to measure from
 */
export function curvePointDistance(
  c,
  p,
) {
  const closest = curveClosestPoint(c, p);

  if (!closest) {
    return 0;
  }

  return pointDistance(p, closest);
}

/**
 * Finds the closest point on the Bezier curve from another point
 *
 * @param x
 * @param y
 * @param P0
 * @param P1
 * @param P2
 * @param P3
 * @param tolerance
 * @param maxLevel
 * @returns
 */
export function curveClosestPoint(
  c,
  p,
  tolerance = 1e-3,
) {
  const localMinimum = (
    min,
    max,
    f,
    e = tolerance,
  ) => {
    let m = min;
    let n = max;
    let k;

    while (n - m > e) {
      k = (n + m) / 2;
      if (f(k - e) < f(k + e)) {
        n = k;
      } else {
        m = k;
      }
    }

    return k;
  };

  const maxSteps = 30;
  let closestStep = 0;
  for (let min = Infinity, step = 0; step < maxSteps; step++) {
    const d = pointDistance(p, bezierEquation(c, step / maxSteps));
    if (d < min) {
      min = d;
      closestStep = step;
    }
  }

  const t0 = Math.max((closestStep - 1) / maxSteps, 0);
  const t1 = Math.min((closestStep + 1) / maxSteps, 1);
  const solution = localMinimum(t0, t1, (t) =>
    pointDistance(p, bezierEquation(c, t)),
  );

  if (!solution) {
    return null;
  }

  return bezierEquation(c, solution);
}

/**
 * Calculate the distance between two points.
 *
 * @param a First point
 * @param b Second point
 * @returns The euclidean distance between the two points.
 */
export function pointDistance(
  a,
  b,
) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

const bezierEquation = (
  c,
  t,
) => {
  pointFrom(
    (1 - t) ** 3 * c[0][0] +
      3 * (1 - t) ** 2 * t * c[1][0] +
      3 * (1 - t) * t ** 2 * c[2][0] +
      t ** 3 * c[3][0],
    (1 - t) ** 3 * c[0][1] +
      3 * (1 - t) ** 2 * t * c[1][1] +
      3 * (1 - t) * t ** 2 * c[2][1] +
      t ** 3 * c[3][1],
  );
};

/**
 * Returns the distance of a point and the provided diamond element, accounting
 * for roundness and rotation
 *
 * @param element The diamond element
 * @param p The point to consider
 * @returns The eucledian distance to the outline of the diamond
 */
const distanceToDiamondElement = (
  element,
  p,
) => {
  const center = pointFrom(
    element.x + element.width / 2,
    element.y + element.height / 2,
  );

  // Rotate the point to the inverse direction to simulate the rotated diamond
  // points. It's all the same distance-wise.
  const rotatedPoint = pointRotateRads(p, center, -element.angle);

  const [sides, curves] = deconstructDiamondElement(element);

  return Math.min(
    ...sides.map((s) => distanceToLineSegment(rotatedPoint, s)),
    ...curves
      .map((a) => curvePointDistance(a, rotatedPoint))
      .filter((d) => d !== null),
  );
};

/**
 * Get the building components of a diamond element in the form of
 * line segments and curves as a tuple, in this order.
 *
 * @param element The element to deconstruct
 * @param offset An optional offset
 * @returns Tuple of line segments (0) and curves (1)
 */
export function deconstructDiamondElement(
  element,
  offset = 0,
) {
  const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] =
    getDiamondPoints(element);
  const verticalRadius = getCornerRadius(Math.abs(topX - leftX), element);
  const horizontalRadius = getCornerRadius(Math.abs(rightY - topY), element);

  if (element.roundness?.type == null) {
    const [top, right, bottom, left] = [
      pointFrom(element.x + topX, element.y + topY - offset),
      pointFrom(element.x + rightX + offset, element.y + rightY),
      pointFrom(element.x + bottomX, element.y + bottomY + offset),
      pointFrom(element.x + leftX - offset, element.y + leftY),
    ];

    // Create the line segment parts of the diamond
    // NOTE: Horizontal and vertical seems to be flipped here
    const topRight = lineSegment(
      pointFrom(top[0] + verticalRadius, top[1] + horizontalRadius),
      pointFrom(right[0] - verticalRadius, right[1] - horizontalRadius),
    );
    const bottomRight = lineSegment(
      pointFrom(right[0] - verticalRadius, right[1] + horizontalRadius),
      pointFrom(bottom[0] + verticalRadius, bottom[1] - horizontalRadius),
    );
    const bottomLeft = lineSegment(
      pointFrom(bottom[0] - verticalRadius, bottom[1] - horizontalRadius),
      pointFrom(left[0] + verticalRadius, left[1] + horizontalRadius),
    );
    const topLeft = lineSegment(
      pointFrom(left[0] + verticalRadius, left[1] - horizontalRadius),
      pointFrom(top[0] - verticalRadius, top[1] + horizontalRadius),
    );

    return [[topRight, bottomRight, bottomLeft, topLeft], []];
  }

  const center = pointFrom(
    element.x + element.width / 2,
    element.y + element.height / 2,
  );

  const [top, right, bottom, left] = [
    pointFrom(element.x + topX, element.y + topY),
    pointFrom(element.x + rightX, element.y + rightY),
    pointFrom(element.x + bottomX, element.y + bottomY),
    pointFrom(element.x + leftX, element.y + leftY),
  ];

  const offsets = [
    vectorScale(vectorNormalize(vectorFromPoint(right, center)), offset), // RIGHT
    vectorScale(vectorNormalize(vectorFromPoint(bottom, center)), offset), // BOTTOM
    vectorScale(vectorNormalize(vectorFromPoint(left, center)), offset), // LEFT
    vectorScale(vectorNormalize(vectorFromPoint(top, center)), offset), // TOP
  ];

  const corners = [
    curve(
      pointFromVector(
        offsets[0],
        pointFrom(
          right[0] - verticalRadius,
          right[1] - horizontalRadius,
        ),
      ),
      pointFromVector(offsets[0], right),
      pointFromVector(offsets[0], right),
      pointFromVector(
        offsets[0],
        pointFrom(
          right[0] - verticalRadius,
          right[1] + horizontalRadius,
        ),
      ),
    ), // RIGHT
    curve(
      pointFromVector(
        offsets[1],
        pointFrom(
          bottom[0] + verticalRadius,
          bottom[1] - horizontalRadius,
        ),
      ),
      pointFromVector(offsets[1], bottom),
      pointFromVector(offsets[1], bottom),
      pointFromVector(
        offsets[1],
        pointFrom(
          bottom[0] - verticalRadius,
          bottom[1] - horizontalRadius,
        ),
      ),
    ), // BOTTOM
    curve(
      pointFromVector(
        offsets[2],
        pointFrom(
          left[0] + verticalRadius,
          left[1] + horizontalRadius,
        ),
      ),
      pointFromVector(offsets[2], left),
      pointFromVector(offsets[2], left),
      pointFromVector(
        offsets[2],
        pointFrom(
          left[0] + verticalRadius,
          left[1] - horizontalRadius,
        ),
      ),
    ), // LEFT
    curve(
      pointFromVector(
        offsets[3],
        pointFrom(
          top[0] - verticalRadius,
          top[1] + horizontalRadius,
        ),
      ),
      pointFromVector(offsets[3], top),
      pointFromVector(offsets[3], top),
      pointFromVector(
        offsets[3],
        pointFrom(
          top[0] + verticalRadius,
          top[1] + horizontalRadius,
        ),
      ),
    ), // TOP
  ];

  const sides = [
    lineSegment(corners[0][3], corners[1][0]),
    lineSegment(corners[1][3], corners[2][0]),
    lineSegment(corners[2][3], corners[3][0]),
    lineSegment(corners[3][3], corners[0][0]),
  ];

  return [sides, corners];
}

export const getDiamondPoints = (element) => {
  // Here we add +1 to avoid these numbers to be 0
  // otherwise rough.js will throw an error complaining about it
  const topX = Math.floor(element.width / 2) + 1;
  const topY = 0;
  const rightX = element.width;
  const rightY = Math.floor(element.height / 2) + 1;
  const bottomX = topX;
  const bottomY = element.height;
  const leftX = 0;
  const leftY = rightY;

  return [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY];
};

/**
 * Returns the distance of a point and the provided ellipse element, accounting
 * for roundness and rotation
 *
 * @param element The ellipse element
 * @param p The point to consider
 * @returns The eucledian distance to the outline of the ellipse
 */
const distanceToEllipseElement = (
  element,
  p,
) => {
  const center = pointFrom(
    element.x + element.width / 2,
    element.y + element.height / 2,
  );
  return ellipseDistanceFromPoint(
    // Instead of rotating the ellipse, rotate the point to the inverse angle
    pointRotateRads(p, center, -element.angle),
    ellipse(center, element.width / 2, element.height / 2),
  );
};

/**
 * Determine the shortest euclidean distance from a point to the
 * outline of the ellipse
 *
 * @param p The point to consider
 * @param ellipse The ellipse to calculate the distance to
 * @returns The eucledian distance
 */
export const ellipseDistanceFromPoint = (
  p,
  ellipse,
) => {
  const { halfWidth, halfHeight, center } = ellipse;
  const a = halfWidth;
  const b = halfHeight;
  const translatedPoint = vectorAdd(
    vectorFromPoint(p),
    vectorScale(vectorFromPoint(center), -1),
  );

  const px = Math.abs(translatedPoint[0]);
  const py = Math.abs(translatedPoint[1]);

  let tx = 0.707;
  let ty = 0.707;

  for (let i = 0; i < 3; i++) {
    const x = a * tx;
    const y = b * ty;

    const ex = ((a * a - b * b) * tx ** 3) / a;
    const ey = ((b * b - a * a) * ty ** 3) / b;

    const rx = x - ex;
    const ry = y - ey;

    const qx = px - ex;
    const qy = py - ey;

    const r = Math.hypot(ry, rx);
    const q = Math.hypot(qy, qx);

    tx = Math.min(1, Math.max(0, ((qx * r) / q + ex) / a));
    ty = Math.min(1, Math.max(0, ((qy * r) / q + ey) / b));
    const t = Math.hypot(ty, tx);
    tx /= t;
    ty /= t;
  }

  const [minX, minY] = [
    a * tx * Math.sign(translatedPoint[0]),
    b * ty * Math.sign(translatedPoint[1]),
  ];

  return pointDistance(pointFromVector(translatedPoint), pointFrom(minX, minY));
};

/**
 * Add two vectors by adding their coordinates.
 *
 * @param a One of the vectors to add
 * @param b The other vector to add
 * @returns The sum vector of the two provided vectors
 */
export function vectorAdd(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

/**
 * Construct an Ellipse object from the parameters
 *
 * @param center The center of the ellipse
 * @param angle The slanting of the ellipse in radians
 * @param halfWidth Half of the width of a non-slanted version of the ellipse
 * @param halfHeight Half of the height of a non-slanted version of the ellipse
 * @returns The constructed Ellipse object
 */
export function ellipse(
  center,
  halfWidth,
  halfHeight,
) {
  return {
    center,
    halfWidth,
    halfHeight,
  };
}

const getBindPointHeading = (
  p,
  otherPoint,
  elementsMap,
  hoveredElement,
  origPoint,
) => {
  getHeadingForElbowArrowSnap(
    p,
    otherPoint,
    hoveredElement,
    hoveredElement &&
      aabbForElement(
        hoveredElement,
        Array(4).fill(distanceToBindableElement(hoveredElement, p))
      ),
    elementsMap,
    origPoint,
  );
};

/**
 * Get the axis-aligned bounding box for a given element
 */
export const aabbForElement = (
  element,
  offset,
) => {
  const bbox = {
    minX: element.x,
    minY: element.y,
    maxX: element.x + element.width,
    maxY: element.y + element.height,
    midX: element.x + element.width / 2,
    midY: element.y + element.height / 2,
  };

  const center = pointFrom(bbox.midX, bbox.midY);
  const [topLeftX, topLeftY] = pointRotateRads(
    pointFrom(bbox.minX, bbox.minY),
    center,
    element.angle,
  );
  const [topRightX, topRightY] = pointRotateRads(
    pointFrom(bbox.maxX, bbox.minY),
    center,
    element.angle,
  );
  const [bottomRightX, bottomRightY] = pointRotateRads(
    pointFrom(bbox.maxX, bbox.maxY),
    center,
    element.angle,
  );
  const [bottomLeftX, bottomLeftY] = pointRotateRads(
    pointFrom(bbox.minX, bbox.maxY),
    center,
    element.angle,
  );

  const bounds = [
    Math.min(topLeftX, topRightX, bottomRightX, bottomLeftX),
    Math.min(topLeftY, topRightY, bottomRightY, bottomLeftY),
    Math.max(topLeftX, topRightX, bottomRightX, bottomLeftX),
    Math.max(topLeftY, topRightY, bottomRightY, bottomLeftY),
  ];

  if (offset) {
    const [topOffset, rightOffset, downOffset, leftOffset] = offset;
    return [
      bounds[0] - leftOffset,
      bounds[1] - topOffset,
      bounds[2] + rightOffset,
      bounds[3] + downOffset,
    ];
  }

  return bounds;
};

export const HEADING_RIGHT = [1, 0];
export const HEADING_DOWN = [0, 1];
export const HEADING_LEFT = [-1, 0];
export const HEADING_UP = [0, -1];

const offsetFromHeading = (
  heading,
  head,
  side,
) => {
  switch (heading) {
    case HEADING_UP:
      return [head, side, side, side];
    case HEADING_RIGHT:
      return [side, head, side, side];
    case HEADING_DOWN:
      return [side, side, head, side];
  }

  return [side, side, side, head];
};

export const pointInsideBounds = (
  p,
  bounds,
) => {
  p[0] > bounds[0] && p[0] < bounds[2] && p[1] > bounds[1] && p[1] < bounds[3];
};

const commonAABB = (aabbs) => [
  Math.min(...aabbs.map((aabb) => aabb[0])),
  Math.min(...aabbs.map((aabb) => aabb[1])),
  Math.max(...aabbs.map((aabb) => aabb[2])),
  Math.max(...aabbs.map((aabb) => aabb[3])),
];

/**
 * Create dynamically resizing, always touching
 * bounding boxes having a minimum extent represented
 * by the given static bounds.
 */
const generateDynamicAABBs = (
  a,
  b,
  common,
  startDifference,
  endDifference,
  disableSideHack,
  startElementBounds,
  endElementBounds,
) => {
  const startEl = startElementBounds ?? a;
  const endEl = endElementBounds ?? b;
  const [startUp, startRight, startDown, startLeft] = startDifference ?? [
    0, 0, 0, 0,
  ];
  const [endUp, endRight, endDown, endLeft] = endDifference ?? [0, 0, 0, 0];

  const first = [
    a[0] > b[2]
      ? a[1] > b[3] || a[3] < b[1]
        ? Math.min((startEl[0] + endEl[2]) / 2, a[0] - startLeft)
        : (startEl[0] + endEl[2]) / 2
      : a[0] > b[0]
        ? a[0] - startLeft
        : common[0] - startLeft,
    a[1] > b[3]
      ? a[0] > b[2] || a[2] < b[0]
        ? Math.min((startEl[1] + endEl[3]) / 2, a[1] - startUp)
        : (startEl[1] + endEl[3]) / 2
      : a[1] > b[1]
        ? a[1] - startUp
        : common[1] - startUp,
    a[2] < b[0]
      ? a[1] > b[3] || a[3] < b[1]
        ? Math.max((startEl[2] + endEl[0]) / 2, a[2] + startRight)
        : (startEl[2] + endEl[0]) / 2
      : a[2] < b[2]
        ? a[2] + startRight
        : common[2] + startRight,
    a[3] < b[1]
      ? a[0] > b[2] || a[2] < b[0]
        ? Math.max((startEl[3] + endEl[1]) / 2, a[3] + startDown)
        : (startEl[3] + endEl[1]) / 2
      : a[3] < b[3]
        ? a[3] + startDown
        : common[3] + startDown,
  ];
  const second = [
    b[0] > a[2]
      ? b[1] > a[3] || b[3] < a[1]
        ? Math.min((endEl[0] + startEl[2]) / 2, b[0] - endLeft)
        : (endEl[0] + startEl[2]) / 2
      : b[0] > a[0]
        ? b[0] - endLeft
        : common[0] - endLeft,
    b[1] > a[3]
      ? b[0] > a[2] || b[2] < a[0]
        ? Math.min((endEl[1] + startEl[3]) / 2, b[1] - endUp)
        : (endEl[1] + startEl[3]) / 2
      : b[1] > a[1]
        ? b[1] - endUp
        : common[1] - endUp,
    b[2] < a[0]
      ? b[1] > a[3] || b[3] < a[1]
        ? Math.max((endEl[2] + startEl[0]) / 2, b[2] + endRight)
        : (endEl[2] + startEl[0]) / 2
      : b[2] < a[2]
        ? b[2] + endRight
        : common[2] + endRight,
    b[3] < a[1]
      ? b[0] > a[2] || b[2] < a[0]
        ? Math.max((endEl[3] + startEl[1]) / 2, b[3] + endDown)
        : (endEl[3] + startEl[1]) / 2
      : b[3] < a[3]
        ? b[3] + endDown
        : common[3] + endDown,
  ];

  const c = commonAABB([first, second]);
  if (
    !disableSideHack &&
    first[2] - first[0] + second[2] - second[0] > c[2] - c[0] + 0.00000000001 &&
    first[3] - first[1] + second[3] - second[1] > c[3] - c[1] + 0.00000000001
  ) {
    const [endCenterX, endCenterY] = [
      (second[0] + second[2]) / 2,
      (second[1] + second[3]) / 2,
    ];
    if (b[0] > a[2] && a[1] > b[3]) {
      // BOTTOM LEFT
      const cX = first[2] + (second[0] - first[2]) / 2;
      const cY = second[3] + (first[1] - second[3]) / 2;

      if (
        vectorCross(
          vector(a[2] - endCenterX, a[1] - endCenterY),
          vector(a[0] - endCenterX, a[3] - endCenterY),
        ) > 0
      ) {
        return [
          [first[0], first[1], cX, first[3]],
          [cX, second[1], second[2], second[3]],
        ];
      }

      return [
        [first[0], cY, first[2], first[3]],
        [second[0], second[1], second[2], cY],
      ];
    } else if (a[2] < b[0] && a[3] < b[1]) {
      // TOP LEFT
      const cX = first[2] + (second[0] - first[2]) / 2;
      const cY = first[3] + (second[1] - first[3]) / 2;

      if (
        vectorCross(
          vector(a[0] - endCenterX, a[1] - endCenterY),
          vector(a[2] - endCenterX, a[3] - endCenterY),
        ) > 0
      ) {
        return [
          [first[0], first[1], first[2], cY],
          [second[0], cY, second[2], second[3]],
        ];
      }

      return [
        [first[0], first[1], cX, first[3]],
        [cX, second[1], second[2], second[3]],
      ];
    } else if (a[0] > b[2] && a[3] < b[1]) {
      // TOP RIGHT
      const cX = second[2] + (first[0] - second[2]) / 2;
      const cY = first[3] + (second[1] - first[3]) / 2;

      if (
        vectorCross(
          vector(a[2] - endCenterX, a[1] - endCenterY),
          vector(a[0] - endCenterX, a[3] - endCenterY),
        ) > 0
      ) {
        return [
          [cX, first[1], first[2], first[3]],
          [second[0], second[1], cX, second[3]],
        ];
      }

      return [
        [first[0], first[1], first[2], cY],
        [second[0], cY, second[2], second[3]],
      ];
    } else if (a[0] > b[2] && a[1] > b[3]) {
      // BOTTOM RIGHT
      const cX = second[2] + (first[0] - second[2]) / 2;
      const cY = second[3] + (first[1] - second[3]) / 2;

      if (
        vectorCross(
          vector(a[0] - endCenterX, a[1] - endCenterY),
          vector(a[2] - endCenterX, a[3] - endCenterY),
        ) > 0
      ) {
        return [
          [cX, first[1], first[2], first[3]],
          [second[0], second[1], cX, second[3]],
        ];
      }

      return [
        [first[0], cY, first[2], first[3]],
        [second[0], second[1], second[2], cY],
      ];
    }
  }

  return [first, second];
};

const getDonglePosition = (
  bounds,
  heading,
  p,
) => {
  switch (heading) {
    case HEADING_UP:
      return pointFrom(p[0], bounds[1]);
    case HEADING_RIGHT:
      return pointFrom(bounds[2], p[1]);
    case HEADING_DOWN:
      return pointFrom(p[0], bounds[3]);
  }
  return pointFrom(bounds[0], p[1]);
};

const DEDUP_TRESHOLD = 1;

const handleSegmentRenormalization = (
  arrow,
  elementsMap,
) => {
  const nextFixedSegments = arrow.fixedSegments
    ? arrow.fixedSegments.slice()
    : null;

  if (nextFixedSegments) {
    const _nextPoints = [];

    arrow.points
      .map((p) => pointFrom(arrow.x + p[0], arrow.y + p[1]))
      .forEach((p, i, points) => {
        if (i < 2) {
          return _nextPoints.push(p);
        }

        const currentSegmentIsHorizontal = headingForPoint(p, points[i - 1]);
        const prevSegmentIsHorizontal = headingForPoint(
          points[i - 1],
          points[i - 2],
        );

        if (
          // Check if previous two points are on the same line
          compareHeading(currentSegmentIsHorizontal, prevSegmentIsHorizontal)
        ) {
          const prevSegmentIdx =
            nextFixedSegments?.findIndex(
              (segment) => segment.index === i - 1,
            ) ?? -1;
          const segmentIdx =
            nextFixedSegments?.findIndex((segment) => segment.index === i) ??
            -1;

          // If the current segment is a fixed segment, update its start point
          if (segmentIdx !== -1) {
            nextFixedSegments[segmentIdx].start = pointFrom(
              points[i - 2][0] - arrow.x,
              points[i - 2][1] - arrow.y,
            );
          }

          // Remove the fixed segment status from the previous segment if it is
          // a fixed segment, because we are going to unify that segment with
          // the current one
          if (prevSegmentIdx !== -1) {
            nextFixedSegments.splice(prevSegmentIdx, 1);
          }

          // Remove the duplicate point
          _nextPoints.splice(-1, 1);

          // Update fixed point indices
          nextFixedSegments.forEach((segment) => {
            if (segment.index > i - 1) {
              segment.index -= 1;
            }
          });
        }

        return _nextPoints.push(p);
      });

    const nextPoints = [];

    _nextPoints.forEach((p, i, points) => {
      if (i < 3) {
        return nextPoints.push(p);
      }

      if (
        // Remove segments that are too short
        pointDistance(points[i - 2], points[i - 1]) < DEDUP_TRESHOLD
      ) {
        const prevPrevSegmentIdx =
          nextFixedSegments?.findIndex((segment) => segment.index === i - 2) ??
          -1;
        const prevSegmentIdx =
          nextFixedSegments?.findIndex((segment) => segment.index === i - 1) ??
          -1;

        // Remove the previous fixed segment if it exists (i.e. the segment
        // which will be removed due to being parallel or too short)
        if (prevSegmentIdx !== -1) {
          nextFixedSegments.splice(prevSegmentIdx, 1);
        }

        // Remove the fixed segment status from the segment 2 steps back
        // if it is a fixed segment, because we are going to unify that
        // segment with the current one
        if (prevPrevSegmentIdx !== -1) {
          nextFixedSegments.splice(prevPrevSegmentIdx, 1);
        }

        nextPoints.splice(-2, 2);

        // Since we have to remove two segments, update any fixed segment
        nextFixedSegments.forEach((segment) => {
          if (segment.index > i - 2) {
            segment.index -= 2;
          }
        });

        // Remove aligned segment points
        const isHorizontal = headingForPointIsHorizontal(p, points[i - 1]);

        return nextPoints.push(
          pointFrom(
            !isHorizontal ? points[i - 2][0] : p[0],
            isHorizontal ? points[i - 2][1] : p[1],
          ),
        );
      }

      nextPoints.push(p);
    });

    const filteredNextFixedSegments = nextFixedSegments.filter(
      (segment) =>
        segment.index !== 1 && segment.index !== nextPoints.length - 1,
    );
    if (filteredNextFixedSegments.length === 0) {
      return normalizeArrowElementUpdate(
        getElbowArrowCornerPoints(
          removeElbowArrowShortSegments(
            routeElbowArrow(
              arrow,
              getElbowArrowData(
                arrow,
                elementsMap,
                nextPoints.map((p) =>
                  pointFrom(p[0] - arrow.x, p[1] - arrow.y),
                ),
              ),
            ) ?? [],
          ),
        ),
        filteredNextFixedSegments,
        null,
        null,
      );
    }

    process.env.NODE_ENV === 'development' &&
      invariant(
        validateElbowPoints(nextPoints),
        'Invalid elbow points with fixed segments',
      );

    return normalizeArrowElementUpdate(
      nextPoints,
      filteredNextFixedSegments,
      arrow.startIsSpecial,
      arrow.endIsSpecial,
    );
  }

  return {
    x: arrow.x,
    y: arrow.y,
    points: arrow.points,
    fixedSegments: arrow.fixedSegments,
    startIsSpecial: arrow.startIsSpecial,
    endIsSpecial: arrow.endIsSpecial,
  };
};

export const headingForPoint = (
  p,
  o,
) => vectorToHeading(vectorFromPoint(p, o));

export const vectorToHeading = (vec) => {
  const [x, y] = vec;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  if (x > absY) {
    return HEADING_RIGHT;
  } else if (x <= -absY) {
    return HEADING_LEFT;
  } else if (y > absX) {
    return HEADING_DOWN;
  }
  return HEADING_UP;
};

export const compareHeading = (a, b) =>
  a[0] === b[0] && a[1] === b[1];

export const headingForPointIsHorizontal = (
  p,
  o,
) => headingIsHorizontal(headingForPoint(p, o));

export const headingIsHorizontal = (a) =>
  compareHeading(a, HEADING_RIGHT) || compareHeading(a, HEADING_LEFT);

const getElbowArrowCornerPoints = (points) => {
  if (points.length > 1) {
    let previousHorizontal =
      Math.abs(points[0][1] - points[1][1]) <
      Math.abs(points[0][0] - points[1][0]);

    return points.filter((p, idx) => {
      // The very first and last points are always kept
      if (idx === 0 || idx === points.length - 1) {
        return true;
      }

      const next = points[idx + 1];
      const nextHorizontal =
        Math.abs(p[1] - next[1]) < Math.abs(p[0] - next[0]);
      if (previousHorizontal === nextHorizontal) {
        previousHorizontal = nextHorizontal;
        return false;
      }

      previousHorizontal = nextHorizontal;
      return true;
    });
  }

  return points;
};

const removeElbowArrowShortSegments = (
  points,
) => {
  if (points.length >= 4) {
    return points.filter((p, idx) => {
      if (idx === 0 || idx === points.length - 1) {
        return true;
      }

      const prev = points[idx - 1];
      const prevDist = pointDistance(prev, p);
      return prevDist > DEDUP_TRESHOLD;
    });
  }

  return points;
};

/**
 * Generate the elbow arrow segments
 *
 * @param arrow
 * @param elementsMap
 * @param nextPoints
 * @param options
 * @returns
 */
const routeElbowArrow = (
  arrow,
  elbowArrowData,
) => {
  const {
    dynamicAABBs,
    startDonglePosition,
    startGlobalPoint,
    startHeading,
    endDonglePosition,
    endGlobalPoint,
    endHeading,
    commonBounds,
    hoveredEndElement,
  } = elbowArrowData;

  // Canculate Grid positions
  const grid = calculateGrid(
    dynamicAABBs,
    startDonglePosition ? startDonglePosition : startGlobalPoint,
    startHeading,
    endDonglePosition ? endDonglePosition : endGlobalPoint,
    endHeading,
    commonBounds,
  );

  const startDongle =
    startDonglePosition && pointToGridNode(startDonglePosition, grid);
  const endDongle =
    endDonglePosition && pointToGridNode(endDonglePosition, grid);

  // Do not allow stepping on the true end or true start points
  const endNode = pointToGridNode(endGlobalPoint, grid);
  if (endNode && hoveredEndElement) {
    endNode.closed = true;
  }
  const startNode = pointToGridNode(startGlobalPoint, grid);
  if (startNode && arrow.startBinding) {
    startNode.closed = true;
  }
  const dongleOverlap =
    startDongle &&
    endDongle &&
    (pointInsideBounds(startDongle.pos, dynamicAABBs[1]) ||
      pointInsideBounds(endDongle.pos, dynamicAABBs[0]));

  // Create path to end dongle from start dongle
  const path = astar(
    startDongle ? startDongle : startNode,
    endDongle ? endDongle : endNode,
    grid,
    startHeading ? startHeading : HEADING_RIGHT,
    endHeading ? endHeading : HEADING_RIGHT,
    dongleOverlap ? [] : dynamicAABBs,
  );

  if (path) {
    const points = path.map((node) => [
      node.pos[0],
      node.pos[1],
    ]);
    startDongle && points.unshift(startGlobalPoint);
    endDongle && points.push(endGlobalPoint);

    return points;
  }

  return null;
};

/**
 * Calculates the grid which is used as nodes at
 * the grid line intersections by the A* algorithm.
 *
 * NOTE: This is not a uniform grid. It is built at
 * various intersections of bounding boxes.
 */
const calculateGrid = (
  aabbs,
  start,
  startHeading,
  end,
  endHeading,
  common,
) => {
  const horizontal = new Set();
  const vertical = new Set();

  if (startHeading === HEADING_LEFT || startHeading === HEADING_RIGHT) {
    vertical.add(start[1]);
  } else {
    horizontal.add(start[0]);
  }
  if (endHeading === HEADING_LEFT || endHeading === HEADING_RIGHT) {
    vertical.add(end[1]);
  } else {
    horizontal.add(end[0]);
  }

  aabbs.forEach((aabb) => {
    horizontal.add(aabb[0]);
    horizontal.add(aabb[2]);
    vertical.add(aabb[1]);
    vertical.add(aabb[3]);
  });

  horizontal.add(common[0]);
  horizontal.add(common[2]);
  vertical.add(common[1]);
  vertical.add(common[3]);

  const _vertical = Array.from(vertical).sort((a, b) => a - b);
  const _horizontal = Array.from(horizontal).sort((a, b) => a - b);

  return {
    row: _vertical.length,
    col: _horizontal.length,
    data: _vertical.flatMap((y, row) =>
      _horizontal.map(
        (x, col) => ({
          f: 0,
          g: 0,
          h: 0,
          closed: false,
          visited: false,
          parent: null,
          addr: [col, row],
          pos: [x, y],
        }),
      ),
    ),
  };
};

/**
 * Get node for global point on canvas (if exists)
 */
const pointToGridNode = (point, grid) => {
  for (let col = 0; col < grid.col; col++) {
    for (let row = 0; row < grid.row; row++) {
      const candidate = gridNodeFromAddr([col, row], grid);
      if (
        candidate &&
        point[0] === candidate.pos[0] &&
        point[1] === candidate.pos[1]
      ) {
        return candidate;
      }
    }
  }

  return null;
};

const gridNodeFromAddr = (
  [col, row],
  grid,
) => {
  if (col < 0 || col >= grid.col || row < 0 || row >= grid.row) {
    return null;
  }

  return grid.data[row * grid.col + col] ?? null;
};

/**
 * Routing algorithm based on the A* path search algorithm.
 * @see https://www.geeksforgeeks.org/a-search-algorithm/
 *
 * Binary heap is used to optimize node lookup.
 * See {@link calculateGrid} for the grid calculation details.
 *
 * Additional modifications added due to aesthetic route reasons:
 * 1) Arrow segment direction change is penalized by specific linear constant (bendMultiplier)
 * 2) Arrow segments are not allowed to go "backwards", overlapping with the previous segment
 */
const astar = (
  start,
  end,
  grid,
  startHeading,
  endHeading,
  aabbs,
) => {
  const bendMultiplier = m_dist(start.pos, end.pos);
  const open = new BinaryHeap((node) => node.f);

  open.push(start);

  while (open.size() > 0) {
    // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
    const current = open.pop();

    if (!current || current.closed) {
      // Current is not passable, continue with next element
      continue;
    }

    // End case -- result has been found, return the traced path.
    if (current === end) {
      return pathTo(start, current);
    }

    // Normal case -- move current from open to closed, process each of its neighbors.
    current.closed = true;

    // Find all neighbors for the current node.
    const neighbors = getNeighbors(current.addr, grid);

    for (let i = 0; i < 4; i++) {
      const neighbor = neighbors[i];

      if (!neighbor || neighbor.closed) {
        // Not a valid node to process, skip to next neighbor.
        continue;
      }

      // Intersect
      const neighborHalfPoint = pointScaleFromOrigin(
        neighbor.pos,
        current.pos,
        0.5,
      );
      if (
        isAnyTrue(
          ...aabbs.map((aabb) => pointInsideBounds(neighborHalfPoint, aabb)),
        )
      ) {
        continue;
      }

      // The g score is the shortest distance from start to current node.
      // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
      const neighborHeading = neighborIndexToHeading(i);
      const previousDirection = current.parent
        ? vectorToHeading(vectorFromPoint(current.pos, current.parent.pos))
        : startHeading;

      // Do not allow going in reverse
      const reverseHeading = flipHeading(previousDirection);
      const neighborIsReverseRoute =
        compareHeading(reverseHeading, neighborHeading) ||
        (gridAddressesEqual(start.addr, neighbor.addr) &&
          compareHeading(neighborHeading, startHeading)) ||
        (gridAddressesEqual(end.addr, neighbor.addr) &&
          compareHeading(neighborHeading, endHeading));
      if (neighborIsReverseRoute) {
        continue;
      }

      const directionChange = previousDirection !== neighborHeading;
      const gScore =
        current.g +
        m_dist(neighbor.pos, current.pos) +
        (directionChange ? Math.pow(bendMultiplier, 3) : 0);

      const beenVisited = neighbor.visited;

      if (!beenVisited || gScore < neighbor.g) {
        const estBendCount = estimateSegmentCount(
          neighbor,
          end,
          neighborHeading,
          endHeading,
        );
        // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
        neighbor.visited = true;
        neighbor.parent = current;
        neighbor.h =
          m_dist(end.pos, neighbor.pos) +
          estBendCount * Math.pow(bendMultiplier, 2);
        neighbor.g = gScore;
        neighbor.f = neighbor.g + neighbor.h;
        if (!beenVisited) {
          // Pushing to heap will put it in proper place based on the 'f' value.
          open.push(neighbor);
        } else {
          // Already seen the node, but since it has been rescored we need to reorder it in the heap
          open.rescoreElement(neighbor);
        }
      }
    }
  }

  return null;
};

const m_dist = (a, b) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/**
 * Get neighboring points for a gived grid address
 */
const getNeighbors = ([col, row], grid) => {
  [
    gridNodeFromAddr([col, row - 1], grid),
    gridNodeFromAddr([col + 1, row], grid),
    gridNodeFromAddr([col, row + 1], grid),
    gridNodeFromAddr([col - 1, row], grid),
  ];
};

/**
 * Scale a point from a given origin by the multiplier.
 *
 * @param p The point to scale
 * @param mid The origin to scale from
 * @param multiplier The scaling factor
 * @returns
 */
export const pointScaleFromOrigin = (
  p,
  mid,
  multiplier,
) => pointTranslate(mid, vectorScale(vectorFromPoint(p, mid), multiplier));

export const isAnyTrue = (...args) =>
  Math.max(...args.map((arg) => (arg ? 1 : 0))) > 0;

const neighborIndexToHeading = (idx) => {
  switch (idx) {
    case 0:
      return HEADING_UP;
    case 1:
      return HEADING_RIGHT;
    case 2:
      return HEADING_DOWN;
  }
  return HEADING_LEFT;
};

export const flipHeading = (h) => {
  [
    h[0] === 0 ? 0 : h[0] > 0 ? -1 : 1,
    h[1] === 0 ? 0 : h[1] > 0 ? -1 : 1,
  ];
};

const gridAddressesEqual = (a, b) =>
  a[0] === b[0] && a[1] === b[1];

const estimateSegmentCount = (
  start,
  end,
  startHeading,
  endHeading,
) => {
  if (endHeading === HEADING_RIGHT) {
    switch (startHeading) {
      case HEADING_RIGHT: {
        if (start.pos[0] >= end.pos[0]) {
          return 4;
        }
        if (start.pos[1] === end.pos[1]) {
          return 0;
        }
        return 2;
      }
      case HEADING_UP:
        if (start.pos[1] > end.pos[1] && start.pos[0] < end.pos[0]) {
          return 1;
        }
        return 3;
      case HEADING_DOWN:
        if (start.pos[1] < end.pos[1] && start.pos[0] < end.pos[0]) {
          return 1;
        }
        return 3;
      case HEADING_LEFT:
        if (start.pos[1] === end.pos[1]) {
          return 4;
        }
        return 2;
    }
  } else if (endHeading === HEADING_LEFT) {
    switch (startHeading) {
      case HEADING_RIGHT:
        if (start.pos[1] === end.pos[1]) {
          return 4;
        }
        return 2;
      case HEADING_UP:
        if (start.pos[1] > end.pos[1] && start.pos[0] > end.pos[0]) {
          return 1;
        }
        return 3;
      case HEADING_DOWN:
        if (start.pos[1] < end.pos[1] && start.pos[0] > end.pos[0]) {
          return 1;
        }
        return 3;
      case HEADING_LEFT:
        if (start.pos[0] <= end.pos[0]) {
          return 4;
        }
        if (start.pos[1] === end.pos[1]) {
          return 0;
        }
        return 2;
    }
  } else if (endHeading === HEADING_UP) {
    switch (startHeading) {
      case HEADING_RIGHT:
        if (start.pos[1] > end.pos[1] && start.pos[0] < end.pos[0]) {
          return 1;
        }
        return 3;
      case HEADING_UP:
        if (start.pos[1] >= end.pos[1]) {
          return 4;
        }
        if (start.pos[0] === end.pos[0]) {
          return 0;
        }
        return 2;
      case HEADING_DOWN:
        if (start.pos[0] === end.pos[0]) {
          return 4;
        }
        return 2;
      case HEADING_LEFT:
        if (start.pos[1] > end.pos[1] && start.pos[0] > end.pos[0]) {
          return 1;
        }
        return 3;
    }
  } else if (endHeading === HEADING_DOWN) {
    switch (startHeading) {
      case HEADING_RIGHT:
        if (start.pos[1] < end.pos[1] && start.pos[0] < end.pos[0]) {
          return 1;
        }
        return 3;
      case HEADING_UP:
        if (start.pos[0] === end.pos[0]) {
          return 4;
        }
        return 2;
      case HEADING_DOWN:
        if (start.pos[1] <= end.pos[1]) {
          return 4;
        }
        if (start.pos[0] === end.pos[0]) {
          return 0;
        }
        return 2;
      case HEADING_LEFT:
        if (start.pos[1] < end.pos[1] && start.pos[0] > end.pos[0]) {
          return 1;
        }
        return 3;
    }
  }
  return 0;
};

export class BinaryHeap {
  content = [];

  constructor(scoreFunction) {}

  sinkDown(idx) {
    const node = this.content[idx];
    while (idx > 0) {
      const parentN = ((idx + 1) >> 1) - 1;
      const parent = this.content[parentN];
      if (this.scoreFunction(node) < this.scoreFunction(parent)) {
        this.content[parentN] = node;
        this.content[idx] = parent;
        idx = parentN; // TODO: Optimize
      } else {
        break;
      }
    }
  }

  bubbleUp(idx) {
    const length = this.content.length;
    const node = this.content[idx];
    const score = this.scoreFunction(node);

    while (true) {
      const child2N = (idx + 1) << 1;
      const child1N = child2N - 1;
      let swap = null;
      let child1Score = 0;

      if (child1N < length) {
        const child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);
        if (child1Score < score) {
          swap = child1N;
        }
      }

      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? score : child1Score)) {
          swap = child2N;
        }
      }

      if (swap !== null) {
        this.content[idx] = this.content[swap];
        this.content[swap] = node;
        idx = swap; // TODO: Optimize
      } else {
        break;
      }
    }
  }

  push(node) {
    this.content.push(node);
    this.sinkDown(this.content.length - 1);
  }

  pop() {
    if (this.content.length === 0) {
      return null;
    }

    const result = this.content[0];
    const end = this.content.pop();

    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }

    return result;
  }

  remove(node) {
    if (this.content.length === 0) {
      return;
    }

    const i = this.content.indexOf(node);
    const end = this.content.pop();

    if (i < this.content.length) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  }

  size() {
    return this.content.length;
  }

  rescoreElement(node) {
    this.sinkDown(this.content.indexOf(node));
  }
}

const PRECISION = 10e-5;
/**
 * Compare two points coordinate-by-coordinate and if
 * they are closer than INVERSE_PRECISION it returns TRUE.
 *
 * @param a Point The first point to compare
 * @param b Point The second point to compare
 * @returns TRUE if the points are sufficiently close to each other
 */
export function pointsEqual(
  a,
  b,
) {
  const abs = Math.abs;
  return abs(a[0] - b[0]) < PRECISION && abs(a[1] - b[1]) < PRECISION;
}

const handleSegmentRelease = (
  arrow,
  fixedSegments,
  elementsMap,
) => {
  const newFixedSegmentIndices = fixedSegments.map((segment) => segment.index);
  const oldFixedSegmentIndices =
    arrow.fixedSegments?.map((segment) => segment.index) ?? [];
  const deletedSegmentIdx = oldFixedSegmentIndices.findIndex(
    (idx) => !newFixedSegmentIndices.includes(idx),
  );

  if (deletedSegmentIdx === -1 || !arrow.fixedSegments?.[deletedSegmentIdx]) {
    return {
      points: arrow.points,
    };
  }

  const deletedIdx = arrow.fixedSegments[deletedSegmentIdx].index;

  // Find prev and next fixed segments
  const prevSegment = arrow.fixedSegments[deletedSegmentIdx - 1];
  const nextSegment = arrow.fixedSegments[deletedSegmentIdx + 1];

  // We need to render a sub-arrow path to restore deleted segments
  const x = arrow.x + (prevSegment ? prevSegment.end[0] : 0);
  const y = arrow.y + (prevSegment ? prevSegment.end[1] : 0);
  const startBinding = prevSegment ? null : arrow.startBinding;
  const endBinding = nextSegment ? null : arrow.endBinding;
  const {
    startHeading,
    endHeading,
    startGlobalPoint,
    endGlobalPoint,
    hoveredStartElement,
    hoveredEndElement,
    ...rest
  } = getElbowArrowData(
    {
      x,
      y,
      startBinding,
      endBinding,
      startArrowhead: null,
      endArrowhead: null,
      points: arrow.points,
    },
    elementsMap,
    [
      pointFrom(0, 0),
      pointFrom(
        arrow.x +
          (nextSegment?.start[0] ?? arrow.points[arrow.points.length - 1][0]) -
          x,
        arrow.y +
          (nextSegment?.start[1] ?? arrow.points[arrow.points.length - 1][1]) -
          y,
      ),
    ],
    { isDragging: false },
  );

  const { points: restoredPoints } = normalizeArrowElementUpdate(
    getElbowArrowCornerPoints(
      removeElbowArrowShortSegments(
        routeElbowArrow(arrow, {
          startHeading,
          endHeading,
          startGlobalPoint,
          endGlobalPoint,
          hoveredStartElement,
          hoveredEndElement,
          ...rest,
        }) ?? [],
      ),
    ),
    fixedSegments,
    null,
    null,
  );

  const nextPoints = [];

  // First part of the arrow are the old points
  if (prevSegment) {
    for (let i = 0; i < prevSegment.index; i++) {
      nextPoints.push(
        pointFrom(
          arrow.x + arrow.points[i][0],
          arrow.y + arrow.points[i][1],
        ),
      );
    }
  }

  restoredPoints.forEach((p) => {
    nextPoints.push(
      pointFrom(
        arrow.x + (prevSegment ? prevSegment.end[0] : 0) + p[0],
        arrow.y + (prevSegment ? prevSegment.end[1] : 0) + p[1],
      ),
    );
  });

  // Last part of the arrow are the old points too
  if (nextSegment) {
    for (let i = nextSegment.index; i < arrow.points.length; i++) {
      nextPoints.push(
        pointFrom(
          arrow.x + arrow.points[i][0],
          arrow.y + arrow.points[i][1],
        ),
      );
    }
  }

  // Update nextFixedSegments
  const originalSegmentCountDiff =
    (nextSegment?.index ?? arrow.points.length) - (prevSegment?.index ?? 0) - 1;

  const nextFixedSegments = fixedSegments.map((segment) => {
    if (segment.index > deletedIdx) {
      return {
        ...segment,
        index:
          segment.index -
          originalSegmentCountDiff +
          (restoredPoints.length - 1),
      };
    }

    return segment;
  });

  const simplifiedPoints = nextPoints.flatMap((p, i) => {
    const prev = nextPoints[i - 1];
    const next = nextPoints[i + 1];

    if (prev && next) {
      const prevHeading = headingForPoint(p, prev);
      const nextHeading = headingForPoint(next, p);

      if (compareHeading(prevHeading, nextHeading)) {
        // Update subsequent fixed segment indices
        nextFixedSegments.forEach((segment) => {
          if (segment.index > i) {
            segment.index -= 1;
          }
        });

        return [];
      } else if (compareHeading(prevHeading, flipHeading(nextHeading))) {
        // Update subsequent fixed segment indices
        nextFixedSegments.forEach((segment) => {
          if (segment.index > i) {
            segment.index += 1;
          }
        });

        return [p, p];
      }
    }

    return [p];
  });

  return normalizeArrowElementUpdate(
    simplifiedPoints,
    nextFixedSegments,
    false,
    false,
  );
};

const BASE_PADDING = 40;

const handleSegmentMove = (
  arrow,
  fixedSegments,
  startHeading,
  endHeading,
  hoveredStartElement,
  hoveredEndElement,
) => {
  const activelyModifiedSegmentIdx = fixedSegments
    .map((segment, i) => {
      if (
        arrow.fixedSegments == null ||
        arrow.fixedSegments[i] === undefined ||
        arrow.fixedSegments[i].index !== segment.index
      ) {
        return i;
      }

      return (segment.start[0] !== arrow.fixedSegments[i].start[0] &&
        segment.end[0] !== arrow.fixedSegments[i].end[0]) !==
        (segment.start[1] !== arrow.fixedSegments[i].start[1] &&
          segment.end[1] !== arrow.fixedSegments[i].end[1])
        ? i
        : null;
    })
    .filter((idx) => idx !== null)
    .shift();

  if (activelyModifiedSegmentIdx == null) {
    return { points: arrow.points };
  }

  const firstSegmentIdx =
    arrow.fixedSegments?.findIndex((segment) => segment.index === 1) ?? -1;
  const lastSegmentIdx =
    arrow.fixedSegments?.findIndex(
      (segment) => segment.index === arrow.points.length - 1,
    ) ?? -1;

  // Handle special case for first segment move
  const segmentLength = pointDistance(
    fixedSegments[activelyModifiedSegmentIdx].start,
    fixedSegments[activelyModifiedSegmentIdx].end,
  );
  const segmentIsTooShort = segmentLength < BASE_PADDING + 5;
  if (
    firstSegmentIdx === -1 &&
    fixedSegments[activelyModifiedSegmentIdx].index === 1 &&
    hoveredStartElement
  ) {
    const startIsHorizontal = headingIsHorizontal(startHeading);
    const startIsPositive = startIsHorizontal
      ? compareHeading(startHeading, HEADING_RIGHT)
      : compareHeading(startHeading, HEADING_DOWN);
    const padding = startIsPositive
      ? segmentIsTooShort
        ? segmentLength / 2
        : BASE_PADDING
      : segmentIsTooShort
        ? -segmentLength / 2
        : -BASE_PADDING;
    fixedSegments[activelyModifiedSegmentIdx].start = pointFrom(
      fixedSegments[activelyModifiedSegmentIdx].start[0] +
        (startIsHorizontal ? padding : 0),
      fixedSegments[activelyModifiedSegmentIdx].start[1] +
        (!startIsHorizontal ? padding : 0),
    );
  }

  // Handle special case for last segment move
  if (
    lastSegmentIdx === -1 &&
    fixedSegments[activelyModifiedSegmentIdx].index ===
      arrow.points.length - 1 &&
    hoveredEndElement
  ) {
    const endIsHorizontal = headingIsHorizontal(endHeading);
    const endIsPositive = endIsHorizontal
      ? compareHeading(endHeading, HEADING_RIGHT)
      : compareHeading(endHeading, HEADING_DOWN);
    const padding = endIsPositive
      ? segmentIsTooShort
        ? segmentLength / 2
        : BASE_PADDING
      : segmentIsTooShort
        ? -segmentLength / 2
        : -BASE_PADDING;
    fixedSegments[activelyModifiedSegmentIdx].end = pointFrom(
      fixedSegments[activelyModifiedSegmentIdx].end[0] +
        (endIsHorizontal ? padding : 0),
      fixedSegments[activelyModifiedSegmentIdx].end[1] +
        (!endIsHorizontal ? padding : 0),
    );
  }

  // Translate all fixed segments to global coordinates
  const nextFixedSegments = fixedSegments.map((segment) => ({
    ...segment,
    start: pointFrom(
      arrow.x + segment.start[0],
      arrow.y + segment.start[1],
    ),
    end: pointFrom(
      arrow.x + segment.end[0],
      arrow.y + segment.end[1],
    ),
  }));

  // For start, clone old arrow points
  const newPoints = arrow.points.map((p, i) =>
    pointFrom(arrow.x + p[0], arrow.y + p[1]),
  );

  const startIdx = nextFixedSegments[activelyModifiedSegmentIdx].index - 1;
  const endIdx = nextFixedSegments[activelyModifiedSegmentIdx].index;
  const start = nextFixedSegments[activelyModifiedSegmentIdx].start;
  const end = nextFixedSegments[activelyModifiedSegmentIdx].end;
  const prevSegmentIsHorizontal =
    newPoints[startIdx - 1] &&
    !pointsEqual(newPoints[startIdx], newPoints[startIdx - 1])
      ? headingForPointIsHorizontal(
        newPoints[startIdx - 1],
        newPoints[startIdx],
      )
      : undefined;
  const nextSegmentIsHorizontal =
    newPoints[endIdx + 1] &&
    !pointsEqual(newPoints[endIdx], newPoints[endIdx + 1])
      ? headingForPointIsHorizontal(newPoints[endIdx + 1], newPoints[endIdx])
      : undefined;

  // Override the segment points with the actively moved fixed segment
  if (prevSegmentIsHorizontal !== undefined) {
    const dir = prevSegmentIsHorizontal ? 1 : 0;
    newPoints[startIdx - 1][dir] = start[dir];
  }
  newPoints[startIdx] = start;
  newPoints[endIdx] = end;
  if (nextSegmentIsHorizontal !== undefined) {
    const dir = nextSegmentIsHorizontal ? 1 : 0;
    newPoints[endIdx + 1][dir] = end[dir];
  }

  // Override neighboring fixedSegment start/end points, if any
  const prevSegmentIdx = nextFixedSegments.findIndex(
    (segment) => segment.index === startIdx,
  );
  if (prevSegmentIdx !== -1) {
    // Align the next segment points with the moved segment
    const dir = headingForPointIsHorizontal(
      nextFixedSegments[prevSegmentIdx].end,
      nextFixedSegments[prevSegmentIdx].start,
    )
      ? 1
      : 0;
    nextFixedSegments[prevSegmentIdx].start[dir] = start[dir];
    nextFixedSegments[prevSegmentIdx].end = start;
  }

  const nextSegmentIdx = nextFixedSegments.findIndex(
    (segment) => segment.index === endIdx + 1,
  );
  if (nextSegmentIdx !== -1) {
    // Align the next segment points with the moved segment
    const dir = headingForPointIsHorizontal(
      nextFixedSegments[nextSegmentIdx].end,
      nextFixedSegments[nextSegmentIdx].start,
    )
      ? 1
      : 0;
    nextFixedSegments[nextSegmentIdx].end[dir] = end[dir];
    nextFixedSegments[nextSegmentIdx].start = end;
  }

  // First segment move needs an additional segment
  if (firstSegmentIdx === -1 && startIdx === 0) {
    const startIsHorizontal = hoveredStartElement
      ? headingIsHorizontal(startHeading)
      : headingForPointIsHorizontal(newPoints[1], newPoints[0]);
    newPoints.unshift(
      pointFrom(
        startIsHorizontal ? start[0] : arrow.x + arrow.points[0][0],
        !startIsHorizontal ? start[1] : arrow.y + arrow.points[0][1],
      ),
    );

    if (hoveredStartElement) {
      newPoints.unshift(
        pointFrom(
          arrow.x + arrow.points[0][0],
          arrow.y + arrow.points[0][1],
        ),
      );
    }

    for (const segment of nextFixedSegments) {
      segment.index += hoveredStartElement ? 2 : 1;
    }
  }

  // Last segment move needs an additional segment
  if (lastSegmentIdx === -1 && endIdx === arrow.points.length - 1) {
    const endIsHorizontal = headingIsHorizontal(endHeading);
    newPoints.push(
      pointFrom(
        endIsHorizontal
          ? end[0]
          : arrow.x + arrow.points[arrow.points.length - 1][0],
        !endIsHorizontal
          ? end[1]
          : arrow.y + arrow.points[arrow.points.length - 1][1],
      ),
    );
    if (hoveredEndElement) {
      newPoints.push(
        pointFrom(
          arrow.x + arrow.points[arrow.points.length - 1][0],
          arrow.y + arrow.points[arrow.points.length - 1][1],
        ),
      );
    }
  }

  return normalizeArrowElementUpdate(
    newPoints,
    nextFixedSegments.map((segment) => ({
      ...segment,
      start: pointFrom(
        segment.start[0] - arrow.x,
        segment.start[1] - arrow.y,
      ),
      end: pointFrom(
        segment.end[0] - arrow.x,
        segment.end[1] - arrow.y,
      ),
    })),
    false, // If you move a segment, there is no special point anymore
    false, // If you move a segment, there is no special point anymore
  );
};

const handleEndpointDrag = (
  arrow,
  updatedPoints,
  fixedSegments,
  startHeading,
  endHeading,
  startGlobalPoint,
  endGlobalPoint,
  hoveredStartElement,
  hoveredEndElement,
) => {
  let startIsSpecial = arrow.startIsSpecial ?? null;
  let endIsSpecial = arrow.endIsSpecial ?? null;
  const globalUpdatedPoints = updatedPoints.map((p, i) =>
    i === 0
      ? pointFrom(arrow.x + p[0], arrow.y + p[1])
      : i === updatedPoints.length - 1
        ? pointFrom(arrow.x + p[0], arrow.y + p[1])
        : pointFrom(
          arrow.x + arrow.points[i][0],
          arrow.y + arrow.points[i][1],
        ),
  );
  const nextFixedSegments = fixedSegments.map((segment) => ({
    ...segment,
    start: pointFrom(
      arrow.x + (segment.start[0] - updatedPoints[0][0]),
      arrow.y + (segment.start[1] - updatedPoints[0][1]),
    ),
    end: pointFrom(
      arrow.x + (segment.end[0] - updatedPoints[0][0]),
      arrow.y + (segment.end[1] - updatedPoints[0][1]),
    ),
  }));
  const newPoints = [];

  // Add the inside points
  const offset = 2 + (startIsSpecial ? 1 : 0);
  const endOffset = 2 + (endIsSpecial ? 1 : 0);
  while (newPoints.length + offset < globalUpdatedPoints.length - endOffset) {
    newPoints.push(globalUpdatedPoints[newPoints.length + offset]);
  }

  // Calculate the moving second point connection and add the start point
  {
    const secondPoint = globalUpdatedPoints[startIsSpecial ? 2 : 1];
    const thirdPoint = globalUpdatedPoints[startIsSpecial ? 3 : 2];
    const startIsHorizontal = headingIsHorizontal(startHeading);
    const secondIsHorizontal = headingIsHorizontal(
      vectorToHeading(vectorFromPoint(secondPoint, thirdPoint)),
    );

    if (hoveredStartElement && startIsHorizontal === secondIsHorizontal) {
      const positive = startIsHorizontal
        ? compareHeading(startHeading, HEADING_RIGHT)
        : compareHeading(startHeading, HEADING_DOWN);
      newPoints.unshift(
        pointFrom(
          !secondIsHorizontal
            ? thirdPoint[0]
            : startGlobalPoint[0] + (positive ? BASE_PADDING : -BASE_PADDING),
          secondIsHorizontal
            ? thirdPoint[1]
            : startGlobalPoint[1] + (positive ? BASE_PADDING : -BASE_PADDING),
        ),
      );
      newPoints.unshift(
        pointFrom(
          startIsHorizontal
            ? startGlobalPoint[0] + (positive ? BASE_PADDING : -BASE_PADDING)
            : startGlobalPoint[0],
          !startIsHorizontal
            ? startGlobalPoint[1] + (positive ? BASE_PADDING : -BASE_PADDING)
            : startGlobalPoint[1],
        ),
      );
      if (!startIsSpecial) {
        startIsSpecial = true;
        for (const segment of nextFixedSegments) {
          if (segment.index > 1) {
            segment.index += 1;
          }
        }
      }
    } else {
      newPoints.unshift(
        pointFrom(
          !secondIsHorizontal ? secondPoint[0] : startGlobalPoint[0],
          secondIsHorizontal ? secondPoint[1] : startGlobalPoint[1],
        ),
      );
      if (startIsSpecial) {
        startIsSpecial = false;
        for (const segment of nextFixedSegments) {
          if (segment.index > 1) {
            segment.index -= 1;
          }
        }
      }
    }
    newPoints.unshift(startGlobalPoint);
  }

  // Calculate the moving second to last point connection
  {
    const secondToLastPoint =
      globalUpdatedPoints[globalUpdatedPoints.length - (endIsSpecial ? 3 : 2)];
    const thirdToLastPoint =
      globalUpdatedPoints[globalUpdatedPoints.length - (endIsSpecial ? 4 : 3)];
    const endIsHorizontal = headingIsHorizontal(endHeading);
    const secondIsHorizontal = headingForPointIsHorizontal(
      thirdToLastPoint,
      secondToLastPoint,
    );
    if (hoveredEndElement && endIsHorizontal === secondIsHorizontal) {
      const positive = endIsHorizontal
        ? compareHeading(endHeading, HEADING_RIGHT)
        : compareHeading(endHeading, HEADING_DOWN);
      newPoints.push(
        pointFrom(
          !secondIsHorizontal
            ? thirdToLastPoint[0]
            : endGlobalPoint[0] + (positive ? BASE_PADDING : -BASE_PADDING),
          secondIsHorizontal
            ? thirdToLastPoint[1]
            : endGlobalPoint[1] + (positive ? BASE_PADDING : -BASE_PADDING),
        ),
      );
      newPoints.push(
        pointFrom(
          endIsHorizontal
            ? endGlobalPoint[0] + (positive ? BASE_PADDING : -BASE_PADDING)
            : endGlobalPoint[0],
          !endIsHorizontal
            ? endGlobalPoint[1] + (positive ? BASE_PADDING : -BASE_PADDING)
            : endGlobalPoint[1],
        ),
      );
      if (!endIsSpecial) {
        endIsSpecial = true;
      }
    } else {
      newPoints.push(
        pointFrom(
          !secondIsHorizontal ? secondToLastPoint[0] : endGlobalPoint[0],
          secondIsHorizontal ? secondToLastPoint[1] : endGlobalPoint[1],
        ),
      );
      if (endIsSpecial) {
        endIsSpecial = false;
      }
    }
  }

  newPoints.push(endGlobalPoint);

  return normalizeArrowElementUpdate(
    newPoints,
    nextFixedSegments
      .map(({ index }) => ({
        index,
        start: newPoints[index - 1],
        end: newPoints[index],
      }))
      .map((segment) => ({
        ...segment,
        start: pointFrom(
          segment.start[0] - startGlobalPoint[0],
          segment.start[1] - startGlobalPoint[1],
        ),
        end: pointFrom(
          segment.end[0] - startGlobalPoint[0],
          segment.end[1] - startGlobalPoint[1],
        ),
      })),
    startIsSpecial,
    endIsSpecial,
  );
};
