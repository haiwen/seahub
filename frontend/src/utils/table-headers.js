import React from 'react';
import { gettext } from './constants';
import Icon from '../components/icon';

export const TABLE_COLUMN_MIN_WIDTHS = {
  checkbox: 31,
  star: 32,
  icon: 40,
  name: 180,
  tags: 80,
  operations: 120,
  size: 100,
  modified: 140
};

export const createTableHeaders = (mode, sortOptions = {}, selectionOptions = {}) => {
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

  const baseHeaders = [
    {
      key: 'checkbox',
      width: TABLE_COLUMN_MIN_WIDTHS.checkbox,
      isFixed: true,
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
      isFixed: true,
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.star,
      children: null
    },
    {
      key: 'icon',
      width: TABLE_COLUMN_MIN_WIDTHS.icon,
      isFixed: true,
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.icon,
      children: null
    },
    {
      key: 'name',
      width: 0.5,
      isFixed: false,
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
    {
      key: 'tags',
      width: 0.06,
      isFixed: false,
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.tags,
      children: null
    },
    {
      key: 'operations',
      width: 0.18,
      isFixed: false,
      className: 'pl-2 pr-2',
      minWidth: TABLE_COLUMN_MIN_WIDTHS.operations,
      children: null
    },
    {
      key: 'size',
      width: 0.11,
      isFixed: false,
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
    },
    {
      key: 'modified',
      width: 0.15,
      isFixed: false,
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
    }
  ];

  if (mode === 'mobile') {
    return [
      { isFixed: false, width: 0.12 },
      { isFixed: false, width: 0.8 },
      { isFixed: false, width: 0.08 },
    ];
  }

  return baseHeaders;
};

export const calculateResponsiveColumns = (headers, containerWidth) => {
  if (!headers?.length || !containerWidth) {
    return { columns: [], gridTemplate: '', totalWidth: 0 };
  }

  const fixedWidth = headers.reduce((sum, header) => {
    return header.isFixed ? sum + header.width : sum;
  }, 0);

  const remainingWidth = containerWidth - fixedWidth;

  // Calculate each column width
  const columns = headers.map(header => {
    if (header.isFixed) {
      return {
        ...header,
        width: header.width
      };
    } else {
      // Non-fixed columns: calculate as percentage of REMAINING space
      const width = remainingWidth * header.width;
      const minWidth = TABLE_COLUMN_MIN_WIDTHS[header.key] || 60;
      return {
        ...header,
        width: Math.max(width, minWidth)
      };
    }
  });

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const gridTemplate = columns.map(col => col.width + 'px').join(' ');

  return {
    columns,
    gridTemplate,
    totalWidth
  };
};
