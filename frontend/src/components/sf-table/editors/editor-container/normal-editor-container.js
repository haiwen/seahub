import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../../click-outside';
import Editor from './editor';
import { EDITOR_CONTAINER as Z_INDEX_EDITOR_CONTAINER } from '../../constants/z-index';
import { Utils } from '../../../../utils/utils';
import { getEventClassName } from '../../../../utils/dom';
import { checkCellValueChanged } from '../../utils/cell-comparer';
import { getCellValueByColumn } from '../../utils/cell';
import { isCtrlKeyHeldDown, isKeyPrintable } from '../../../../utils/keyboard-utils';
import EventBus from '../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { checkIsPrivateColumn } from '../../utils/column';

class NormalEditorContainer extends React.Component {

  static displayName = 'EditorContainer';

  state = { isInvalid: false };
  changeCommitted = false;
  changeCanceled = false;
  eventBus = EventBus.getInstance();

  componentDidMount() {
    const inputNode = this.getInputNode();
    if (inputNode !== undefined) {
      this.setTextInputFocus();
      if (this.getEditor() && !this.getEditor().disableContainerStyles) {
        inputNode.className += ' sf-metadata-editor-main';
        inputNode.style.height = (this.props.height - 1) + 'px';
      }
    }
  }

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

  isKeyExplicitlyHandled = (key) => {
    return Utils.isFunction(this['onPress' + key]);
  };

  checkAndCall = (methodName, args) => {
    if (Utils.isFunction(this[methodName])) {
      this[methodName](args);
    }
  };

  onKeyDown = (e) => {
    if (isCtrlKeyHeldDown(e)) {
      this.checkAndCall('onPressKeyWithCtrl', e);
    } else if (this.isKeyExplicitlyHandled(e.key)) {
      // break up individual keyPress events to have their own specific callbacks
      const callBack = 'onPress' + e.key;
      this.checkAndCall(callBack, e);
    } else if (isKeyPrintable(e.keyCode)) {
      e.stopPropagation();
      this.checkAndCall('onPressChar', e);
    }

    // Track which keys are currently down for shift clicking etc
    this._keysDown = this._keysDown || {};
    this._keysDown[e.keyCode] = true;
    if (Utils.isFunction(this.props.onGridKeyDown)) {
      this.props.onGridKeyDown(e);
    }
  };

  onScroll = (e) => {
    e.stopPropagation();
  };

  setEditorRef = (editor) => {
    this.editor = editor;
  };

  createEditor = () => {
    const { column, openEditorMode, columns, modifyColumnData, readOnly } = this.props;
    const editorProps = {
      ref: this.setEditorRef,
      readOnly,
      columns,
      column,
      value: this.getInitialValue(),
      mode: openEditorMode,
      onCommit: this.commit,
      onCommitData: this.commitData,
      onCommitCancel: this.commitCancel,
      recordMetaData: this.getRecordMetaData(),
      record: this.props.record,
      height: this.props.height,
      onBlur: this.commit,
      onOverrideKeyDown: this.onKeyDown,
      modifyColumnData,
    };
    return (
      <Editor ref={editorProps.ref} column={column} editorProps={editorProps} />
    );
  };

  onPressEnter = () => {
    // this.commit({ key: 'Enter' });
  };

  onPressTab = () => {
    this.commit({ key: 'Tab' });
  };

  onPressEscape = (e) => {
    if (!this.editorIsSelectOpen()) {
      this.commitCancel();
    } else {
      // prevent event from bubbling if editor has results to select
      e.stopPropagation();
    }
  };

  onPressArrowDown = (e) => {
    if (this.editorHasResults()) {
      // don't want to propagate as that then moves us round the grid
      e.stopPropagation();
    } else {
      this.commit(e);
    }
  };

  onPressArrowUp = (e) => {
    if (this.editorHasResults()) {
      // don't want to propagate as that then moves us round the grid
      e.stopPropagation();
    } else {
      this.commit(e);
    }
  };

  onPressArrowLeft = (e) => {
    // prevent event propagation. this disables left cell navigate
    if (!this.isCaretAtBeginningOfInput()) {
      e.stopPropagation();
    } else {
      this.commit(e);
    }
  };

  onPressArrowRight = (e) => {
    // prevent event propagation. this disables right cell navigate
    if (!this.isCaretAtEndOfInput()) {
      e.stopPropagation();
    } else {
      this.commit(e);
    }
  };

  editorHasResults = () => {
    if (this.getEditor() && Utils.isFunction(this.getEditor().hasResults)) {
      return this.getEditor().hasResults();
    }
    return false;
  };

  editorIsSelectOpen = () => {
    if (this.getEditor() && Utils.isFunction(this.getEditor().isSelectOpen)) {
      return this.getEditor().isSelectOpen();
    }
    return false;
  };

  getRecordMetaData = () => {
    // clone row data so editor cannot actually change this
    // convention based method to get corresponding Id or Name of any Name or Id property
    if (typeof this.props.column.getRecordMetaData === 'function') {
      return this.props.column.getRecordMetaData(this.props.record, this.props.column);
    }
  };

  getEditor = () => {
    return this.editor;
  };

  getInputNode = () => {
    if (this.getEditor() && this.getEditor().getInputNode) {
      return this.getEditor().getInputNode();
    }
    return undefined;
  };

  getInitialValue = () => {
    const { firstEditorKeyDown: key, value } = this.props;
    if (key === 'Enter') {
      return value;
    }
    return key || value;
  };

  getContainerClass = () => {
    return classnames({
      'rdg-editor-container': true,
      'table-cell-editor': true,
      'has-error': this.state.isInvalid === true
    });
  };

  getOldRowData = (originalOldCellValue) => {
    const { column } = this.props;
    const { key: columnKey, name: columnName } = column;
    let oldValue = originalOldCellValue;
    if (this.getEditor() && this.getEditor().getOldValue) {
      const original = this.getEditor().getOldValue();
      oldValue = original[Object.keys(original)[0]];
    }
    const oldRowData = checkIsPrivateColumn(column) ? { [columnName]: oldValue } : { [columnName]: oldValue };
    const originalOldRowData = { [columnKey]: originalOldCellValue }; // { [column.key]: cellValue }
    return { oldRowData, originalOldRowData };
  };

  commit = (args) => {
    const { record, column } = this.props;
    const { key: columnKey } = column;
    const originalOldCellValue = getCellValueByColumn(record, column);
    const updated = (this.getEditor() && this.getEditor().getValue()) || {};
    if (!checkCellValueChanged(originalOldCellValue, updated[columnKey])) {
      this.props.onCommitCancel();
      return;
    }
    this.commitData(updated, true);
  };

  commitData = (updated, closeEditor = false) => {
    if (!this.isNewValueValid(updated)) return;
    const { onCommit, record, column } = this.props;
    const { key: columnKey, name: columnName } = column;
    this.changeCommitted = true;
    const rowId = record._id;
    const originalOldCellValue = getCellValueByColumn(record, column);
    const key = Object.keys(updated)[0];
    const value = updated[key];
    const updates = checkIsPrivateColumn(column) ? { [columnKey]: value } : { [columnName]: value };
    const { oldRowData, originalOldRowData } = this.getOldRowData(originalOldCellValue);

    // updates used for update remote record data
    // originalUpdates used for update local record data
    // oldRowData ues for undo/undo modify record
    // originalOldRowData ues for undo/undo modify record
    onCommit({ rowId, cellKey: columnKey, updates, originalUpdates: updated, oldRowData, originalOldRowData }, closeEditor);
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

  setCaretAtEndOfInput = () => {
    const input = this.getInputNode();
    // taken from http://stackoverflow.com/questions/511088/use-javascript-to-place-cursor-at-end-of-text-in-text-input-element
    const txtLength = input.value.length;
    if (input.setSelectionRange) {
      input.setSelectionRange(txtLength, txtLength);
    } else if (input.createTextRange) {
      const fieldRange = input.createTextRange();
      fieldRange.moveStart('character', txtLength);
      fieldRange.collapse();
      fieldRange.select();
    }
  };

  isCaretAtBeginningOfInput = () => {
    const inputNode = this.getInputNode();
    return inputNode.selectionStart === inputNode.selectionEnd
      && inputNode.selectionStart === 0;
  };

  isCaretAtEndOfInput = () => {
    const inputNode = this.getInputNode();
    return inputNode.selectionStart === inputNode.value.length;
  };

  handleRightClick = (e) => {
    e.stopPropagation();
  };

  setTextInputFocus = () => {
    const keyCode = this.props.firstEditorKeyDown;
    const inputNode = this.getInputNode();
    inputNode.focus();
    if (inputNode.tagName === 'INPUT') {
      if (!isKeyPrintable(keyCode)) {
        inputNode.focus();
        inputNode.select();
      } else {
        inputNode.select();
      }
    }
  };

  onClickOutside = (e) => {
    // Prevent impact on the drag handle module
    const className = getEventClassName(e);
    if (className && className.includes('drag-handle')) return;
    this.commit();
    this.props.onCommitCancel();
    this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  };

  render() {
    const { width, height, left, top } = this.props;
    const style = { position: 'absolute', height, width, left, top, zIndex: Z_INDEX_EDITOR_CONTAINER };
    return (
      <ClickOutside onClickOutside={this.onClickOutside}>
        <div
          style={style}
          className={this.getContainerClass()}
          onKeyDown={this.onKeyDown}
          onScroll={this.onScroll}
          onContextMenu={this.handleRightClick}
        >
          {this.createEditor()}
        </div>
      </ClickOutside>
    );
  }
}

NormalEditorContainer.propTypes = {
  firstEditorKeyDown: PropTypes.string,
  openEditorMode: PropTypes.string,
  columns: PropTypes.array,

  // position info
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
};

export default NormalEditorContainer;
