import React from 'react';
import { gettext } from './constants';
import Icon from '../components/icon';
import { DIR_COLUMN_KEYS } from '../constants/dir-column-config';
import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';

export const createTableHeaders = (
  sortOptions = {},
  selectionOptions = {},
  visibleColumnKeys = []
) => {
  const { sortBy, sortOrder, onSort } = sortOptions;
  const { isAllSelected, onAllItemSelected, isPartiallySelected } = selectionOptions;
  const shouldUnselectAll = isAllSelected || isPartiallySelected;
  const selectAllTooltip = shouldUnselectAll ? gettext('Unselect all items') : gettext('Select all items');

  const sortIcon = React.createElement(
    'span',
    { className: 'd-flex justify-content-center align-items-center ml-1' },
    React.createElement(Icon, {
      symbol: 'down',
      className: 'w-3 h-3 ' + (sortOrder === 'asc' ? 'rotate-180' : '')
    })
  );

  const isColumnVisible = (columnKey) => {
    return visibleColumnKeys.includes(columnKey);
  };

  const baseHeaders = [
    {
      key: 'checkbox',
      width: 32,
      className: 'pl10 pr-2 cursor-pointer',
      children: React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'div',
          {
            id: 'table-header-select-all-checkbox',
            className: 'select-all-checkbox-wrapper',
            onClick: onAllItemSelected,
            onKeyDown: (e) => e.key === 'Enter' && onAllItemSelected(),
            role: 'button',
            tabIndex: 0,
            title: selectAllTooltip,
            'aria-label': selectAllTooltip
          },
          isPartiallySelected
            ? React.createElement(Icon, { symbol: 'partially-selected' })
            : React.createElement('input', {
              type: 'checkbox',
              className: 'cursor-pointer form-check-input',
              checked: isAllSelected,
              onChange: () => { },
              readOnly: true
            })
        )
      )
    },
    {
      key: 'star',
      width: 32,
      className: 'dirent-operation dirent-operation-star',
      children: null
    },
    {
      key: 'icon',
      width: 40,
      className: 'dirent-thumbnail',
      children: null
    },
    {
      key: 'name',
      width: 120,
      className: 'dirent-property dirent-item-name',
      children: React.createElement(
        'span',
        {
          className: 'd-flex align-items-center table-sort-op cursor-pointer',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('name'); }
        },
        gettext('Name'),
        sortBy === 'name' && sortIcon
      )
    },
    ...(isColumnVisible(DIR_COLUMN_KEYS.SIZE) ? [{
      key: DIR_COLUMN_KEYS.SIZE,
      width: 100,
      className: 'dirent-property dirent-property-size',
      children: React.createElement(
        'span',
        {
          className: 'd-flex align-items-center table-sort-op cursor-pointer',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('size'); }
        },
        gettext('Size'),
        sortBy === 'size' && sortIcon
      )
    }] : []),
    ...(isColumnVisible(DIR_COLUMN_KEYS.MTIME) ? [{
      key: DIR_COLUMN_KEYS.MTIME,
      width: 120,
      className: 'dirent-property dirent-property-modified',
      children: React.createElement(
        'span',
        {
          className: 'd-flex align-items-center table-sort-op cursor-pointer',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('time'); }
        },
        gettext('Last modified'),
        sortBy === 'time' && sortIcon
      )
    }] : []),
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.FILE_MODIFIER) ? [{
      key: PRIVATE_COLUMN_KEY.FILE_MODIFIER,
      width: 120,
      className: 'dirent-property dirent-property-last-modifier',
      children: React.createElement(
        'span',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('file_modifier'); }
        },
        gettext('Last modifier'),
        sortBy === 'file_modifier' && sortIcon
      )
    }] : []),
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.FILE_CREATOR) ? [{
      key: PRIVATE_COLUMN_KEY.FILE_CREATOR,
      width: 120,
      className: 'dirent-property dirent-property-creator',
      children: React.createElement(
        'span',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('creator'); }
        },
        gettext('Creator'),
        sortBy === 'creator' && sortIcon
      )
    }] : []),
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.FILE_STATUS) ? [{
      key: PRIVATE_COLUMN_KEY.FILE_STATUS,
      width: 120,
      className: 'dirent-property dirent-property-status',
      children: React.createElement(
        'span',
        {},
        gettext('Status')
      )
    }] : []),
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.TAGS) ? [{
      key: PRIVATE_COLUMN_KEY.TAGS,
      width: 100,
      className: 'dirent-property dirent-property-tags',
      children: React.createElement(
        'span',
        {},
        gettext('Tags')
      )
    }] : []),
  ];

  return baseHeaders;
};
