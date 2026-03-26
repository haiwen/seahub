import { CellType, COLUMNS_ICON_CONFIG, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '@/metadata/constants';
import TextFormatter from '@/metadata/components/cell-formatter/text';
import Empty from '@/metadata/components/formatter/empty';
import NumberFormatter from '@/metadata/components/cell-formatter/number';
import DateFormatter from '@/metadata/components/cell-formatter/date';
import MultipleSelectFormatter from '@/metadata/components/cell-formatter/multiple-select';
import SingleSelectFormatter from '@/metadata/components/cell-formatter/single-select';
import CheckboxFormatter from '@/metadata/components/cell-formatter/checkbox';
import GeolocationFormatter from '@/metadata/components/cell-formatter/geolocation';
import LongTextFormatter from '@/metadata/components/cell-formatter/long-text';
import RateFormatter from '@/metadata/components/cell-formatter/rate';
import FileName from '@/metadata/components/cell-formatter/file-name';
import TagsFormatterWrapper from './formatter/tags';
import Creator from './formatter/creator';
import FileNameEditor from '@/metadata/components/cell-editors/file-name-editor';
import CollaboratorsFormatter from './formatter/collaborators';
import CTimeFormatterWrapper from './formatter/time';
import { DateEditorWrapper, TagsEditorWrapper, CollaboratorEditorWrapper } from './editor';
import CheckboxEditor from '@/metadata/components/cell-editors/checkbox-editor';
import RateEditor from '@/metadata/components/cell-editors/rate-editor';
import LongTextEditor from '@/metadata/components/cell-editors/long-text-editor';
import SimpleTextEditor from '@/metadata/components/cell-editors/text-editor';
import NumberEditor from '@/metadata/components/cell-editors/number-editor';
import SingleSelectEditor from '@/metadata/components/cell-editors/single-select-editor';
import MultipleSelectEditor from '@/metadata/components/cell-editors/multiple-select-editor';
import { getFileNameFromRecord, getRecordIdFromRecord } from '@/metadata/utils/cell';

export const EDITABLE_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
  PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
  PRIVATE_COLUMN_KEY.FILE_REVIEWER,
  PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
  PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
  PRIVATE_COLUMN_KEY.CAPTURE_TIME,
  PRIVATE_COLUMN_KEY.OWNER,
  PRIVATE_COLUMN_KEY.FILE_RATE,
  PRIVATE_COLUMN_KEY.TAGS,
];

export const EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
  PRIVATE_COLUMN_KEY.FILE_STATUS,
  PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
  PRIVATE_COLUMN_KEY.FILE_REVIEWER,
  PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
  PRIVATE_COLUMN_KEY.FILE_DESCRIPTION,
  PRIVATE_COLUMN_KEY.CAPTURE_TIME,
  PRIVATE_COLUMN_KEY.OWNER,
  PRIVATE_COLUMN_KEY.FILE_RATE,
  PRIVATE_COLUMN_KEY.TAGS,
];

export const POPUP_EDITOR_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_STATUS,
  PRIVATE_COLUMN_KEY.FILE_COLLABORATORS,
  PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME,
  PRIVATE_COLUMN_KEY.TAGS,
];

export const SUPPORT_PREVIEW_COLUMN_KEYS = [
  PRIVATE_COLUMN_KEY.FILE_NAME,
];

const DEFAULT_NAME_COLUMN_WIDTH = 200;
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

const createColumnFormatter = ({ repoID, record, column, value, queryUserAPI, tagsData, onFileNameClick, onDirentMetadata, ...otherProps }) => {
  const { type } = column;
  const className = `sf-metadata-${type}-formatter`;
  const rowID = getRecordIdFromRecord(record);
  const name = getFileNameFromRecord(record);

  switch (type) {
    case CellType.FILE_NAME: {
      return (
        <FileName repoID={repoID} record={record} value={value} onFileNameClick={onFileNameClick} className={className} />
      );
    }
    case CellType.TEXT: {
      return (
        <TextFormatter value={value} className={className} >
          <Empty fieldType={type} placeholder='' />
        </TextFormatter>
      );
    }
    case CellType.NUMBER: {
      return (
        <NumberFormatter value={value} formats={column?.data} className={className} >
          <Empty fieldType={type} placeholder='' />
        </NumberFormatter>
      );
    }
    case CellType.CTIME:
    case CellType.MTIME: {
      return (
        <CTimeFormatterWrapper value={value} className={className} {...otherProps} />
      );
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      return (
        <Creator record={record} value={value} className={className} >
          <Empty fieldType={type} placeholder='' />
        </Creator>
      );
    }
    case CellType.DATE: {
      return (
        <DateFormatter value={value} format={column.data?.format} className={className} >
          <Empty fieldType={type} placeholder='' />
        </DateFormatter>
      );
    }
    case CellType.SINGLE_SELECT: {
      return (
        <SingleSelectFormatter value={value} options={column.data?.options || []} className={className} >
          <Empty fieldType={type} placeholder='' />
        </SingleSelectFormatter>
      );
    }
    case CellType.MULTIPLE_SELECT: {
      return (
        <MultipleSelectFormatter value={value} options={column.data?.options || []} className={className} >
          <Empty fieldType={type} placeholder='' />
        </MultipleSelectFormatter>
      );
    }
    case CellType.COLLABORATOR: {
      return (
        <CollaboratorsFormatter value={value} className={className} {...otherProps}>
          <Empty fieldType={type} placeholder='' />
        </CollaboratorsFormatter>
      );
    }
    case CellType.CHECKBOX: {
      if (column.editable) {
        return (
          <CheckboxEditor value={value} field={column} onChange={(update) => onDirentMetadata(rowID, name, update)} />
        );
      }
      return (
        <CheckboxFormatter value={value} className={className} >
          <Empty fieldType={type} placeholder='' />
        </CheckboxFormatter>
      );
    }
    case CellType.GEOLOCATION: {
      return (
        <GeolocationFormatter {...otherProps} format={column.data?.geo_format} value={value} className={className} >
          <Empty fieldType={type} placeholder='' />
        </GeolocationFormatter>
      );
    }
    case CellType.LONG_TEXT: {
      return (
        <LongTextFormatter {...otherProps} value={value} className={className} >
          <Empty fieldType={type} placeholder='' />
        </LongTextFormatter>
      );
    }
    case CellType.RATE: {
      if (column.editable) {
        return (
          <RateEditor value={value} field={column} onChange={(update) => onDirentMetadata(rowID, name, update)} />
        );
      }
      return (
        <RateFormatter value={value} data={column?.data} className={className} >
          <Empty fieldType={type} placeholder='' />
        </RateFormatter>
      );
    }
    case CellType.TAGS: {
      return (
        <TagsFormatterWrapper value={value} className={className} {...otherProps} >
          <Empty fieldType={type} placeholder='' />
        </TagsFormatterWrapper>
      );
    }
    default: {
      return (
        <TextFormatter value={value} className={className} >
          <Empty fieldType={type} placeholder='' />
        </TextFormatter>
      );
    }
  }
};

const createColumnEditor = ({ column, repoID, repoInfo, tableData, onDirentMetadata, columns, ...editorProps }) => {
  switch (column.type) {
    case CellType.FILE_NAME:
      return <FileNameEditor repoID={repoID} repoInfo={repoInfo} table={tableData} />;
    case CellType.TEXT:
      return <SimpleTextEditor column={column} {...editorProps} />;
    case CellType.LONG_TEXT:
      return <LongTextEditor repoID={repoID} repoInfo={repoInfo} column={column} />;
    case CellType.DATE:
      return <DateEditorWrapper column={column} columns={columns} {...editorProps} />;
    case CellType.NUMBER:
      return <NumberEditor column={column} {...editorProps} />;
    case CellType.SINGLE_SELECT:
      return <SingleSelectEditor column={column} columns={columns} {...editorProps} />;
    case CellType.MULTIPLE_SELECT:
      return <MultipleSelectEditor column={column} columns={columns} {...editorProps} />;
    case CellType.COLLABORATOR:
      return <CollaboratorEditorWrapper column={column} {...editorProps} />;
    case CellType.TAGS:
      return <TagsEditorWrapper repoID={repoID} column={column} columns={columns} onDirentMetadata={onDirentMetadata} {...editorProps} />;
    default:
      return null;
  }
};

const createDirentTableColumns = (columns, hiddenColumnKeys = [], { ...otherProps }) => {
  const savedWidths = getDirTableColumnWidths();
  const visibleColumns = columns.filter(col => !hiddenColumnKeys.includes(col.key));

  return visibleColumns.map(column => {
    const { key, name, type } = column;
    const display_name = name;
    const icon_name = COLUMNS_ICON_CONFIG[type];
    const formatter = createColumnFormatter({ column, ...otherProps });
    const is_private = PRIVATE_COLUMN_KEYS.includes(key);
    let editable = true;
    if (is_private) {
      editable = EDITABLE_COLUMN_KEYS.includes(key);
    }
    const editable_via_click_cell = is_private && EDITABLE_VIA_CLICK_CELL_COLUMNS_KEYS.includes(key) || true;
    const editor = editable && createColumnEditor({ column, ...otherProps });
    const is_popup_editor = is_private && POPUP_EDITOR_COLUMN_KEYS.includes(key) || false;

    // Apply saved width or use default
    const savedWidth = savedWidths[key];
    if (savedWidth) {
      column.width = savedWidth;
    } else if (!column.width) {
      // Use default width based on column type
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
