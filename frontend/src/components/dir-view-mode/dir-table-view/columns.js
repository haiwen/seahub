import { gettext } from '@/utils/constants';
import { CellType, COLUMNS_ICON_CONFIG, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '@/metadata/constants';
import { NameFormatter, SizeFormatter, LastModifiedFormatter, Creator, StatusFormatter } from './formatter';
import { DIR_COLUMN_KEYS } from '@/constants/dir-column-visibility';
import { StatusEditor, FileNameEditor } from './editor';

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

const createColumnFormatter = ({ column, otherProps }) => {
  const { key } = column;
  switch (key) {
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      const { repoID } = otherProps;
      return <NameFormatter repoID={repoID} />;
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

const createColumnEditor = ({ column, otherProps }) => {
  switch (column.key) {
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      const { repoID, repoInfo, tableData, onDirentChange } = otherProps;
      return <FileNameEditor repoID={repoID} repoInfo={repoInfo} table={tableData} onDirentChange={onDirentChange} {...otherProps} />;
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      const { onDirentStatus } = otherProps;
      return <StatusEditor onDirentStatus={onDirentStatus} />;
    default:
      return null;
  }
};

const createDirentTableColumns = (columns, otherProps) => {
  const allColumns = [
    {
      key: PRIVATE_COLUMN_KEY.FILE_NAME,
      name: gettext('Name'),
      display_name: gettext('Name'),
      type: CellType.TEXT,
      width: 200,
      frozen: true,
      editable: true,
      resizable: true,
      is_name_column: true,
    },
    ...columns,
  ];

  return allColumns.map(column => {
    const { key, name, type } = column;
    const display_name = name;
    const icon_name = COLUMNS_ICON_CONFIG[type];
    const formatter = createColumnFormatter({ column, otherProps });
    const is_private = PRIVATE_COLUMN_KEYS.includes(key);
    const editable = is_private && (EDITABLE_COLUMN_KEYS.includes(key) || column.editable);
    const editable_via_click_cell = is_private && EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS.includes(key);
    const editor = editable && createColumnEditor({ column, otherProps });
    const is_popup_editor = is_private && POPUP_EDITOR_COLUMN_KEYS.includes(key);
    const is_support_preview = SUPPORT_PREVIEW_COLUMN_KEYS.includes(key);

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
    // if (is_support_preview) {
    //   normalizedColumn.is_support_preview = is_support_preview;
    // }
    return normalizedColumn;
  });
};

export { createDirentTableColumns };
