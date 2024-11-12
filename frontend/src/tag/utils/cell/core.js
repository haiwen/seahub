import { gettext } from '../../../utils/constants';
import { PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY, PREDEFINED_TAG_NAME } from '../../constants';

/**
 * @param {object} record eg: { [column_key]: value, [column_name]: value }
 * @param {object} column
 * @return {any} value
 */
export const getCellValueByColumn = (record, column) => {
  if (!record || !column) return null;
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return record[key];
  return record[name];
};

export const getTagName = (tag) => {
  const name = tag ? tag[PRIVATE_COLUMN_KEY.TAG_NAME] : '';
  switch (name) {
    case PREDEFINED_TAG_NAME.RED: {
      return gettext('Red');
    }
    case PREDEFINED_TAG_NAME.ORANGE: {
      return gettext('Orange');
    }
    case PREDEFINED_TAG_NAME.YELLOW: {
      return gettext('Yellow');
    }
    case PREDEFINED_TAG_NAME.GREEN: {
      return gettext('Green');
    }
    case PREDEFINED_TAG_NAME.BLUE: {
      return gettext('Blue');
    }
    case PREDEFINED_TAG_NAME.INDIGO: {
      return gettext('Indigo');
    }
    case PREDEFINED_TAG_NAME.PURPLE: {
      return gettext('Purple');
    }
    default: {
      return name;
    }
  }
};

export const getTagColor = (tag) => {
  return tag ? tag[PRIVATE_COLUMN_KEY.TAG_COLOR] : '';
};

export const getTagId = (tag) => {
  return tag ? tag[PRIVATE_COLUMN_KEY.ID] : '';
};

export const getTagFilesCount = (tag) => {
  const links = tag ? tag[PRIVATE_COLUMN_KEY.TAG_FILE_LINKS] : [];
  if (Array.isArray(links)) return links.length;
  return 0;
};
export const getTagsByNameOrColor = (tags, nameOrColor) => {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  if (!nameOrColor) return tags;
  const value = nameOrColor.toLowerCase();
  return tags.filter((tag) => {
    const tagName = getTagName(tag);
    if (tagName && tagName.toLowerCase().includes(value)) return true;
    const tagColor = getTagColor(tag);
    if (tagColor && tagColor.toLowerCase().includes(value)) return true;
    return false;
  });
};

export const getTagByNameOrColor = (tags, nameOrColor) => {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  if (!nameOrColor) return null;
  return tags.find((tag) => {
    const tagName = getTagName(tag);
    if (tagName && tagName === nameOrColor) return true;
    const tagColor = getTagColor(tag);
    if (tagColor && tagColor === nameOrColor) return true;
    return false;
  });
};
