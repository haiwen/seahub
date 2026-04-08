import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../../click-outside';
import Editor from './editor';
import { Utils } from '../../../../utils/utils';
import { EDITOR_CONTAINER as Z_INDEX_EDITOR_CONTAINER } from '../../constants/z-index';
import EventBus from '../../../common/event-bus';
import { checkIsColumnEditable, getColumnOriginName } from '../../utils/column';
import { checkCellValueChanged } from '../../utils/cell-comparer';
import { getCellValueByColumn, getColumnOptionNameById, getColumnOptionNamesByIds, getFileNameFromRecord } from '../../utils/cell';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { CellType, PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../../../metadata/constants';

const NOT_SUPPORT_EDITOR_COLUMN_TYPES = [
  CellType.CTIME, CellType.MTIME, CellType.CREATOR, CellType.LAST_MODIFIER, CellType.FILE_NAME,
];

const TAGS_EDITOR_WIDTH = 400;

class PopupEditorContainer extends React.Component {

  static displayName = 'PopupEditorContainer';

  constructor(props) {
    super(props);
    // editorPosition: DOM-based position for PopupEditor's style (left, top from bounding rect)
    // getSelectedDimensions: GRID-based position for TagsEditor customStyle (left, top, width, height)
    const { width, height, left, top, column, editorPosition } = this.props;
    const editorLeft = editorPosition?.left ?? left;
    const editorTop = editorPosition?.top ?? top;

    let additionalStyles = {};
    if (column.type === CellType.SINGLE_SELECT || column.type === CellType.MULTIPLE_SELECT) {
      additionalStyles = { width, height };
    }

    // Calculate final style position
    // For TAGS: apply horizontal offset to DOM-based editorPosition to align TagsEditor's left edge with cell's left edge
    let finalLeft = editorLeft;
    let finalTop = editorTop;
    if (column.type === CellType.TAGS) {
      finalLeft = editorLeft - (TAGS_EDITOR_WIDTH - column.width);
    }

    this.state = {
      isInvalid: false,
      style: {
        position: 'absolute',
        zIndex: Z_INDEX_EDITOR_CONTAINER,
        left: finalLeft,
        top: finalTop,
        width,
        height,
        ...additionalStyles
      }
    };
    this.eventBus = EventBus.getInstance();
    this.isClosed = false;
    this.changeCanceled = false;
  }

  changeCommitted = false;
  changeCanceled = false;
  editingRowId = this.props.record._id;

  componentDidUpdate(prevProps) {
    if (prevProps.scrollLeft !== this.props.scrollLeft || prevProps.scrollTop !== this.props.scrollTop) {
      this.commitCancel();
    }
  }

  componentWillUnmount() {
    if (!this.changeCommitted && !this.changeCanceled) {
      this.commit();
    }
  }

  setEditorRef = (editor) => {
    this.editor = editor;
  };

  computeTagsEditorCustomStyle = () => {
    // Only handle vertical positioning here (top/bottom)
    // Horizontal position is handled in constructor via style.left
    const { top, height } = this.props;
    const vh = window.innerHeight || 0;
    const spaceBelow = vh - (top + height);
    const spaceAbove = top;

    // Determine if TagsEditor should display above or below the cell
    // TagsEditor height is approximately 400px
    if (spaceBelow >= 400 || spaceBelow >= spaceAbove) {
      return { top: 0, bottom: 'auto' };
    }
    return { top: 'auto', bottom: '5px' };
  };

  createEditor = () => {
    const { column, record, height, onPressTab, editorPosition, columns, modifyColumnData, readOnly, operation, onSelectTag, onDeselectTag } = this.props;

    const computedReadOnly = readOnly !== undefined ? readOnly : !checkIsColumnEditable(column) || NOT_SUPPORT_EDITOR_COLUMN_TYPES.includes(column.type);

    if (column.type === CellType.GEOLOCATION) {
      const fileName = getFileNameFromRecord(record);
      if (!Utils.imageCheck(fileName)) {
        return null;
      }
    }

    const value = this.getInitialValue(computedReadOnly);

    let editorProps = {
      ref: this.setEditorRef,
      value: value,
      recordMetaData: this.getRecordMetaData(),
      onBlur: this.commit,
      onCommit: this.commit,
      onCommitData: this.commitData,
      onCommitCancel: this.commitCancel,
      onClose: this.closeEditor,
      onEscape: this.closeEditor,
      editorContainer: this.getEditorContainer(),
      modifyColumnData,
      editorPosition,
      editingRowId: this.editingRowId,
      record,
      height,
      columns,
      column,
      readOnly: computedReadOnly,
      onPressTab,
      operation,
    };

    // DATE: handle format
    if (column.type === CellType.DATE) {
      editorProps.format = column?.data?.format;
      if (column.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME) {
        // convert hh:mm:ss to hh:mm if exists
        editorProps.format = editorProps.format?.replace('HH:mm:ss', 'HH:mm');
      }
    }

    // TAGS: handle canEditData and canAddTag
    if (column.type === CellType.TAGS) {
      const customStyle = this.computeTagsEditorCustomStyle();
      editorProps = {
        customStyle, // Put customStyle first so it won't be overwritten
        ...editorProps,
        onSelect: onSelectTag,
        onDeselect: onDeselectTag,
        canEditData: this.props.canEditData,
        canAddTag: !readOnly,
        column: {
          ...column,
          width: TAGS_EDITOR_WIDTH,
        },
      };
    }

    return (
      <Editor ref={this.setEditorRef} {...editorProps} />
    );
  };

  getEditorContainer = () => {
    const { column } = this.props;
    if (column.type === CellType.DATE) return document.body;
    return null;
  };

  getRecordMetaData = () => {
    // clone row data so editor cannot actually change this
    // convention based method to get corresponding Id or Name of any Name or Id property
    if (typeof this.props.column.getRecordMetaData === 'function') {
      const { record, column } = this.props;
      return this.props.column.getRecordMetaData(record, column);
    }
  };

  getEditor = () => {
    return this.editor;
  };

  getInitialValue = (readOnly) => {
    const { firstEditorKeyDown: key, value, column } = this.props;
    if (key === 'Enter') {
      return value;
    }
    // LONG_TEXT: special handling for space key and readOnly
    if (column.type === CellType.LONG_TEXT) {
      if (key === ' ') return value;
      return readOnly ? value : key || value;
    }
    return key || value;
  };

  getOldRowData = (originalOldCellValue) => {
    const { column } = this.props;
    const columnName = getColumnOriginName(column);
    const { key: columnKey } = column;
    let oldValue = originalOldCellValue;
    if (this.getEditor() && this.getEditor().getOldValue) {
      const original = this.getEditor().getOldValue();
      oldValue = original[Object.keys(original)[0]];
    }
    const oldRowData = { [columnName]: oldValue };
    const originalOldRowData = { [columnKey]: originalOldCellValue }; // { [column.key]: cellValue }
    return { oldRowData, originalOldRowData };
  };

  // The input area in the interface loses focus. Use this.getEditor().getValue() to get data.
  commit = () => {
    const { record, column } = this.props;
    if (!record || !record._id) return;
    const editor = this.getEditor();
    if (!editor) return;

    if (column.type === CellType.GEOLOCATION) {
      if (editor.getValue) {
        const geolocationValue = editor.getValue();
        const { position, location_translated } = geolocationValue || { position: null, location_translated: null };
        const updated = { [column.key]: position };
        updated[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = location_translated;
        this.commitData(updated, true);
      }
      if (editor.onClose) {
        editor.onClose();
      }
      return;
    }

    let newValue = editor.getValue();
    const { key: columnKey, type: columnType } = column;

    // DATE: handle time format conversion for CAPTURE_TIME
    if (columnType === CellType.DATE && columnKey === PRIVATE_COLUMN_KEY.CAPTURE_TIME && typeof newValue === 'string') {
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(newValue)) {
        newValue = newValue + ':00';
      }
    }

    let updated = columnType === CellType.DATE ? { [columnKey]: newValue } : newValue;
    if (columnType === CellType.SINGLE_SELECT) {
      updated[columnKey] = newValue[columnKey] ? getColumnOptionNameById(column, newValue[columnKey]) : '';
    } else if (columnType === CellType.MULTIPLE_SELECT) {
      updated[columnKey] = newValue[columnKey] ? getColumnOptionNamesByIds(column, newValue[columnKey]) : [];
    }

    this.commitData(updated, columnType !== CellType.LONG_TEXT);
  };

  // This is the updated data obtained by manually clicking the button
  commitData = (updated, closeEditor = false) => {
    const { onCommit, column, record } = this.props;
    const { key: columnKey, type: columnType, name: columnName } = column;
    const originalOldCellValue = getCellValueByColumn(record, column);
    let originalUpdates = { ...updated };

    // GEOLOCATION: check both position and translated location
    let hasChanged;
    if (columnType === CellType.GEOLOCATION) {
      const currentLocation = originalOldCellValue;
      const newLocation = originalUpdates[columnKey];
      const currentTranslated = record[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];
      const newTranslated = originalUpdates[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];

      hasChanged = checkCellValueChanged(currentLocation, newLocation) ||
                  (currentTranslated !== newTranslated);
    } else {
      hasChanged = checkCellValueChanged(originalOldCellValue, originalUpdates[columnKey]);
    }
    if (!hasChanged || !this.isNewValueValid(updated)) {
      if (closeEditor && typeof this.editor?.onClose === 'function') {
        this.editor.onClose();
      }
      this.isClosed = true;
      this.props.onCommitCancel();
      return;
    }

    this.changeCommitted = true;
    const rowId = record._id;

    let updates;
    if (columnType === CellType.GEOLOCATION) {
      updates = {};
      const locationValue = updated[columnKey];
      if (PRIVATE_COLUMN_KEYS.includes(columnKey)) {
        updates[columnKey] = locationValue;
      } else {
        updates[columnName] = locationValue;
      }
      updates[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = updated[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];
    } else {
      const key = Object.keys(updated)[0];
      const value = updated[key];
      updates = PRIVATE_COLUMN_KEYS.includes(columnKey) ? { [columnKey]: value } : { [columnName]: value };
    }
    const { oldRowData, originalOldRowData } = this.getOldRowData(originalOldCellValue);

    // updates used for update remote record data
    // originalUpdates used for update local record data
    // oldRowData ues for undo/undo modify record
    // originalOldRowData ues for undo/undo modify record
    onCommit({ rowId, cellKey: columnKey, updates, originalUpdates, oldRowData, originalOldRowData }, closeEditor);
  };

  commitCancel = () => {
    this.changeCanceled = true;
    this.props.onCommitCancel();
  };

  isNewValueValid = (value) => {
    if (this.getEditor() && Utils.isFunction(this.getEditor().validate)) {
      const isValid = this.getEditor().validate(value);
      this.setState({ isInvalid: !isValid });
      return isValid;
    }
    return true;
  };

  handleRightClick = (e) => {
    e.stopPropagation();
  };

  closeEditor = (isEscapeKeydown) => {
    // DATE: only close on escape keydown, not on blur/click outside
    const { column } = this.props;
    if (column.type === CellType.DATE && !isEscapeKeydown) return null;
    !this.isClosed && this.onClickOutside(isEscapeKeydown);
  };

  onClickOutside = (isEscapeKeydown) => {
    this.isClosed = true;
    this.commit();
    this.props.onCommitCancel();
    !isEscapeKeydown && this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  };

  render() {
    return (
      <ClickOutside onClickOutside={this.onClickOutside}>
        <div
          style={this.state.style}
          className={classnames({ 'has-error': this.state.isInvalid === true })}
          onContextMenu={this.handleRightClick}
          ref={this.props.innerRef}
        >
          {this.createEditor()}
        </div>
      </ClickOutside>
    );
  }
}

PopupEditorContainer.propTypes = {
  firstEditorKeyDown: PropTypes.string,
  openEditorMode: PropTypes.string,
  columns: PropTypes.array,

  // position info
  editorPosition: PropTypes.object,
  width: PropTypes.number,
  height: PropTypes.number,
  left: PropTypes.number,
  top: PropTypes.number,
  scrollLeft: PropTypes.number,
  scrollTop: PropTypes.number,

  record: PropTypes.object,
  column: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object, PropTypes.bool, PropTypes.array]),

  onGridKeyDown: PropTypes.func,
  onCommit: PropTypes.func,
  onCommitCancel: PropTypes.func,
  innerRef: PropTypes.func,
  onPressTab: PropTypes.func,
};

export default PopupEditorContainer;
