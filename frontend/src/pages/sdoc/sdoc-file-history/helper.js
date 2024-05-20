export const getLastVersion = (path, isShowChanges, historyGroups) => {
  const [monthIndex, dayIndex, dailyIndex] = path;
  const monthHistoryGroup = historyGroups[monthIndex];
  const dayHistoryGroup = monthHistoryGroup.children[dayIndex];
  let lastVersion = '';
  if (isShowChanges) {
    if (dayHistoryGroup.showDaily) {
      lastVersion = dayHistoryGroup.children[dailyIndex + 1];
    }
    if (!lastVersion) {
      lastVersion = monthHistoryGroup.children[dayIndex + 1]?.children[0];
    }
    if (!lastVersion) {
      lastVersion = historyGroups[monthIndex + 1]?.children[0]?.children[0];
    }
    if (monthIndex === 0 && !lastVersion) {
      lastVersion = 'init';
    }
  }
  return lastVersion;
};

export const getCurrentAndLastVersion = (path, historyGroups, isShowChanges) => {
  const [monthIndex, dayIndex, dailyIndex] = path;
  const monthHistoryGroup = historyGroups[monthIndex];
  const dayHistoryGroup = monthHistoryGroup.children[dayIndex];
  const currentVersion = dayHistoryGroup.children[dailyIndex];
  const lastVersion = getLastVersion(path, isShowChanges, historyGroups);
  return [currentVersion, lastVersion];
};
