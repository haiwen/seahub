import { EVENT_BUS_TYPE } from './event-bus-type';
import { OPERATION_TYPE } from '../store/operations/constants';

/**
 * Search persistence operation categories
 * Defines which operations preserve search state and which invalidate it
 */

/**
 * Operations that preserve search state
 * These operations don't fundamentally change the data structure or visibility,
 * so search results can be reapplied to the updated data
 */
export const SEARCH_PRESERVING_OPERATIONS = [
  // View operations that don't change base dataset
  EVENT_BUS_TYPE.MODIFY_SORTS,
  EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS,
  EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER,
  EVENT_BUS_TYPE.MODIFY_SETTINGS,

  // Record operations that preserve search context
  EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED,
  EVENT_BUS_TYPE.LOCAL_COLUMN_DATA_CHANGED,
  EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED,
  EVENT_BUS_TYPE.DELETE_RECORDS,
  EVENT_BUS_TYPE.MOVE_RECORD,
  EVENT_BUS_TYPE.DUPLICATE_RECORD,

  // Store operations that preserve search
  OPERATION_TYPE.MOVE_RECORDS,
  OPERATION_TYPE.DUPLICATE_RECORDS,
  OPERATION_TYPE.MODIFY_COLUMN_WIDTH,
  OPERATION_TYPE.MODIFY_LOCAL_COLUMN_DATA,
  OPERATION_TYPE.INSERT_COLUMN,
  OPERATION_TYPE.DELETE_COLUMN,
  OPERATION_TYPE.RENAME_COLUMN,
  OPERATION_TYPE.MODIFY_COLUMN_DATA,
  OPERATION_TYPE.UPDATE_FILE_TAGS,

  // File operations that preserve identity
  EVENT_BUS_TYPE.UPDATE_RECORD_DETAILS,
  EVENT_BUS_TYPE.UPDATE_FACE_RECOGNITION,
  EVENT_BUS_TYPE.GENERATE_DESCRIPTION,
  EVENT_BUS_TYPE.OCR,

  // External changes preserve search (user can manually refresh if needed)
  EVENT_BUS_TYPE.SERVER_TABLE_CHANGED,
  EVENT_BUS_TYPE.RELOAD_DATA,
  EVENT_BUS_TYPE.UPDATE_TABLE_ROWS,

  // View structure changes preserve search
  OPERATION_TYPE.MODIFY_VIEW_TYPE,
];

/**
 * Operations that invalidate search state
 * These operations fundamentally change data structure or visibility,
 * making existing search context potentially invalid
 */
export const SEARCH_INVALIDATING_OPERATIONS = [
  // Operations that change which records are shown
  EVENT_BUS_TYPE.MODIFY_FILTERS, // Changes base dataset visibility
  EVENT_BUS_TYPE.MODIFY_GROUPBYS, // Changes data organization structure
];

/**
 * Combined operation categories for search persistence logic
 */
export const SEARCH_OPERATION_CATEGORIES = {
  SEARCH_PRESERVING: SEARCH_PRESERVING_OPERATIONS,
  SEARCH_INVALIDATING: SEARCH_INVALIDATING_OPERATIONS,
};

/**
 * Helper function to check if an operation should preserve search state
 * @param {string} operationType - The operation type to check
 * @returns {boolean} - True if search should be preserved, false if it should be cleared
 */
export const shouldPreserveSearchForOperation = (operationType) => {
  return SEARCH_PRESERVING_OPERATIONS.includes(operationType);
};
