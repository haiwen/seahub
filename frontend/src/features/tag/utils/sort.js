import { ALL_TAGS_SORT_KEY, TAGS_DEFAULT_SORT } from '../constants/sort';

export const getSortBy = (sort) => {
  return (sort && sort.sort_by) || TAGS_DEFAULT_SORT.sort_by;
};

export const getSortOrder = (sort) => {
  return (sort && sort.order) || TAGS_DEFAULT_SORT.order;
};

export const checkIsSortByName = (sort) => {
  const sortBy = getSortBy(sort);
  return sortBy === ALL_TAGS_SORT_KEY.NAME;
};

export const checkIsSortByChildTagsCount = (sort) => {
  const sortBy = getSortBy(sort);
  return sortBy === ALL_TAGS_SORT_KEY.CHILD_TAGS_COUNT;
};

export const checkIsSortByChildTagFilesCount = (sort) => {
  const sortBy = getSortBy(sort);
  return sortBy === ALL_TAGS_SORT_KEY.TAG_FILE_COUNT;
};
