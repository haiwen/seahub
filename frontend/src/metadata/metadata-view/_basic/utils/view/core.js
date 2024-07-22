import {
  getValidFilters,
} from '../filter/core';
import { getValidGroupbys } from '../group/core';
import { getValidSorts } from '../sort/core';

/**
 * Get view by id
 * @param {array} views e.g. [{ _id, ... }, ...]
 * @param {string} viewId
 * @returns view, object
 */
const getViewById = (views, viewId) => {
  if (!Array.isArray(views) || !viewId) return null;
  return views.find((view) => view._id === viewId);
};

/**
 * Get view by name
 * @param {array} views
 * @param {string} viewName
 * @returns view, object
 */
const getViewByName = (views, viewName) => {
  if (!Array.isArray(views) || !viewName) return null;
  return views.find((view) => view.name === viewName);
};

/**
 * Check whether the view contains filters
 * @param {object} view e.g. { filters, ... }
 * @param {array} columns
 * @returns bool
 */
const isFilterView = (view, columns) => {
  const validFilters = getValidFilters(view.filters, columns);
  return validFilters.length > 0;
};

/**
 * Check whether the view contains groupbys
 * @param {object} view e.g. { groupbys, ... }
 * @param {array} columns
 * @returns bool
 */
const isGroupView = (view, columns) => {
  const validGroupbys = getValidGroupbys(view.groupbys, columns);
  return validGroupbys.length > 0;
};

/**
 * Check whether the view contains sorts
 * @param {object} view e.g. { sorts, ... }
 * @param {array} columns
 * @returns bool
 */
const isSortView = (view, columns) => {
  const validSorts = getValidSorts(view.sorts, columns);
  return validSorts.length > 0;
};

/**
 * Check whether the view has hidden columns
 * @param {object} view e.g. { hidden_columns, ... }
 * @returns bool
 */
const isHiddenColumnsView = (view) => {
  const { hidden_columns } = view || {};
  return Array.isArray(hidden_columns) && hidden_columns.length > 0;
};

/**
 * Check is default view which no contains filters, sorts, groupbys etc.
 * @param {object} view e.g. { filters, groupbys, sorts, ... }
 * @param {array} columns
 * @returns bool
 */
const isDefaultView = (view, columns) => (
  !isFilterView(view, columns) && !isSortView(view, columns) && !isGroupView(view, columns)
);

const getViewShownColumns = (view, columns) => {
  if (!Array.isArray(columns)) return [];
  if (!isHiddenColumnsView(view)) return columns;
  const { hidden_columns } = view;
  return columns.filter((column) => !hidden_columns.includes(column.key));
};

export {
  getViewById,
  getViewByName,
  isDefaultView,
  isFilterView,
  isGroupView,
  isSortView,
  isHiddenColumnsView,
  getViewShownColumns,
};
