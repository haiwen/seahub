import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../../click-outside';
import Editor from './editor';
import { Utils } from '../../../../utils/utils';
import { EDITOR_CONTAINER as Z_INDEX_EDITOR_CONTAINER } from '../../constants/z-index';
import EventBus from '../../../common/event-bus';
import { checkIsPrivateColumn, getColumnOriginName } from '../../utils/column';
import { checkCellValueChanged } from '../../utils/cell-comparer';
import { getCellValueByColumn } from '../../utils/cell';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { CellType } from '../../../../metadata/constants';

class PopupEditorContainer extends React.Component {

  static displayName = 'PopupEditorContainer';

  constructor(props) {
    super(props);
    const { width, height, left, top } = this.props;
    this.state = {
      isInvalid: false,
      style: {
        position: 'absolute',
        zIndex: Z_INDEX_EDITOR_CONTAINER,
        left,
        top,
        width,
        height,
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
    const { top, height } = this.props;
    const vh = window.innerHeight || 0;
    const spaceBelow = vh - (top + height);
    const spaceAbove = top;
    if (spaceBelow >= 400 || spaceBelow >= spaceAbove) {
      return { top: 0, bottom: 'auto' };
    }
    return { top: 'auto', bottom: '5px' };
  };

  createEditor = () => {
    const { column, record, height, onPressTab, editorPosition, columns, modifyColumnData, readOnly, operation } = this.props;
    const value = this.getInitialValue();

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
      editorContainer: document.body,
      modifyColumnData,
      editorPosition,
      editingRowId: this.editingRowId,
      record,
      height,
      columns,
      column,
      readOnly,
      onPressTab,
      operation,
    };

    if (column.type === CellType.LINK) {
      editorProps = {
        ...editorProps,
        customStyle: this.computeTagsEditorCustomStyle()
      };
    }

    return (
      <Editor column={column} editorProps={editorProps} />
    );
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

  getInitialValue = () => {
    const { firstEditorKeyDown: key, value } = this.props;
    if (key === 'Enter') {
      return value;
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
  commit = (closeEditor) => {
    const { record } = this.props;
    if (!record || !record._id) return;
    const updated = (this.getEditor() && this.getEditor().getValue()) || {};
    this.commitData(updated, closeEditor);
  };

  // This is the updated data obtained by manually clicking the button
  commitData = (updated, closeEditor = false) => {
    const { onCommit, column, record } = this.props;
    const { key: columnKey, name: columnName } = column;
    const originalOldCellValue = getCellValueByColumn(record, column);
    let originalUpdates = { ...updated };
    if (!checkCellValueChanged(originalOldCellValue, originalUpdates[columnKey]) || !this.isNewValueValid(updated)) {
      if (closeEditor && typeof this.editor.onClose === 'function') {
        this.editor.onClose();
      }
      return;
    }
    this.changeCommitted = true;
    const rowId = record._id;
    const key = Object.keys(updated)[0];
    const value = updated[key];
    const updates = checkIsPrivateColumn(column) ? { [columnKey]: value } : { [columnName]: value };
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
