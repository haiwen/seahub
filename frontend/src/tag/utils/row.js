import { getTagName } from './cell';

export const getTagByName = (tagsData, tagName) => {
  if (!tagsData || !tagName) return null;
  return tagsData.rows.find((tag) => getTagName(tag) === tagName);
};

export const getTagById = (tagsData, id) => {
  if (!tagsData || !id) return null;
  return tagsData.id_row_map[id];
};
