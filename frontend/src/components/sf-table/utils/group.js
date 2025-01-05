/**
 * Get group by paths
 * @param {array} paths e.g. [ 0, 1, 2 ]
 * @param {array} groups grouped rows
 * @returns group, object
 */
export const getGroupByPath = (paths, groups) => {
  if (!Array.isArray(paths) || !Array.isArray(groups)) {
    return null;
  }

  const level0GroupIndex = paths[0];
  if (level0GroupIndex < 0 || level0GroupIndex >= groups.length) {
    return null;
  }

  let level = 1;
  let foundGroup = groups[level0GroupIndex];
  while (level < paths.length) {
    if (!foundGroup) {
      break;
    }
    const subGroups = foundGroup.subgroups;
    const currentLevelGroupIndex = paths[level];
    if (
      !Array.isArray(subGroups)
      || (currentLevelGroupIndex < 0 || currentLevelGroupIndex >= subGroups.length)
    ) {
      break;
    }
    foundGroup = subGroups[currentLevelGroupIndex];
    level += 1;
  }
  return foundGroup;
};
