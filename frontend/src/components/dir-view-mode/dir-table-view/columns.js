import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '@/metadata/constants';
import CellFormatter from '@/metadata/components/cell-formatter';
import Editor from '@/metadata/components/cell-editors/editor';
import { EDITABLE_PRIVATE_COLUMN_KEYS, EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS } from '@/metadata/constants/column/private';
import { POPUP_EDITOR_COLUMN_TYPES } from '@/metadata/constants/column/type';

export const SUPPORT_PREVIEW_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
];

const DEFAULT_NAME_COLUMN_WIDTH = 250;
const DEFAULT_COLUMN_WIDTH = 200;

const DIR_TABLE_COLUMNS_WIDTH_KEY = 'sf_dir_table_columns_width';
const DIR_TABLE_COLUMNS_ORDER_KEY = 'sf_dir_table_columns_order';

export const getDirTableColumnWidths = () => {
  try {
    const savedWidths = localStorage.getItem(DIR_TABLE_COLUMNS_WIDTH_KEY);
    return savedWidths ? JSON.parse(savedWidths) : {};
  } catch (err) {
    return {};
  }
};

export const setDirTableColumnWidth = (columnKey, width) => {
  const savedWidths = getDirTableColumnWidths();
  savedWidths[columnKey] = width;
  localStorage.setItem(DIR_TABLE_COLUMNS_WIDTH_KEY, JSON.stringify(savedWidths));
};

export const getDirTableColumnOrder = () => {
  const savedOrder = localStorage.getItem(DIR_TABLE_COLUMNS_ORDER_KEY);
  return savedOrder ? JSON.parse(savedOrder) : null;
};

export const setDirTableColumnOrder = (columnKeys) => {
  if (!Array.isArray(columnKeys) || !columnKeys.every(key => typeof key === 'string')) return;
  localStorage.setItem(DIR_TABLE_COLUMNS_ORDER_KEY, JSON.stringify(columnKeys));
};

export const createDirentTableColumns = (repoID, repoInfo, columns, onItemClick) => {
  const savedWidths = getDirTableColumnWidths();

  return columns.map(column => {
    const { key, name, type } = column;
    const display_name = name;
    const icon_name = COLUMNS_ICON_CONFIG[type];

    const formatter = <CellFormatter repoID={repoID} column={column} onItemClick={onItemClick} />;
    const editor = <Editor repoID={repoID} repoInfo={repoInfo} />;

    const is_private = PRIVATE_COLUMN_KEYS.includes(key);
    let editable = true;
    if (is_private) {
      editable = EDITABLE_PRIVATE_COLUMN_KEYS.includes(key);
    }
    const editable_via_click_cell = is_private && EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS.includes(key) || false;
    const is_popup_editor = is_private && POPUP_EDITOR_COLUMN_TYPES.includes(type) || false;
    const is_support_preview = is_private && SUPPORT_PREVIEW_COLUMN_KEYS.includes(key) || false;
    const icon_tooltip = COLUMNS_ICON_NAME[column.type] || 'Text';

    const savedWidth = savedWidths[key];
    if (savedWidth) {
      column.width = savedWidth;
    } else {
      column.width = key === PRIVATE_COLUMN_KEY.FILE_NAME ? DEFAULT_NAME_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;
    }

    let normalizedColumn = { ...column, is_private, editable, type: type };
    if (editable_via_click_cell) {
      normalizedColumn.editable_via_click_cell = editable_via_click_cell;
    }
    if (formatter) {
      normalizedColumn.formatter = formatter;
    }
    if (editable) {
      normalizedColumn.editable = editable;
      normalizedColumn.editor = editor;
    }
    if (icon_name) {
      normalizedColumn.icon_name = icon_name;
    }
    if (display_name) {
      normalizedColumn.display_name = display_name;
    }
    if (is_popup_editor) {
      normalizedColumn.is_popup_editor = is_popup_editor;
    }
    if (is_support_preview) {
      normalizedColumn.is_support_preview = is_support_preview;
    }
    if (icon_tooltip) {
      normalizedColumn.icon_tooltip = icon_tooltip;
    }
    return normalizedColumn;
  });
};
