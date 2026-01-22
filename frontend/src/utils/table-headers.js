import React from 'react';
import { gettext } from './constants';
import Icon from '../components/icon';
import { isMobile } from './utils';
import {
  ESSENTIAL_COLUMNS,
} from '../constants/dir-column-visibility';

export const TABLE_COLUMN_MIN_WIDTHS = {
  checkbox: 32,
  star: 32,
  icon: 40,
  name: 180,
  size: 100,
  modified: 140,
  creator: 140,
  last_modifier: 140,
  status: 100,
};

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

  // Helper to check if column should be included
  const isColumnVisible = (columnKey) => {
    // Essential columns are always visible
    if (ESSENTIAL_COLUMNS.includes(columnKey)) return true;
    // Check if column is in visible list
    return visibleColumns.includes(columnKey);
  };

  const baseHeaders = [
    // Essential columns (always visible)
    {
      key: 'checkbox',
      width: TABLE_COLUMN_MIN_WIDTHS.checkbox,
      flex: '0 0 32px',
      className: 'pl10 pr-2 cursor-pointer',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.checkbox,
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
      width: TABLE_COLUMN_MIN_WIDTHS.star,
      flex: '0 0 32px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.star,
      children: null
    },
    {
      key: 'icon',
      width: TABLE_COLUMN_MIN_WIDTHS.icon,
      flex: '0 0 40px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.icon,
      children: null
    },
    {
      key: 'name',
      width: 0.5,
      flex: '1 1 auto',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.name,
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
    // Configurable columns (only add if visible)
    ...(isColumnVisible('size') ? [{
      key: 'size',
      width: TABLE_COLUMN_MIN_WIDTHS.size,
      flex: '0 0 100px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.size,
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
      width: TABLE_COLUMN_MIN_WIDTHS.modified,
      flex: '0 0 140px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.modified,
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
      width: TABLE_COLUMN_MIN_WIDTHS.creator,
      flex: '0 0 140px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.creator,
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
      width: TABLE_COLUMN_MIN_WIDTHS.last_modifier,
      flex: '0 0 140px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.last_modifier,
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
      width: TABLE_COLUMN_MIN_WIDTHS.status,
      flex: '0 0 100px',
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.status,
      children: React.createElement(
        'span',
        {},
        gettext('Status')
      )
    }] : []),
  ];

  return baseHeaders;
};
