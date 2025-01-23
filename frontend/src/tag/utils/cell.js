import { PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../constants';

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
  return tag ? tag[PRIVATE_COLUMN_KEY.TAG_NAME] : '';
};

export const getTagColor = (tag) => {
  return tag ? tag[PRIVATE_COLUMN_KEY.TAG_COLOR] : '';
};

export const getTagId = (tag) => {
  return tag ? tag[PRIVATE_COLUMN_KEY.ID] : '';
};

export const getParentLinks = (tag) => {
  return (tag && tag[PRIVATE_COLUMN_KEY.PARENT_LINKS]) || [];
};

export const getChildLinks = (tag) => {
  return (tag && tag[PRIVATE_COLUMN_KEY.SUB_LINKS]) || [];
};

export const getTagFilesLinks = (tag) => {
  return (tag && tag[PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]) || [];
};

export const getTagFilesCount = (tag) => {
  const links = getTagFilesLinks(tag);
  return Array.isArray(links) ? links.length : 0;
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
