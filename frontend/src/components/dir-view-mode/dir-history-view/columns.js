import React from 'react';
import { gettext } from '../../../utils/constants';
import DescriptionFormatter from './formatters/description-formatter';
import TimeFormatter from './formatters/time-formatter';
import ModifierFormatter from './formatters/modifier-formatter';
import DeviceFormatter from './formatters/device-formatter';
import LabelsFormatter from './formatters/labels-formatter';
import ActionsFormatter from './formatters/actions-formatter';

/**
 * Factory function to create column definitions for history table
 * Follows the pattern used in TagsTable (/tag/views/all-tags/tags-table/)
 *
 * @param {Object} options - Configuration options
 * @param {string} options.repoID - Repository ID
 * @param {string} options.userPerm - User permission ('rw' or 'r')
 * @param {boolean} options.showLabel - Whether to show labels column
 * @param {Function} options.onShowCommitDetails - Callback for showing commit details
 * @param {Function} options.onEditLabels - Callback for editing labels
 * @returns {Array} Array of column definitions for SFTable
 */
export function createHistoryColumns(options = {}) {
  const {
    repoID,
    userPerm = 'r',
    showLabel = false,
    onShowCommitDetails,
    onEditLabels
  } = options;

  // Base columns that are always present
  // Note: SFTable expects 'display_name' for column headers, not 'name'
  // and 'icon_name' for the column icon in header
  let baseColumns = [
    {
      key: 'description',
      name: gettext('Description'),
      display_name: gettext('Description'),
      icon_name: 'text',
      type: 'text',
      width: 350,
      frozen: true, // Fixed on horizontal scroll
      editable: false, // Disable inline editing
      resizable: true, // Enable column resize
      is_name_column: true, // SFTable uses this for special styling
      formatter: <DescriptionFormatter onShowDetails={onShowCommitDetails} />,
    },
    {
      key: 'time',
      name: gettext('Time'),
      display_name: gettext('Time'),
      icon_name: 'date',
      type: 'date',
      width: 200,
      editable: false,
      resizable: true, // Enable column resize
      formatter: <TimeFormatter />,
    },
    {
      key: 'name',
      name: gettext('Modifier'),
      display_name: gettext('Modifier'),
      icon_name: 'user',
      type: 'text',
      width: 200,
      editable: false,
      resizable: true, // Enable column resize
      formatter: <ModifierFormatter />,
    },
    {
      key: 'device_info',
      name: `${gettext('Device')} / ${gettext('Version')}`,
      display_name: `${gettext('Device')} / ${gettext('Version')}`,
      icon_name: 'devices',
      type: 'text',
      width: 200,
      editable: false,
      resizable: true, // Enable column resize
      formatter: <DeviceFormatter />,
    },
  ];

  // Conditionally add tag column if enabled
  if (showLabel) {
    baseColumns.push({
      key: 'tags',
      name: gettext('Labels'),
      display_name: gettext('Labels'),
      icon_name: 'tag-filled',
      type: 'multiple-select', // SFTable recognizes this type
      width: 200,
      editable: false, // We handle editing via dialog, not inline
      resizable: true, // Enable column resize
      formatter: <LabelsFormatter userPerm={userPerm} onEditLabels={onEditLabels} />,
    });
  }

  // Actions column (only for users with write permission)
  if (userPerm === 'rw') {
    baseColumns.push({
      key: 'actions',
      name: '', // Empty name for actions column
      display_name: '', // Required by SFTable (empty for actions column)
      type: 'text',
      width: 150,
      editable: false,
      formatter: <ActionsFormatter repoID={repoID} userPerm={userPerm} />,
    });
  }

  // Add index and position to columns (required by SFTable)
  let left = 0;
  baseColumns = baseColumns.map((column, idx) => {
    const columnWithIndex = {
      ...column,
      idx,
      left,
    };
    left += column.width;
    return columnWithIndex;
  });

  return baseColumns;
}

