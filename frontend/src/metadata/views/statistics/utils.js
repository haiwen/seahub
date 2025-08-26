import { mediaUrl } from '../../../utils/constants';
import { getCollaborator } from '../../utils/cell/column/collaborator';
import { FILE_TYPE_NAMES, FILE_TYPE_COLORS } from '../../constants/view/statistics';

export const processFileTypeData = (fileTypeStats) => {
  if (!fileTypeStats) return [];

  return fileTypeStats.map(item => ({
    label: FILE_TYPE_NAMES[item.type] || item.type,
    value: item.count,
    color: FILE_TYPE_COLORS[item.type] || '#636e72',
    type: item.type
  }));
};

export const processTimeData = (timeStats, timeGrouping) => {
  if (!timeStats?.[timeGrouping]?.data) return [];

  return timeStats[timeGrouping].data.map(item => ({
    name: item.label,
    value: item.count,
    period: item.period
  }));
};

export const processCreatorData = (creatorStats, collaborators, getCollaboratorFromHook, sortBy, sortOrder) => {
  if (!creatorStats) return [];

  const processed = creatorStats.map(item => {
    const collaborator = getCollaboratorFromHook
      ? getCollaboratorFromHook(item.creator)
      : getCollaborator(collaborators, item.creator);

    return {
      name: item.creator,
      displayName: collaborator?.name || item.creator,
      avatarUrl: collaborator?.avatar_url || `${mediaUrl}/avatars/default.png`,
      value: item.count,
      collaborator: collaborator
    };
  });

  return processed.sort((a, b) => {
    let compareValue = 0;

    if (sortBy === 'count') {
      compareValue = a.value - b.value;
    } else if (sortBy === 'name') {
      compareValue = a.displayName.localeCompare(b.displayName);
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });
};
