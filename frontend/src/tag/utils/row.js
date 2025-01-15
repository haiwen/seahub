import { getTagName } from './cell';

export const getTagByName = (tagsData, tagName) => {
  if (!tagsData || !tagName) return null;
  return tagsData.rows.find((tag) => getTagName(tag) === tagName);
};
