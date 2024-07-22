import { sortText } from './text';

/**
 * Sort collaborator with email or name
 * @param {array} leftCollaborators e.g. [ collaborator.email, ... ] | [ collaborator.name, ... ]
 * @param {array} rightCollaborators
 * @param {string} sortType e.g. 'up' | 'down
 * @returns number
 */
const sortCollaborator = (leftCollaborators, rightCollaborators, sortType) => {
  const sLeftCollaborators = (Array.isArray(leftCollaborators) && leftCollaborators.length)
    ? leftCollaborators.join('') : null;
  const sRightCollaborators = (Array.isArray(rightCollaborators) && rightCollaborators.length)
    ? rightCollaborators.join('') : null;
  return sortText(sLeftCollaborators, sRightCollaborators, sortType);
};

export {
  sortCollaborator,
};
