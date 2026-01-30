import { gettext } from '@/utils/constants';
import { PRIVATE_COLUMN_KEYS } from '@/metadata/constants';
import { createColumnFormatter } from './formatter/formatter-factory';

const COLUMN_ICON_NAME_KEY = {
  _name: 'text',
  _size: 'number',
  _mtime: 'creation-time',
  _creator: 'user',
  _last_modifier: 'user',
  _status: 'single-select',
};

const createDirentTableColumns = (options = {}) => {
  const baseColumns = [
    {
      key: '_name',
      name: gettext('Name'),
      display_name: gettext('Name'),
      type: 'text',
      width: 300,
      frozen: true,
      editable: false,
      resizable: true,
      is_name_column: true,
    },
    {
      key: '_size_original',
      name: gettext('Size'),
      display_name: gettext('Size'),
      type: 'number',
      width: 100,
      editable: false,
      resizable: true,
    },
    {
      key: '_mtime',
      name: gettext('Last Update'),
      display_name: gettext('Last Update'),
      type: 'text',
      width: 160,
      editable: false,
      resizable: true,
    },
    {
      key: '_creator',
      name: gettext('Creator'),
      display_name: gettext('Creator'),
      type: 'text',
      width: 140,
      editable: false,
      resizable: true,
    },
    {
      key: '_last_modifier',
      name: gettext('Last Modifier'),
      display_name: gettext('Last Modifier'),
      type: 'text',
      width: 140,
      editable: false,
      resizable: true,
    },
    {
      key: '_status',
      name: gettext('Status'),
      display_name: gettext('Status'),
      type: 'text',
      width: 100,
      editable: false,
      resizable: true,
    },
  ];

  return baseColumns.map(column => {
    const formatter = createColumnFormatter({ column, otherProps: options });
    const is_private = PRIVATE_COLUMN_KEYS.includes(column.key);
    const icon_name = COLUMN_ICON_NAME_KEY[column.key];
    const columnWithFormatter = formatter ? { ...column, formatter } : column;
    return { ...columnWithFormatter, is_private, icon_name };
  });
};

export { createDirentTableColumns };
