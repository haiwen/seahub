export const COLUMN_CONFIG = {
  checkbox: {
    width: 32,
    className: 'dirent-checkbox-wrapper',
    headerClassName: 'pl10 pr-2 cursor-pointer',
  },
  star: {
    width: 32,
    className: 'dirent-operation dirent-operation-star',
  },
  icon: {
    width: 40,
    className: 'dirent-thumbnail',
  },
  name: {
    width: 120,
    className: 'dirent-property dirent-item-name',
  },
  size: {
    width: 100,
    className: 'dirent-property dirent-property-size',
  },
  modified: {
    width: 160,
    className: 'dirent-property dirent-property-modified',
  },
  creator: {
    width: 100,
    className: 'dirent-property dirent-property-creator',
  },
  last_modifier: {
    width: 120,
    className: 'dirent-property dirent-property-last-modifier',
  },
  status: {
    width: 100,
    className: 'dirent-property dirent-property-status',
  },
};

export const TABLE_COLUMN_MIN_WIDTHS = Object.fromEntries(
  Object.entries(COLUMN_CONFIG).map(([key, config]) => [key, config.width])
);

export const STATUS_OPTIONS = {
  IN_PROGRESS: {
    id: '_in_progress',
    name: 'In progress',
    color: '#EED5FF',
    textColor: '#212529'
  },
  IN_REVIEW: {
    id: '_in_review',
    name: 'In review',
    color: '#FFFDCF',
    textColor: '#212529'
  },
  DONE: {
    id: '_done',
    name: 'Done',
    color: '#59CB74',
    textColor: '#FFFFFF'
  },
  OUTDATED: {
    id: '_outdated',
    name: 'Outdated',
    color: '#C2C2C2',
    textColor: '#FFFFFF'
  }
};

export const formatStatusOptions = (options) => {
  if (!options || !Array.isArray(options)) return [];

  return options.map(option => {
    const id = option.id;

    if (id === STATUS_OPTIONS.IN_PROGRESS.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.IN_PROGRESS.name,
        color: option.color || STATUS_OPTIONS.IN_PROGRESS.color,
        textColor: option.textColor || STATUS_OPTIONS.IN_PROGRESS.textColor
      };
    } else if (id === STATUS_OPTIONS.IN_REVIEW.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.IN_REVIEW.name,
        color: option.color || STATUS_OPTIONS.IN_REVIEW.color,
        textColor: option.textColor || STATUS_OPTIONS.IN_REVIEW.textColor
      };
    } else if (id === STATUS_OPTIONS.DONE.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.DONE.name,
        color: option.color || STATUS_OPTIONS.DONE.color,
        textColor: option.textColor || STATUS_OPTIONS.DONE.textColor
      };
    } else if (id === STATUS_OPTIONS.OUTDATED.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.OUTDATED.name,
        color: option.color || STATUS_OPTIONS.OUTDATED.color,
        textColor: option.textColor || STATUS_OPTIONS.OUTDATED.textColor
      };
    }

    return option;
  });
};
