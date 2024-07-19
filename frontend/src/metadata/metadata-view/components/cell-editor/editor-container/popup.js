import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { ClickOutside } from '@seafile/sf-metadata-ui-component';
import { CellType, isFunction, Z_INDEX, getCellValueByColumn } from '../../../_basic';
import { isCellValueChanged } from '../../../utils/cell-comparer';
import { EVENT_BUS_TYPE } from '../../../constants';
import Editor from '../editor';
import { canEdit } from '../../../utils/column-utils';

const NOT_SUPPORT_EDITOR_COLUMN_TYPES = [
  CellType.CTIME, CellType.MTIME, CellType.CREATOR, CellType.LAST_MODIFIER,
  CellType.FILE_NAME, CellType.COLLABORATOR, CellType.LONG_TEXT, CellType.SINGLE_SELECT,
];

class PopupEditorContainer extends React.Component {

  static displayName = 'PopupEditorContainer';

  constructor(props) {
    super(props);
    const { column, width, height, left, top } = this.props;
    let additionalStyles = {};
    if (column.type === CellType.SINGLE_SELECT) {
      additionalStyles = { width, height };
    }
    this.state = {
      isInvalid: false,
      style: {
        position: 'absolute',
        zIndex: Z_INDEX.EDITOR_CONTAINER,
        left,
        top,
        ...additionalStyles
      }
    };
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

  createEditor = () => {
    const { column, record, height, onPressTab, editorPosition, columns } = this.props;
    const readOnly = canEdit(column, record, true) || NOT_SUPPORT_EDITOR_COLUMN_TYPES.includes(column.type);
    const value = this.getInitialValue(readOnly);

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
      editorPosition,
      record,
      height,
      columns,
      column,
      readOnly,
      onPressTab,
    };

    if (column.type === CellType.DATE) {
      editorProps.format = column?.data?.format;
    }

    return (<Editor { ...editorProps } />);
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
    const { firstEditorKeyDown: key, value } = this.props;
    if (key === 'Enter') {
      return value;
    }
    const { column } = this.props;
    if (column.type === CellType.LONG_TEXT) {
      if (key === ' ') return value;
      return readOnly ? value : key || value;
    }
    return value;
  };

  getOldRowData = (originalOldCellValue) => {
    const { column } = this.props;
    const { key: columnKey, name: columnName, type: columnType } = column;
    let oldRowData;
    if (this.getEditor().getOldValue) {
      const original = this.getEditor().getOldValue();
      oldRowData = { [columnName]: original[Object.keys(original)[0]] } ;
    } else {
      oldRowData = { [columnName]: originalOldCellValue };
    }
    // long-text cell value need format to {text: '', links: [], ...}
    if (columnType === CellType.LONG_TEXT) {
      const original = this.getEditor().getValue();
      oldRowData = { [columnName]: original };
    }
    const originalOldRowData = { [columnKey]: originalOldCellValue }; // { [column.key]: cellValue }
    return { oldRowData, originalOldRowData };
  };

  // The input area in the interface loses focus. Use this.getEditor().getValue() to get data.
  commit = () => {
    const { onCommit, column, record } = this.props;
    if (!record._id) return;
    const { key: columnKey, type: columnType, name: columnName } = column;
    const originalOldCellValue = record[columnKey];
    const newValue = this.getEditor().getValue();
    const updated = columnType === CellType.DATE ? { [columnKey]: newValue } : newValue;
    let originalUpdates = { ...updated };
    if (
      !isCellValueChanged(originalOldCellValue, originalUpdates[columnKey], columnType) ||
      !this.isNewValueValid(updated)
    ) {
      if (typeof this.editor.onClose === 'function') {
        this.editor.onClose();
      }
      return;
    }
    this.changeCommitted = true;
    const rowId = record._id;
    const key = Object.keys(updated)[0];
    const value = updated[key];
    const updates = { [columnName]: value };

    // special treatment of long-text column types to keep the stored data consistent
    if (columnType === CellType.LONG_TEXT) {
      originalUpdates[key] = value.text;
    }
    const { oldRowData, originalOldRowData } = this.getOldRowData(originalOldCellValue);

    // updates used for update remote record data
    // originalUpdates used for update local record data
    // oldRowData ues for undo/undo modify record
    // originalOldRowData ues for undo/undo modify record
    onCommit({ rowId, cellKey: columnKey, updates, originalUpdates, oldRowData, originalOldRowData });
  };

  // This is the updated data obtained by manually clicking the button
  commitData = (updated) => {
    if (!this.isNewValueValid(updated)) {
      return;
    }
    this.changeCommitted = true;
    const { onCommit, record, column } = this.props;
    const { key: columnKey, type: columnType, name: columnName } = column;
    const rowId = record._id;
    const originalOldCellValue = getCellValueByColumn(record, column);
    let originalUpdates = { ...updated };
    const key = Object.keys(updated)[0];
    const value = updated[key];
    const updates = { [columnName]: value };

    // special treatment of long-text column types to keep the stored data consistent
    if (columnType === CellType.LONG_TEXT) {
      originalUpdates[key] = value.text;
    }
    const { oldRowData, originalOldRowData } = this.getOldRowData(originalOldCellValue);
    onCommit({ rowId, cellKey: columnKey, updates, originalUpdates, oldRowData, originalOldRowData }, false);
  };

  commitCancel = () => {
    this.changeCanceled = true;
    this.props.onCommitCancel();
  };

  isNewValueValid = (value) => {
    if (isFunction(this.getEditor().validate)) {
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
    const { column } = this.props;
    if (column.type === CellType.DATE && !isEscapeKeydown) return null;
    return this.onClickOutside;
  };

  onClickOutside = (isEscapeKeydown) => {
    this.commit();
    this.props.onCommitCancel();
    !isEscapeKeydown && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
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
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.object, PropTypes.bool]),

  onGridKeyDown: PropTypes.func,
  onCommit: PropTypes.func,
  onCommitCancel: PropTypes.func,
  innerRef: PropTypes.func,
  onPressTab: PropTypes.func,
};

export default PopupEditorContainer;

