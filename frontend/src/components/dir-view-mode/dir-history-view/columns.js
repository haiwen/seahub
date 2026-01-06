import React from 'react';
import { gettext } from '../../../utils/constants';
import DescriptionFormatter from './formatters/description-formatter';
import TimeFormatter from './formatters/time-formatter';
import ModifierFormatter from './formatters/modifier-formatter';
import DeviceFormatter from './formatters/device-formatter';
import TagsFormatter from './formatters/tags-formatter';

/**
 * Factory function to create column definitions for history table
 * Follows the pattern used in TagsTable (/tag/views/all-tags/tags-table/)
 *
 * @param {Object} options - Configuration options
 * @param {string} options.repoID - Repository ID
 * @param {string} options.userPerm - User permission ('rw' or 'r')
 * @param {boolean} options.showTags - Whether to show tags column
 * @returns {Array} Array of column definitions for SFTable
 */
export function createHistoryColumns(options = {}) {
  const {
    repoID,
    userPerm = 'r',
    showTags = false,
  } = options;

  let baseColumns = [
    {
      key: 'description',
      name: gettext('Description'),
      display_name: gettext('Description'),
      icon_name: 'text',
      type: 'text',
      width: 350,
      frozen: true,
      editable: false,
      resizable: true,
      is_name_column: true,
      formatter: <DescriptionFormatter repoID={repoID} />,
    },
    {
      key: 'time',
      name: gettext('Time'),
      display_name: gettext('Time'),
      icon_name: 'date',
      type: 'date',
      width: 200,
      editable: false,
      resizable: true,
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
      resizable: true,
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
      resizable: true,
      formatter: <DeviceFormatter />,
    },
  ];

  if (showTags) {
    baseColumns.push({
      key: 'tags',
      name: 'tags',
      display_name: gettext('Tags'),
      icon_name: 'tag-filled',
      type: 'multiple-select',
      width: 200,
      editable: userPerm === 'rw',
      resizable: true,
      formatter: <TagsFormatter userPerm={userPerm} />,
    });
  }

  return baseColumns;
}

