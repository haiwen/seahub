import { CUSTOM_NODE_HEIGHT, CUSTOM_NODE_WIDTH } from '../constants/node';

const NODE_OFFSET_X_STEP = 200;

const NODE_OFFSET_Y_STEP = 160;

const NODES_DEFAULT_X_GAP = 10;
const NODES_DEFAULT_Y_GAP = 40;

export const calculateNextNodePositionsFromHandles = (sourceX, sourceY, sourceWidth, handlesCount) => {
  const baseX = sourceX + (sourceWidth || CUSTOM_NODE_WIDTH) + NODE_OFFSET_X_STEP;
  const baseY = sourceY;
  const middle = (handlesCount - 1) / 2;

  let positions = [];
  for (let i = 0; i < handlesCount; i++) {
    const indexFromMiddle = i - middle;
    const y = baseY + indexFromMiddle * NODE_OFFSET_Y_STEP;
    positions.push({ x: baseX, y });
  }
  return positions;
};

const checkNodeOverlapping = (newNodePosition, nodes) => {
  const newNodeLeft = newNodePosition.x;
  const newNodeRight = newNodePosition.x + CUSTOM_NODE_WIDTH;
  const newNodeTop = newNodePosition.y;
  const newNodeBottom = newNodePosition.y + CUSTOM_NODE_HEIGHT;
  return nodes.some(node => {
    const { position, measured } = node;
    if (position && measured) {
      const currNodeLeft = position.x;
      const currNodeRight = position.x + measured.width;
      const currNodeTop = position.y;
      const currNodeBottom = position.y + measured.height;
      return !(
        newNodeRight + NODES_DEFAULT_X_GAP < currNodeLeft ||
        newNodeLeft > currNodeRight + NODES_DEFAULT_X_GAP ||
        newNodeBottom + NODES_DEFAULT_Y_GAP < currNodeTop ||
        newNodeTop > currNodeBottom + NODES_DEFAULT_Y_GAP
      );
    }
    return false;
  });
};

export const findBlankPosition = (newNodePosition, nodes) => {
  if (!checkNodeOverlapping(newNodePosition, nodes)) {
    return newNodePosition;
  }
  // offset directions
  const directions = [
    [1, 1], // right-down
    [1, -1], // right-up
    [-1, 1], // left-down
    [-1, -1], // left-up
  ];

  const maxStep = 30;
  let step = 1;
  while (step < maxStep) {
    for (const [dx, dy] of directions) {
      let nextPos = {
        x: newNodePosition.x + dx * step * NODES_DEFAULT_X_GAP,
        y: newNodePosition.y + dy * step * NODES_DEFAULT_Y_GAP,
      };
      if (!checkNodeOverlapping(nextPos, nodes)) {
        return nextPos;
      }
    }
    step++;
  }

  // use original position if no suitable position found
  return newNodePosition;
};
