import React from 'react';
import { gettext } from './constants';
import Icon from '../components/icon';
import {
  ESSENTIAL_COLUMNS,
} from '../constants/dir-column-visibility';
import { COLUMN_CONFIG } from '../components/dirent-list-view/column-config';

export const TABLE_COLUMN_MIN_WIDTHS = Object.fromEntries(
  Object.entries(COLUMN_CONFIG).map(([key, config]) => [key, config.width])
);

export const createTableHeaders = (
  sortOptions = {},
  selectionOptions = {},
  visibleColumns = []
) => {
  const { sortBy, sortOrder, onSort } = sortOptions;
  const { isAllSelected, onAllItemSelected, isPartiallySelected } = selectionOptions;

  const sortIcon = React.createElement(
    'span',
    { className: 'd-flex justify-content-center align-items-center ml-1' },
    React.createElement(Icon, {
      symbol: 'down',
      className: 'w-3 h-3 ' + (sortOrder === 'asc' ? 'rotate-180' : '')
    })
  );

  const isColumnVisible = (columnKey) => {
    if (ESSENTIAL_COLUMNS.includes(columnKey)) return true;
    return visibleColumns.includes(columnKey);
  };

  const baseHeaders = [
    {
      key: 'checkbox',
      width: COLUMN_CONFIG.checkbox.width,
      className: COLUMN_CONFIG.checkbox.headerClassName,
      minWidth: COLUMN_CONFIG.checkbox.width,
      children: React.createElement(
        'div',
        {
          className: 'select-all-checkbox-wrapper',
          onClick: onAllItemSelected,
          onKeyDown: (e) => e.key === 'Enter' && onAllItemSelected(),
          role: 'button',
          tabIndex: 0,
          'aria-label': isAllSelected ? gettext('Unselect all items') : gettext('Select all items'),
          title: isAllSelected ? gettext('Unselect all items') : gettext('Select all items')
        },
        isPartiallySelected
          ? React.createElement(Icon, { symbol: 'partially-selected' })
          : React.createElement('input', {
            type: 'checkbox',
            className: 'cursor-pointer form-check-input',
            checked: isAllSelected,
            onChange: () => {},
            readOnly: true
          })
      )
    },
    {
      key: 'star',
      width: COLUMN_CONFIG.star.width,
      className: COLUMN_CONFIG.star.className,
      minWidth: COLUMN_CONFIG.star.width,
      children: null
    },
    {
      key: 'icon',
      width: COLUMN_CONFIG.icon.width,
      className: COLUMN_CONFIG.icon.className,
      minWidth: COLUMN_CONFIG.icon.width,
      children: null
    },
    {
      key: 'name',
      width: 0.5,
      className: COLUMN_CONFIG.name.className,
      minWidth: COLUMN_CONFIG.name.width,
      children: React.createElement(
        'a',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('name'); }
        },
        gettext('Name'),
        sortBy === 'name' && sortIcon
      )
    },
    ...(isColumnVisible('size') ? [{
      key: 'size',
      width: COLUMN_CONFIG.size.width,
      className: COLUMN_CONFIG.size.className,
      minWidth: COLUMN_CONFIG.size.width,
      children: React.createElement(
        'a',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('size'); }
        },
        gettext('Size'),
        sortBy === 'size' && sortIcon
      )
    }] : []),
    ...(isColumnVisible('modified') ? [{
      key: 'modified',
      width: COLUMN_CONFIG.modified.width,
      className: COLUMN_CONFIG.modified.className,
      minWidth: COLUMN_CONFIG.modified.width,
      children: React.createElement(
        'a',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('time'); }
        },
        gettext('Last Update'),
        sortBy === 'time' && sortIcon
      )
    }] : []),
    ...(isColumnVisible('creator') ? [{
      key: 'creator',
      width: COLUMN_CONFIG.creator.width,
      className: COLUMN_CONFIG.creator.className,
      minWidth: COLUMN_CONFIG.creator.width,
      children: React.createElement(
        'a',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('creator'); }
        },
        gettext('Creator'),
        sortBy === 'creator' && sortIcon
      )
    }] : []),
    ...(isColumnVisible('last_modifier') ? [{
      key: 'last_modifier',
      width: COLUMN_CONFIG.last_modifier.width,
      className: COLUMN_CONFIG.last_modifier.className,
      minWidth: COLUMN_CONFIG.last_modifier.width,
      children: React.createElement(
        'a',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('last_modifier'); }
        },
        gettext('Last Modifier'),
        sortBy === 'last_modifier' && sortIcon
      )
    }] : []),
    ...(isColumnVisible('status') ? [{
      key: 'status',
      width: COLUMN_CONFIG.status.width,
      className: COLUMN_CONFIG.status.className,
      minWidth: COLUMN_CONFIG.status.width,
      children: React.createElement(
        'span',
        {},
        gettext('Status')
      )
    }] : []),
  ];

  return baseHeaders;
};
