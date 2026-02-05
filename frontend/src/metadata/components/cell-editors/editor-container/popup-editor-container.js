import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ClickOutside from '../../../../components/click-outside';
import Editor from '../editor';
import { Utils } from '../../../../utils/utils';
import { isCellValueChanged, getCellValueByColumn, getColumnOptionNameById, getColumnOptionNamesByIds, getFileNameFromRecord } from '../../../utils/cell';
import { canEditCell, getColumnOriginName } from '../../../utils/column';
import { CellType, metadataZIndexes, EVENT_BUS_TYPE, PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../../constants';

const NOT_SUPPORT_EDITOR_COLUMN_TYPES = [
  CellType.CTIME, CellType.MTIME, CellType.CREATOR, CellType.LAST_MODIFIER, CellType.FILE_NAME,
];

const TAGS_EDITOR_WIDTH = 400;

class PopupEditorContainer extends React.Component {

  static displayName = 'PopupEditorContainer';

  constructor(props) {
    super(props);
    const { column, width, height, left, top } = this.props;
    let additionalStyles = {};
    if (column.type === CellType.SINGLE_SELECT || column.type === CellType.MULTIPLE_SELECT) {
      additionalStyles = { width, height };
    }
    if (column.type === CellType.TAGS) {
      additionalStyles = { left: left - (TAGS_EDITOR_WIDTH - column.width) };
    }
    this.state = {
      isInvalid: false,
      style: {
        position: 'absolute',
        zIndex: metadataZIndexes.EDITOR_CONTAINER,
        left,
        top,
        ...additionalStyles
      }
    };
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
    const { column, record, height, onPressTab, editorPosition, columns, modifyColumnData, onSelectTag, onDeselectTag } = this.props;
    const readOnly = !canEditCell(column, record, true) || NOT_SUPPORT_EDITOR_COLUMN_TYPES.includes(column.type);

    if (column.type === CellType.GEOLOCATION) {
      const fileName = getFileNameFromRecord(record);
      if (!Utils.imageCheck(fileName)) {
        return null;
      }
    }

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
      modifyColumnData,
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
      if (column.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME) {
        // convert hh:mm:ss to hh:mm if exists
        editorProps.format = editorProps.format.replace('HH:mm:ss', 'HH:mm');
      }
    }

    if (column.type === CellType.TAGS) {
      editorProps = {
        ...editorProps,
        onSelect: onSelectTag,
        onDeselect: onDeselectTag,
        canEditData: window.sfMetadataContext.canModifyRow(),
        canAddTag: window.sfMetadataContext.canModifyColumn(column),
        column: {
          ...column,
          width: TAGS_EDITOR_WIDTH,
        },
        customStyle: this.computeTagsEditorCustomStyle()
      };
    }

    return (<Editor {...editorProps} />);
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
    const { column, record } = this.props;
    if (!record._id) return;
    const editor = this.getEditor();
    if (!editor) return;
    const { key: columnKey, type: columnType } = column;
    if (columnType === CellType.TAGS) return;
    if (columnType === CellType.GEOLOCATION) {
      // For geolocation, get the value from the editor and transform it properly
      if (editor.getValue) {
        const geolocationValue = editor.getValue();
        const { position, location_translated } = geolocationValue || { position: null, location_translated: null };
        const updated = { [columnKey]: position };
        updated[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED] = location_translated;
        this.commitData(updated, true);
      }
      // Always call onClose for geolocation editor
      if (editor.onClose) {
        editor.onClose();
      }
      return;
    }

    let newValue = editor.getValue();
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

    let hasChanged;
    if (columnType === CellType.GEOLOCATION) {
      const currentLocation = originalOldCellValue;
      const newLocation = originalUpdates[columnKey];
      const currentTranslated = record[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];
      const newTranslated = originalUpdates[PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED];

      hasChanged = isCellValueChanged(currentLocation, newLocation, columnType) ||
                  (currentTranslated !== newTranslated);
    } else {
      hasChanged = isCellValueChanged(originalOldCellValue, originalUpdates[columnKey], columnType);
    }

    if (!hasChanged || !this.isNewValueValid(updated)) {
      if (closeEditor && typeof this.editor.onClose === 'function') {
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
    if (!this.getEditor()) return true;

    if (Utils.isFunction(this.getEditor().validate)) {
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
    !this.isClosed && this.onClickOutside(isEscapeKeydown);
  };

  onClickOutside = (isEscapeKeydown) => {
    this.isClosed = true;
    this.commit();
    this.props.onCommitCancel();
    !isEscapeKeydown && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  };

  render() {
    const editor = this.createEditor();

    if (!editor) {
      return null;
    }

    return (
      <ClickOutside onClickOutside={this.onClickOutside}>
        <div
          style={this.state.style}
          className={classnames({ 'has-error': this.state.isInvalid === true })}
          onContextMenu={this.handleRightClick}
          ref={this.props.innerRef}
        >
          {editor}
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
