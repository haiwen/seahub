import React from 'react';
import { gettext } from './constants';
import Icon from '../components/icon';

// 表格列最小宽度配置
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

/**
 * 创建表格头部配置
 * @param {string} mode - 模式 ('desktop' | 'mobile')
 * @param {Object} sortOptions - 排序选项
 * @param {Object} sortOptions.sortBy - 当前排序字段
 * @param {string} sortOptions.sortOrder - 排序顺序 ('asc' | 'desc')
 * @param {Function} sortOptions.onSort - 排序处理函数
 * @param {Object} selectionOptions - 选择选项
 * @param {boolean} selectionOptions.isAllSelected - 是否全选
 * @param {Function} selectionOptions.onAllItemSelected - 全选处理函数
 * @param {boolean} selectionOptions.isPartiallySelected - 是否部分选择
 * @returns {Array} 表格头部配置数组
 */
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

  // 移动端只显示必要列（保持与原有代码兼容的简单结构）
  if (mode === 'mobile') {
    return [
      { isFixed: false, width: 0.12 },
      { isFixed: false, width: 0.8 },
      { isFixed: false, width: 0.08 },
    ];
  }

  return baseHeaders;
};

/**
 * 计算列宽（简化版）
 * @param {Array} headers - 表头配置
 * @param {number} containerWidth - 容器宽度
 * @returns {Object} 计算结果 { columns, gridTemplate, totalWidth }
 */
export const calculateResponsiveColumns = (headers, containerWidth) => {
  if (!headers?.length || !containerWidth) {
    return { columns: [], gridTemplate: '', totalWidth: 0 };
  }

  // Calculate fixed column widths first
  const fixedWidth = headers.reduce((sum, header) => {
    return header.isFixed ? sum + header.width : sum;
  }, 0);

  // Calculate remaining space for non-fixed columns
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
