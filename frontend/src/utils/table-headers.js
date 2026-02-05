import React from 'react';
import { gettext } from './constants';
import Icon from '../components/icon';
import { DIR_COLUMN_KEYS } from '../constants/dir-column-visibility';
import { COLUMN_CONFIG } from '../components/dirent-list-view/column-config';
import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';

export const createTableHeaders = (
  sortOptions = {},
  selectionOptions = {},
  visibleColumnKeys = []
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
    return visibleColumnKeys.includes(columnKey);
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
    ...(isColumnVisible(DIR_COLUMN_KEYS.SIZE) ? [{
      key: DIR_COLUMN_KEYS.SIZE,
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
    ...(isColumnVisible(DIR_COLUMN_KEYS.MTIME) ? [{
      key: DIR_COLUMN_KEYS.MTIME,
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
        gettext('Last update'),
        sortBy === 'time' && sortIcon
      )
    }] : []),
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.FILE_CREATOR) ? [{
      key: PRIVATE_COLUMN_KEY.FILE_CREATOR,
      width: COLUMN_CONFIG.file_creator.width,
      className: COLUMN_CONFIG.file_creator.className,
      minWidth: COLUMN_CONFIG.file_creator.width,
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
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.FILE_MODIFIER) ? [{
      key: PRIVATE_COLUMN_KEY.LAST_MODIFIER,
      width: COLUMN_CONFIG.file_modifier.width,
      className: COLUMN_CONFIG.file_modifier.className,
      minWidth: COLUMN_CONFIG.file_modifier.width,
      children: React.createElement(
        'a',
        {
          className: 'd-flex align-items-center table-sort-op',
          href: '#',
          onClick: (e) => { e.preventDefault(); onSort && onSort('last_modifier'); }
        },
        gettext('Last modifier'),
        sortBy === 'last_modifier' && sortIcon
      )
    }] : []),
    ...(isColumnVisible(PRIVATE_COLUMN_KEY.FILE_STATUS) ? [{
      key: PRIVATE_COLUMN_KEY.FILE_STATUS,
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
