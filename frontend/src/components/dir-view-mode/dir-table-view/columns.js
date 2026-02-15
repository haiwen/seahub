import { gettext } from '@/utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '@/metadata/constants';
import { NameFormatter, SizeFormatter, LastModifiedFormatter, Creator, StatusFormatter } from './formatter';
import { DIR_COLUMN_KEYS } from '@/constants/dir-column-visibility';
import { StatusEditor } from './editor';
import FileNameEditor from '@/metadata/components/cell-editors/file-name-editor';

export const EDITABLE_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

export const EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

export const POPUP_EDITOR_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_STATUS,
];

export const SUPPORT_PREVIEW_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
];

const DEFAULT_NAME_COLUMN_WIDTH = 200;
const DEFAULT_COLUMN_WIDTH = 200;

const DIR_TABLE_COLUMNS_WIDTH_KEY = 'dir_table_columns_width';

export const getDirTableColumnWidths = () => {
  try {
    const savedWidths = localStorage.getItem(DIR_TABLE_COLUMNS_WIDTH_KEY);
    return savedWidths ? JSON.parse(savedWidths) : {};
  } catch (err) {
    return {};
  }
};

export const setDirTableColumnWidth = (columnKey, width) => {
  try {
    const savedWidths = getDirTableColumnWidths();
    savedWidths[columnKey] = width;
    localStorage.setItem(DIR_TABLE_COLUMNS_WIDTH_KEY, JSON.stringify(savedWidths));
  } catch (err) {
    // Ignore errors
  }
};

const createColumnFormatter = ({ column, ...otherProps }) => {
  const { key } = column;
  switch (key) {
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      const { repoID, onItemClick } = otherProps;
      return <NameFormatter repoID={repoID} onItemClick={onItemClick} />;
    case PRIVATE_COLUMN_KEY.SIZE:
      return <SizeFormatter />;
    case DIR_COLUMN_KEYS.MTIME:
      return <LastModifiedFormatter />;
    case PRIVATE_COLUMN_KEY.FILE_CREATOR:
    case PRIVATE_COLUMN_KEY.FILE_MODIFIER:
      return <Creator />;
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      return <StatusFormatter />;
    default:
      return null;
  }
};

const createColumnEditor = ({ column, repoID, repoInfo, tableData, updateDirentStatus }) => {
  switch (column.key) {
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      return <FileNameEditor repoID={repoID} repoInfo={repoInfo} table={tableData} />;
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      return <StatusEditor onDirentStatus={updateDirentStatus} />;
    default:
      return null;
  }
};

const createDirentTableColumns = (columns, hiddenColumnKeys = [], { ...otherProps }) => {
  const savedWidths = getDirTableColumnWidths();
  const visibleColumns = columns.filter(col => !hiddenColumnKeys.includes(col.key));
  const allColumns = [
    {
      key: PRIVATE_COLUMN_KEY.FILE_NAME,
      name: gettext('Name'),
      display_name: gettext('Name'),
      type: CellType.TEXT,
      width: savedWidths[PRIVATE_COLUMN_KEY.FILE_NAME] || DEFAULT_NAME_COLUMN_WIDTH,
      frozen: true,
      editable: true,
      resizable: true,
      is_name_column: true,
    },
    ...visibleColumns,
  ];

  return allColumns.map(column => {
    const { key, name, type } = column;
    const display_name = name;
    const icon_name = COLUMNS_ICON_CONFIG[type];
    const formatter = createColumnFormatter({ column, ...otherProps });
    const is_private = PRIVATE_COLUMN_KEYS.includes(key);
    const editable = is_private && (EDITABLE_COLUMN_KEYS.includes(key) || column.editable);
    const editable_via_click_cell = is_private && EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS.includes(key);
    const editor = editable && createColumnEditor({ column, ...otherProps });
    const is_popup_editor = is_private && POPUP_EDITOR_COLUMN_KEYS.includes(key);

    // Apply saved width or use default
    const savedWidth = savedWidths[key];
    if (savedWidth) {
      column.width = savedWidth;
    } else if (!column.width) {
      // Use default width based on column type
      column.width = key === PRIVATE_COLUMN_KEY.FILE_NAME ? DEFAULT_NAME_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH;
    }

    let normalizedColumn = { ...column, is_private, editable };
    if (editable_via_click_cell) {
      normalizedColumn.editable_via_click_cell = editable_via_click_cell;
    }
    if (formatter) {
      normalizedColumn.formatter = formatter;
    }
    if (editable) {
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
    return normalizedColumn;
  });
};

export { createDirentTableColumns };
