import React, { isValidElement, cloneElement } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import toaster from '../../../../../../../components/toast';
import {
  CellType,
  NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP,
  KeyCodes,
  isFunction,
  isEmptyObject,
  HEADER_HEIGHT_TYPE,
} from '../../../../../_basic';
import { EVENT_BUS_TYPE, GROUP_ROW_TYPE, TRANSFER_TYPES, EDITOR_TYPE,
  GRID_HEADER_DOUBLE_HEIGHT, GRID_HEADER_DEFAULT_HEIGHT,
} from '../../../../../constants';
import {
  getNewSelectedRange, getSelectedDimensions, selectedRangeIsSingleCell,
  getSelectedRangeDimensions, getSelectedRow, getSelectedColumn,
  isSelectedCellEditable, getRecordsFromSelectedRange, getSelectedCellValue,
} from '../../../../../utils/selected-cell-utils';
import { isCtrlKeyHeldDown, isKeyPrintable } from '../../../../../utils/keyboard-utils';
import SelectionRangeMask from '../selection-range-mask';
import SelectionMask from '../selection-mask';
import { getFormatRowData } from '../../../../../utils/cell-format-utils';
import RecordMetrics from '../../../../../utils/record-metrics';
import setEventTransfer from '../../../../../utils/set-event-transfer';
import getEventTransfer from '../../../../../utils/get-event-transfer';
import { getGroupRecordByIndex } from '../../../../../utils/group-metrics';
import DragMask from '../drag-mask';
import DragHandler from '../drag-handler';
import { gettext } from '../../../../../../../utils/constants';
import { EditorPortal, EditorContainer } from '../../../../cell-editor';

import './index.css';

const READONLY_PREVIEW_COLUMNS = [
  CellType.FILE_NAME,
];

const NOT_SUPPORT_OPEN_EDITOR_COLUMN_TYPES = [
  CellType.CHECKBOX,
  CellType.RATE,
];

class InteractionMasks extends React.Component {


  static defaultProps = {
    enableCellSelect: true,
    isGroupView: false,
    groupOffsetLeft: 0,
  };

  throttle = null;

  constructor(props) {
    super(props);
    const initPosition = { idx: -1, rowIdx: -1, groupRecordIndex: -1 };
    this.state = {
      selectedPosition: initPosition,
      selectedRange: {
        topLeft: initPosition,
        bottomRight: initPosition,
        startCell: null,
        cursorCell: null,
        isDragging: false,
      },
      draggedRange: null,
      isEditorEnabled: false,
      openEditorMode: '',
    };
    this.selectionMask = null;
  }

  componentDidMount() {
    const eventBus = window.sfMetadataContext.eventBus;
    this.unsubscribeSelectColumn = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_COLUMN, this.onColumnSelect);
    this.unsubscribeDragEnter = eventBus.subscribe(EVENT_BUS_TYPE.DRAG_ENTER, this.handleDragEnter);
    this.unsubscribeSelectCell = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_CELL, this.onSelectCell);
    this.unsubscribeSelectNone = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_NONE, this.selectNone);
    this.unsubscribeSelectStart = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_START, this.onSelectCellRangeStarted);
    this.unsubscribeSelectUpdate = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_UPDATE, this.onSelectCellRangeUpdated);
    this.unsubscribeSelectEnd = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_END, this.onSelectCellRangeEnded);
    this.unsubscribeOpenEditorEvent = eventBus.subscribe(EVENT_BUS_TYPE.OPEN_EDITOR, this.onOpenEditorEvent);
    this.unsubscribeCloseEditorEvent = eventBus.subscribe(EVENT_BUS_TYPE.CLOSE_EDITOR, this.onCloseEditorEvent);
    this.unsubscribeCopy = eventBus.subscribe(EVENT_BUS_TYPE.COPY_CELLS, this.onCopy);
    this.unsubscribePaste = eventBus.subscribe(EVENT_BUS_TYPE.PASTE_CELLS, this.onPaste);
  }

  componentDidUpdate(prevProps, prevState) {
    const { selectedRange, isEditorEnabled } = this.state;
    const { selectedRange: prevSelectedRange, isEditorEnabled: prevIsEditorEnabled } = prevState;
    const isEditorClosed = isEditorEnabled !== prevIsEditorEnabled && !isEditorEnabled;
    const isSelectedRangeChanged = selectedRange !== prevSelectedRange && (selectedRange.topLeft !== prevSelectedRange.topLeft || selectedRange.bottomRight !== prevSelectedRange.bottomRight);
    if (isSelectedRangeChanged || isEditorClosed) {
      this.focus();
    }
  }

  componentWillUnmount() {
    this.unsubscribeSelectColumn();
    this.unsubscribeSelectCell();
    this.unsubscribeSelectStart();
    this.unsubscribeSelectUpdate();
    this.unsubscribeSelectEnd();
    this.unsubscribeOpenEditorEvent();
    this.unsubscribeCloseEditorEvent();
    this.unsubscribeCopy();
    this.unsubscribePaste();
    this.setState = (state, callback) => {
      return;
    };
  }

  onColumnSelect = (column) => {
    let { columns, isGroupView, recordsCount } = this.props;
    if (isGroupView) return;
    let selectColumnIndex = 0;
    for (let i = 0; i < columns.length; i++) {
      if (column.key === columns[i].key) {
        selectColumnIndex = i;
        break;
      }
    }
    this.setState({
      selectedPosition: { ...this.state.selectedPosition, idx: selectColumnIndex, rowIdx: 0 },
      selectedRange: {
        startCell: { idx: selectColumnIndex, rowIdx: 0 },
        topLeft: { idx: selectColumnIndex, rowIdx: 0 },
        bottomRight: { idx: selectColumnIndex, rowIdx: recordsCount - 1 },
        isDragging: false,
      }
    });
  };

  onOpenEditorEvent = (mode) => {
    this.setState({ openEditorMode: mode }, () => {
      this.openEditor();
    });
  };

  onCloseEditorEvent = () => {
    if (this.state.isEditorEnabled) {
      this.closeEditor();
    }
  };

  onSelectCell = (cell, openEditor) => {
    const { selectedPosition, isEditorEnabled } = this.state;
    const callback = openEditor ? this.openEditor : () => null;

    if (isEditorEnabled) {
      this.closeEditor();
    }

    this.setState((prevState) => {
      const next = { ...selectedPosition, ...cell };
      if (this.isCellWithinBounds(next)) {
        return {
          selectedPosition: next,
          selectedRange: {
            topLeft: next,
            bottomRight: next,
            startCell: next,
            cursorCell: next,
            isDragging: false,
          }
        };
      }
      return prevState;
    }, callback);
  };

  selectNone = () => {
    const initPosition = { idx: -1, rowIdx: -1, groupRecordIndex: -1 };
    this.setState({
      selectedPosition: initPosition,
      selectedRange: {
        topLeft: initPosition,
        bottomRight: initPosition,
        startCell: null,
        cursorCell: null,
      },
    });
    this.props.selectNone();
  };

  getSelectedPosition = () => {
    const { topLeft, bottomRight } = this.state.selectedRange;
    return {
      top: topLeft.rowIdx,
      bottom: bottomRight.rowIdx,
      left: topLeft.idx,
      right: bottomRight.idx,
    };
  };

  getSelectedRange = () => {
    return this.state.selectedRange;
  };

  selectCell = (groupRecordIndex, rowIdx, idx) => {
    const selectedPosition = { idx, groupRecordIndex, rowIdx };
    this.setState({
      selectedPosition,
      selectedRange: {
        topLeft: selectedPosition,
        bottomRight: selectedPosition,
        startCell: selectedPosition,
        cursorCell: selectedPosition,
      },
    });
  };

  // onCellSelect || onKeyDown
  openEditor = (event = null) => {
    if (this.isSelectedCellIsLongText()) {
      event && event.stopPropagation();
      event && event.preventDefault();
    }
    const { key } = event || {};
    const { selectedPosition, openEditorMode } = this.state;
    const { columns } = this.props;
    const selectedColumn = getSelectedColumn({ selectedPosition, columns });
    const { type: columnType } = selectedColumn;

    if (NOT_SUPPORT_OPEN_EDITOR_COLUMN_TYPES.includes(columnType)) return null;

    // how to open editors?
    // 1. editor is closed
    // 2. record-cell is editable or open editor with preview mode
    if (((this.isSelectedCellEditable() || (openEditorMode === EDITOR_TYPE.PREVIEWER && READONLY_PREVIEW_COLUMNS.includes(columnType))) && !this.state.isEditorEnabled)) {
      this.setState({
        isEditorEnabled: true,
        firstEditorKeyDown: key,
        editorPosition: this.getEditorPosition()
      });
    }
  };

  closeEditor = () => {
    this.setState({
      isEditorEnabled: false,
      firstEditorKeyDown: null,
      editorPosition: null,
      openEditorMode: ''
    });
  };

  onSelectCellRangeStarted = (selectedPosition) => {
    if (!this.isCellWithinBounds(selectedPosition)) return;

    const selectedRange = this.createSingleCellSelectedRange(selectedPosition, true);
    this.setState({ selectedRange }, () => {
      if (isFunction(this.props.onCellRangeSelectionStarted)) {
        this.props.onCellRangeSelectionStarted(this.state.selectedRange);
      }
    });
  };

  onSelectCellRangeUpdated = (cellPosition, isFromKeyboard, callback) => {
    if (!this.state.selectedRange.isDragging && !isFromKeyboard) {
      return;
    }

    if (!this.isCellWithinBounds(cellPosition)) {
      return;
    }

    const startCell = this.state.selectedRange.startCell || this.state.selectedPosition;
    const { topLeft, bottomRight } = getNewSelectedRange(startCell, cellPosition);
    const selectedRange = {
      // default the startCell to the selected cell, in case we've just started via keyboard
      startCell: this.state.selectedPosition,
      // assign the previous state (which will override the startCell if we already have one)
      ...this.state.selectedRange,
      // assign the new state - the bounds of the range, and the new cursor cell
      topLeft,
      bottomRight,
      cursorCell: cellPosition
    };

    this.setState({ selectedRange }, () => {
      if (isFunction(this.props.onCellRangeSelectionUpdated)) {
        this.props.onCellRangeSelectionUpdated(this.state.selectedRange);
      }
      if (isFunction(callback)) {
        callback(this.state.selectedRange);
      }
    });
  };

  onSelectCellRangeEnded = () => {
    const selectedRange = { ...this.state.selectedRange, isDragging: false };
    this.setState({ selectedRange }, () => {
      if (isFunction(this.props.onCellRangeSelectionCompleted)) {
        this.props.onCellRangeSelectionCompleted(this.state.selectedRange);
      }
    });
  };

  createSingleCellSelectedRange(cellPosition, isDragging) {
    return {
      topLeft: cellPosition,
      bottomRight: cellPosition,
      startCell: cellPosition,
      cursorCell: cellPosition,
      isDragging
    };
  }

  focus = () => {
    if (this.selectionMask && !this.isFocused()) {
      this.selectionMask.focus();
    }
  };

  isFocused = () => {
    return document.activeElement === this.selectionMask;
  };

  isCellSelected = () => {
    const { selectedPosition } = this.state;
    return selectedPosition.idx !== -1 && selectedPosition.rowIdx !== -1;
  };

  isCellWithinBounds = ({ idx, rowIdx }) => {
    const { columns, recordsCount } = this.props;
    const maxRowIdx = recordsCount;
    return rowIdx >= 0 && rowIdx < maxRowIdx && idx >= 0 && idx < columns.length;
  };

  isSelectedCellEditable = () => {
    const { enableCellSelect, columns, isGroupView, recordGetterByIndex, onCheckCellIsEditable } = this.props;
    const { selectedPosition } = this.state;
    const res = isSelectedCellEditable({ enableCellSelect, columns, isGroupView, recordGetterByIndex, selectedPosition, onCheckCellIsEditable });
    return res;
  };

  isSelectedCellIsLongText = () => {
    const { columns } = this.props;
    const { selectedPosition } = this.state;
    const column = getSelectedColumn({ selectedPosition, columns });
    return column && column.type === CellType.LONG_TEXT;
  };

  isGridSelected = () => {
    return this.isCellWithinBounds(this.state.selectedPosition);
  };

  getSelectedDimensions = (selectedPosition) => {
    const { columns, rowHeight, isGroupView, groupOffsetLeft, getRowTop: getRecordTopFromRecordsBody } = this.props;
    const scrollLeft = this.props.getScrollLeft();
    return { ...getSelectedDimensions({
      selectedPosition, columns, scrollLeft, rowHeight, isGroupView, groupOffsetLeft, getRecordTopFromRecordsBody
    }) };
  };

  getSelectedRangeDimensions = (selectedRange) => {
    const { columns, rowHeight, isGroupView, groups, groupMetrics, groupOffsetLeft, getRowTop: getRecordTopFromRecordsBody } = this.props;
    return { ...getSelectedRangeDimensions({
      selectedRange, columns, rowHeight, isGroupView, groups, groupMetrics, groupOffsetLeft, getRecordTopFromRecordsBody,
    }) };
  };

  setScrollLeft = (scrollLeft, scrollTop) => {
    const { selectionMask, state: { selectedPosition } } = this;
    this.setMaskScrollLeft(selectionMask, selectedPosition, scrollLeft, scrollTop);
  };

  geHeaderHeight = () => {
    const { table } = this.props;
    const settings = table.header_settings || {};
    const heightMode = isEmptyObject(settings) ? HEADER_HEIGHT_TYPE.DEFAULT : settings.header_height;
    const containerHeight = heightMode === HEADER_HEIGHT_TYPE.DOUBLE ? GRID_HEADER_DOUBLE_HEIGHT : GRID_HEADER_DEFAULT_HEIGHT;
    // 1: header border-bottom
    return containerHeight + 1;
  };

  setMaskScrollLeft = (mask, position, scrollLeft, scrollTop) => {
    const headerHeight = this.geHeaderHeight();
    if (mask) {
      const { idx, rowIdx, groupRecordIndex } = position;
      if (idx >= 0 && rowIdx >= 0) {
        const { columns, getRowTop, isGroupView, groupOffsetLeft } = this.props;
        const column = columns[idx];
        const frozen = !!column.frozen;
        if (frozen) {
          // use fixed
          let top = -scrollTop + getRowTop(isGroupView ? groupRecordIndex : rowIdx) + headerHeight;
          let left = column.left;
          if (isGroupView) {
            top += 1;
            left += groupOffsetLeft;
          }
          mask.style.position = 'fixed';
          mask.style.top = top + 'px';
          mask.style.left = left + 'px';
          mask.style.transform = 'none';
        }
      }
    }
  };

  cancelSetScrollLeft = () => {
    if (this.selectionMask) {
      this.cancelSetMaskScrollLeft(this.selectionMask, this.state.selectedPosition);
    }
  };

  cancelSetMaskScrollLeft = (mask, position) => {
    const { left, top } = this.getSelectedDimensions(position);
    mask.style.position = 'absolute';
    mask.style.top = 0;
    mask.style.left = 0;
    mask.style.transform = `translate(${left}px, ${top}px)`;
  };

  getEditorPosition = () => {
    if (this.selectionMask) {
      const { editorPortalTarget } = this.props;
      const { left: selectionMaskLeft, top: selectionMaskTop } = this.selectionMask.getBoundingClientRect();
      if (editorPortalTarget === document.body) {
        const { scrollLeft, scrollTop } = document.scrollingElement || document.documentElement;
        return {
          left: selectionMaskLeft + scrollLeft,
          top: selectionMaskTop + scrollTop
        };
      }

      const { left: portalTargetLeft, top: portalTargetTop } = editorPortalTarget.getBoundingClientRect();
      const { scrollLeft, scrollTop } = editorPortalTarget;
      return {
        left: selectionMaskLeft - portalTargetLeft + scrollLeft,
        top: selectionMaskTop - portalTargetTop + scrollTop
      };
    }
  };

  onCommit = (updated, closeEditor = true) => {
    this.props.modifyRecord(updated);
    if (closeEditor) {
      this.closeEditor();
    }
  };

  onCommitCancel = () => {
    this.closeEditor();
  };

  onKeyDown = (e) => {
    const keyCode = e.keyCode;
    if (isCtrlKeyHeldDown(e)) {
      this.onPressKeyWithCtrl(e);
    } else if (keyCode === KeyCodes.Escape) {
      this.onPressEscape(e);
    } else if (keyCode === KeyCodes.Tab) {
      this.onPressTab(e);
    } else if (this.isKeyboardNavigationEvent(e)) {
      this.changeCellFromEvent(e);
    } else if (isKeyPrintable(keyCode) || keyCode === KeyCodes.Enter) {
      this.openEditor(e);
    } else if (keyCode === KeyCodes.Backspace || keyCode === KeyCodes.Delete) {
      const name = e.target.className;
      if (name === 'rdg-selected') {
        e.preventDefault();
        this.handleSelectCellsDelete();
      }
    }
  };

  handleSelectCellsDelete = () => {
    const { isGroupView, recordGetterByIndex, columns } = this.props;
    const { selectedRange } = this.state;
    const { topLeft, bottomRight } = selectedRange;
    const recordsFromSelectedRange = getRecordsFromSelectedRange({ selectedRange, isGroupView, recordGetterByIndex });
    const editableRecords = recordsFromSelectedRange.filter(record => window.sfMetadataContext.canModifyRow(record));
    if (editableRecords.length === 0) {
      return;
    }
    const { idx: startColumnIdx } = topLeft;
    const { idx: endColumnIdx } = bottomRight;
    let editableColumns = [];
    let linkColumns = [];

    // get editable columns from selected range
    for (let j = startColumnIdx; j <= endColumnIdx; j++) {
      const column = columns[j];
      if (!column || NOT_SUPPORT_EDIT_COLUMN_TYPE_MAP[column.type] || !window.sfMetadataContext.canModifyColumn(column)) {
        break;
      }
      const { type, data } = column;
      editableColumns.push(column);
      if (type === CellType.LINK && data) {
        linkColumns.push(column);
      }
    }

    if (editableColumns.length === 0) {
      return;
    }

    let updateRecordIds = [];
    let idRecordUpdates = {}; // row's id to modified records data: { [row_id]: { [column.name: null] } }
    let idOriginalRecordUpdates = {}; // row's id to modified original records data: { [row_id]: { [column.key: null] } }
    let idOldRecordData = {}; // row's id to old records data: { [row_id]: { [column.name: xxx] } }
    let idOriginalOldRecordData = {}; // row's id to old original records data: { [row_id]: { [column.key: xxx] } }
    let idRowLinkItems = {}; // row's id to modified links: { [row_id]: { [column.key]: null } }
    let idOldRowLinkItems = {}; // row's id to old links: { [row_id]: { [column.key]: [{ row_id: xxx, display_value: 'xxx' }] } }
    editableRecords.forEach(record => {
      const { _id } = record;
      let originalUpdate = {};
      let originalOldRecordData = {};
      let linkItem = {};
      let oldLinkItem = {};
      editableColumns.forEach(column => {
        const { key, name } = column;
        const cellVal = record[key] || record[name];
        if (cellVal || cellVal === 0 || (Array.isArray(cellVal) && cellVal.length > 0)) {
          originalOldRecordData[key] = cellVal;
          originalUpdate[key] = null;
        }
      });

      // links data
      if (Object.keys(linkItem).length > 0) {
        idRowLinkItems[_id] = linkItem;
        idOldRowLinkItems[_id] = oldLinkItem;
      }

      if (Object.keys(originalUpdate).length > 0) {
        updateRecordIds.push(_id);
        const update = getFormatRowData(editableColumns, originalUpdate);
        const oldRecordData = getFormatRowData(editableColumns, originalOldRecordData);
        idRecordUpdates[_id] = update;
        idOriginalRecordUpdates[_id] = originalUpdate;
        idOldRecordData[_id] = oldRecordData;
        idOriginalOldRecordData[_id] = originalOldRecordData;
      }
    });

    if (updateRecordIds.length > 0) {
      const isCopyPaste = true;
      this.props.updateRecords({
        recordIds: updateRecordIds, idRecordUpdates, idOriginalRecordUpdates,
        idOldRecordData, idOriginalOldRecordData, isCopyPaste,
      });
    }
  };

  onCopySelected = () => {
    this.onCopyCells();
  };

  onCopy = (e) => {
    e.preventDefault();

    const { recordMetrics } = this.props;
    // select the records to copy
    const selectedRecordIds = RecordMetrics.getSelectedIds(recordMetrics);
    if (selectedRecordIds.length > 0) {
      this.copyRows(e, selectedRecordIds);
      return;
    }

    // window.getSelection() doesn't work on the content of <input> in FireFox, Edge and IE.
    // The selectionStart and selectionEnd properties could be used to work around this.
    let selectTxt = window.getSelection().toString();
    if (!selectTxt && e.target.value) {
      const { selectionStart, selectionEnd } = e.target;
      selectTxt = e.target.value.substring(selectionStart, selectionEnd);
    }
    if (selectTxt) {
      this.copyText(e, selectTxt);
      return;
    }

    // when activeElement is not cellMask, can't copy cell
    if (!this.isCellMaskActive()) {
      return;
    }
    this.onCopyCells(e);
  };

  onPaste = (e) => {
    // when activeElement is not cellMask or has no permission, can't paste cell
    if (!this.isCellMaskActive() || window.sfMetadataContext.getPermission() === 'r') {
      return;
    }
    const { columns, isGroupView } = this.props;
    const { selectedPosition, selectedRange } = this.state;
    const { idx, rowIdx } = selectedPosition;
    if (idx === -1 || rowIdx === -1) {
      return; // prevent paste when no cell selected
    }
    const cliperData = getEventTransfer(e);
    if (!cliperData) {
      return;
    }

    const cliperDataType = cliperData.type;
    const copied = cliperData[TRANSFER_TYPES.DTABLE_FRAGMENT];
    let copiedRecordsCount = 0;
    let copiedColumnsCount = 0;
    if (cliperDataType === TRANSFER_TYPES.DTABLE_FRAGMENT) {
      const { selectedRecordIds, copiedRange } = copied;
      if (Array.isArray(selectedRecordIds) && selectedRecordIds.length > 0) {
        // copy from selected records
        copiedRecordsCount = selectedRecordIds.length;
        copiedColumnsCount = columns.length;
      } else {
        // copy from selected range
        const { topLeft: copiedTopLeft, bottomRight: copiedBottomRight } = copiedRange;
        const { idx: startCopiedColumnIndex, rowIdx: startCopiedRecordIndex } = copiedTopLeft;
        const { idx: endCopiedColumnIndex, rowIdx: endCopiedRecordIndex } = copiedBottomRight;
        copiedRecordsCount = endCopiedRecordIndex - startCopiedRecordIndex + 1;
        copiedColumnsCount = endCopiedColumnIndex - startCopiedColumnIndex + 1;
      }
    } else {
      const { copiedRecords, copiedColumns } = copied;
      copiedRecordsCount = copiedRecords.length;
      copiedColumnsCount = copiedColumns.length;
    }
    const multiplePaste = this.isMultiplePaste(copiedRecordsCount, copiedColumnsCount);
    this.props.paste({
      copied,
      multiplePaste,
      type: cliperDataType,
      pasteRange: selectedRange,
      isGroupView,
    });
    if (!multiplePaste) {
      this.setPasteRange(copiedRecordsCount, copiedColumnsCount);
    }
  };

  copyText = (event, copiedText) => {
    const type = 'text';
    setEventTransfer({
      type,
      event,
      copiedText,
    });
  };

  copyRows = (event, selectedRecordIds) => {
    const { table, columns, recordGetterById, isGroupView, getCopiedRecordsAndColumnsFromRange } = this.props;
    const copiedRowsCount = selectedRecordIds.length;
    toaster.success(
      copiedRowsCount > 1 ? gettext('xxx rows are copied.').replace('xxx', copiedRowsCount) : gettext('1 row is copied.')
    );
    const type = TRANSFER_TYPES.DTABLE_FRAGMENT;
    const copied = { selectedRecordIds };
    const { copiedRecords, copiedColumns } = getCopiedRecordsAndColumnsFromRange({ type, copied, isGroupView });
    const { _id: copiedTableId } = table;
    setEventTransfer({
      type,
      event,
      selectedRecordIds,
      copiedRecords,
      copiedColumns,
      copiedTableId,
      tableData: {
        columns,
      },
      recordGetterById,
    });
  };

  onCopyCells = (event) => {
    const { table, columns, isGroupView, recordGetterByIndex, getCopiedRecordsAndColumnsFromRange } = this.props;
    const { selectedPosition, selectedRange } = this.state;
    const { _id: copiedTableId } = table;
    const { rowIdx, idx } = selectedPosition;
    if (rowIdx < 0 || idx < 0) {
      return; // can not copy when no cell select
    }
    const { topLeft, bottomRight } = selectedRange;
    const type = TRANSFER_TYPES.DTABLE_FRAGMENT;
    const copiedCellsCount = (bottomRight.rowIdx - topLeft.rowIdx + 1) * (bottomRight.idx - topLeft.idx + 1);
    toaster.success(
      copiedCellsCount > 1 ? gettext('xxx cells copied').replace('xxx', copiedCellsCount) : gettext('1 cell copied')
    );
    const copied = { copiedRange: selectedRange };
    const { copiedRecords, copiedColumns } = getCopiedRecordsAndColumnsFromRange({ type, copied, isGroupView });
    setEventTransfer({
      type,
      event,
      copiedRange: { ...selectedRange },
      copiedRecords,
      copiedColumns,
      copiedTableId,
      tableData: {
        columns,
      },
      isGroupView,
      recordGetterByIndex,
    });
  };

  isMultiplePaste = (copiedRecordsCount, copiedColumnsCount) => {
    const { selectedRange } = this.state;
    const { topLeft, bottomRight } = selectedRange;
    const { idx: startColumnIndex, rowIdx: startRecordIndex } = topLeft;
    const { idx: endColumnIndex, rowIdx: endRecordIndex } = bottomRight;
    return Number.isInteger((endColumnIndex - startColumnIndex + 1) / copiedColumnsCount) && Number.isInteger((endRecordIndex - startRecordIndex + 1) / copiedRecordsCount);
  };

  setPasteRange = (copiedRecordsCount, copiedColumnsCount) => {
    const { recordsCount, columns } = this.props;
    const { selectedPosition, selectedRange } = this.state;
    const { topLeft } = selectedRange;
    const { idx, rowIdx } = topLeft;
    const columnsLen = columns.length;
    const groupRecordIndex = selectedPosition.groupRecordIndex;
    let nextColumnIndex = idx + copiedColumnsCount - 1;
    let nextRecordIndex = rowIdx + copiedRecordsCount - 1;
    if (nextColumnIndex >= columnsLen) {
      nextColumnIndex = columnsLen - 1;
    }
    if (nextRecordIndex >= recordsCount) {
      nextRecordIndex = recordsCount - 1;
    }
    const nextSelectedRange = {
      topLeft,
      startCell: selectedPosition,
      bottomRight: {
        idx: nextColumnIndex,
        rowIdx: nextRecordIndex,
        groupRecordIndex,
      },
      cursorCell: {
        idx: selectedPosition.idx,
        rowIdx: selectedPosition.rowIdx,
        groupRecordIndex,
      }
    };
    this.setState({
      selectedRange: {
        ...selectedRange,
        ...nextSelectedRange
      }
    }, () => {
      this.focus();
    });
    return nextSelectedRange;
  };

  onPressKeyWithCtrl = () => {

  };

  onPressEscape = () => {

  };

  onPressTab = (e) => {
    this.changeCellFromEvent(e);
  };

  getLeftInterval = () => {
    const { isGroupView, columns, groupOffsetLeft, frozenColumnsWidth } = this.props;
    const firstColumnFrozen = columns[0] ? columns[0].frozen : false;
    let leftInterval = 0;
    if (firstColumnFrozen) {
      leftInterval = groupOffsetLeft + frozenColumnsWidth;
      if (isGroupView) {
        leftInterval += groupOffsetLeft;
      }
    } else {
      leftInterval = 0;
    }
    return leftInterval;
  };

  handleVerticalArrowAction = (current, actionType) => {
    const { isGroupView, groupMetrics, rowHeight } = this.props;
    const step = actionType === 'ArrowDown' ? 1 : -1;
    if (isGroupView) {
      const groupRows = groupMetrics.groupRows || [];
      const groupRowsLen = groupRows.length;
      const { groupRecordIndex: currentGroupRowIndex } = current;
      let nextGroupRowIndex = currentGroupRowIndex + step;
      let nextGroupRow;
      while (nextGroupRowIndex > 0 && nextGroupRowIndex < groupRowsLen) {
        nextGroupRow = getGroupRecordByIndex(nextGroupRowIndex, groupMetrics);
        if (nextGroupRow.type === GROUP_ROW_TYPE.ROW) {
          break;
        }
        nextGroupRowIndex += step;
      }
      if (!nextGroupRow || nextGroupRow.type !== GROUP_ROW_TYPE.ROW) {
        return;
      }

      const currentScrollTop = this.props.getGroupCanvasScrollTop() || 0;
      const { rowIdx: nextRowIdx, top: nextRowTop } = nextGroupRow;
      let newScrollTop;

      // 32: footerHeight; 16: preview of next row.
      const HEADER_HEIGHT = 150;
      if (nextRowTop <= currentScrollTop + 16) {
        newScrollTop = nextRowTop - 16;
      } else if (nextRowTop + HEADER_HEIGHT - currentScrollTop >= window.innerHeight - 32 - 16) {
        newScrollTop = nextRowTop + HEADER_HEIGHT - window.innerHeight + 32 + rowHeight + 16;
      }
      if (newScrollTop !== undefined) {
        this.props.setGroupCanvasScrollTop(newScrollTop);
      }
      return { ...current, rowIdx: nextRowIdx, groupRecordIndex: nextGroupRowIndex };
    } else {
      return { ...current, rowIdx: current.rowIdx + step };
    }
  };

  handleLeftArrowAction = (current) => {
    let cellContainer = this.selectionMask;
    if (!cellContainer) return;
    const { columns } = this.props;
    const rect = cellContainer.getBoundingClientRect();
    const leftInterval = this.getLeftInterval();
    const nextColumnWidth = columns[current.idx - 1] ? columns[current.idx - 1].width : 0;
    const { left: tableContentLeft, right } = this.props.getTableContentRect();
    const viewLeft = tableContentLeft + 130;

    // selectMask is outside the viewport, scroll to next column
    if (rect.x < 0 || rect.x > right) {
      this.props.scrollToColumn(current.idx - 1);
    } else if (nextColumnWidth > rect.x - leftInterval - viewLeft) {
      // selectMask is part of the viewport, newScrollLeft = columnWidth - visibleWidth
      const newScrollLeft = nextColumnWidth - (rect.x - leftInterval - viewLeft);
      this.props.setRecordsScrollLeft(this.props.getScrollLeft() - newScrollLeft);
    }
    return ({ ...current, idx: current.idx === 0 ? 0 : current.idx - 1 });
  };

  handleRightArrowAction = (current) => {
    let cellContainer = this.selectionMask;
    if (!cellContainer) return;
    const { columns } = this.props;
    const rect = cellContainer.getBoundingClientRect();
    const columnIdx = current.idx;
    const column = columns[columnIdx];
    if (columnIdx === 1 && column.frozen === true) {
      this.props.scrollToColumn(1);
    } else {
      const { right: tableContentRight } = this.props.getTableContentRect();
      const nextColumnWidth = columns[columnIdx + 1] ? columns[columnIdx + 1].width : 0;
      // selectMask is outside the viewport, scroll to next column
      if (rect.x < 0 || rect.x > tableContentRight) {
        this.props.scrollToColumn(columnIdx + 1);
      } else if (rect.x + rect.width + nextColumnWidth > tableContentRight) {
        // selectMask is part of the viewport, newScrollLeft = columnWidth - visibleWidth
        const newScrollLeft = nextColumnWidth - (tableContentRight - rect.x - rect.width);
        this.props.setRecordsScrollLeft(this.props.getScrollLeft() + newScrollLeft);
      }
    }
    return ({ ...current, idx: current.idx + 1 });
  };

  isKeyboardNavigationEvent(e) {
    return this.getKeyNavActionFromEvent(e) != null;
  }

  getKeyNavActionFromEvent = (e) => {
    const { getVisibleIndex, onHitBottomBoundary, onHitTopBoundary } = this.props;

    const { rowVisibleStartIdx, rowVisibleEndIdx } = getVisibleIndex();
    const isCellAtBottomBoundary = cell => cell.rowIdx >= rowVisibleEndIdx - 1;
    const isCellAtTopBoundary = cell => cell.rowIdx !== 0 && cell.rowIdx <= rowVisibleStartIdx;
    const keyNavActions = {
      ArrowDown: {
        getNext: (current) => {
          return this.handleVerticalArrowAction(current, 'ArrowDown');
        },
        isCellAtBoundary: isCellAtBottomBoundary,
        onHitBoundary: onHitBottomBoundary
      },
      ArrowUp: {
        getNext: (current) => {
          return this.handleVerticalArrowAction(current, 'ArrowUp');
        },
        isCellAtBoundary: isCellAtTopBoundary,
        onHitBoundary: onHitTopBoundary
      },
      ArrowRight: {
        getNext: (current) => {
          return this.handleRightArrowAction(current);
        },
        isCellAtBoundary: () => {
          return false;
        }
      },
      ArrowLeft: {
        getNext: (current) => {
          return this.handleLeftArrowAction(current);
        },
        isCellAtBoundary: () => {
          return false;
        }
      }
    };
    if (e.keyCode === KeyCodes.Tab) {
      return e.shiftKey === true ? keyNavActions.ArrowLeft : keyNavActions.ArrowRight;
    }
    return keyNavActions[e.key];
  };

  changeCellFromEvent = (e) => {
    e.preventDefault();
    if (e.keyCode === KeyCodes.ChineseInputMethod && this.state.isEditorEnabled) {
      return;
    }
    if (this.throttle) return;
    const currentPosition = this.state.selectedPosition;
    const keyNavAction = this.getKeyNavActionFromEvent(e);
    const next = keyNavAction.getNext(currentPosition);
    if (!next) return;
    this.checkIsAtGridBoundary(keyNavAction, next);
    this.props.onCellClick(next);
    this.onSelectCell({ ...next });
    this.throttle = true;
    setTimeout(() => {
      this.throttle = false;
    }, 30);
  };

  checkIsAtGridBoundary(keyNavAction, next) {
    const { isCellAtBoundary, onHitBoundary } = keyNavAction;
    if (isCellAtBoundary(next)) {
      onHitBoundary(next);
    }
  }

  onFocus = () => {

  };

  onScroll = (e) => {
    e.stopPropagation();
  };

  setSelectionMaskRef = (ref) => {
    this.selectionMask = ref;
  };

  setSelectionRangeMaskRef = (ref) => {
    this.selectedRangeMask = ref;
  };

  setContainerRef = (ref) => {
    this.container = ref;
  };

  isCellMaskActive = () => {
    const activeElement = document.activeElement;
    return (activeElement &&
      (activeElement.getAttribute('data-test') === 'cell-mask' ||
      activeElement.getAttribute('data-test') === 'active-editor')
    );
  };

  handleDragCopy = (draggedRange) => {
    const { columns, groupMetrics, table: { rows, id_row_map }, gridUtils, updateRecords } = this.props;
    // compute the new records
    const newRecords = gridUtils.getUpdateDraggedRecords(draggedRange, columns, rows, id_row_map, groupMetrics);
    updateRecords({ ...newRecords, isCopyPaste: true });
  };

  handleDragStart = (e) => {
    const { selectedRange: { topLeft, bottomRight, startCell, cursorCell } } = this.state;
    // To prevent dragging down/up when reordering rows. (TODO: is this required)
    const isViewportDragging = e && e.target && e.target.className;
    if (topLeft.idx > -1 && isViewportDragging) {
      try {
        e.dataTransfer.setData('text/plain', '');
      } catch (ex) {
        // IE only supports 'text' and 'URL' for the 'type' argument
        e.dataTransfer.setData('text', '');
      }
      this.setState({
        draggedRange: { topLeft, bottomRight, startCell, cursorCell }
      });
    }
  };

  handleDragEnter = ({ overRecordIdx, overGroupRecordIndex }) => {
    if (this.state.draggedRange != null) {
      this.setState(({ draggedRange }) => ({
        draggedRange: { ...draggedRange, overRecordIdx, overGroupRecordIndex }
      }));
    }
  };

  handleDragEnd = () => {
    const { draggedRange, selectedRange } = this.state;
    let newSelectedRange = deepCopy(selectedRange);
    if (draggedRange !== null) {
      const { overRecordIdx, overGroupRecordIndex, bottomRight } = draggedRange;
      if (overRecordIdx !== null && bottomRight.rowIdx < overRecordIdx) {
        this.handleDragCopy(draggedRange);
        newSelectedRange.bottomRight.rowIdx = overRecordIdx;
        newSelectedRange.cursorCell.rowIdx = overRecordIdx;
        newSelectedRange.bottomRight.groupRecordIndex = overGroupRecordIndex;
        newSelectedRange.cursorCell.groupRecordIndex = overGroupRecordIndex;
      }
      this.setState({ draggedRange: null, selectedRange: newSelectedRange });
    }
  };

  renderSingleCellSelectView = () => {
    const { columns } = this.props;
    const {
      isEditorEnabled,
      selectedPosition,
    } = this.state;
    const isDragEnabled = this.isSelectedCellEditable();
    const canEdit = window.sfMetadataContext.canModifyRows();
    const showDragHandle = (isDragEnabled && canEdit);
    const column = getSelectedColumn({ selectedPosition, columns });
    const { type: columnType } = column || {};
    if (isEditorEnabled && columnType !== CellType.RATE && columnType !== CellType.CHECKBOX && columnType !== CellType.FILE_NAME) return null;
    if (!this.isGridSelected()) return null;

    const props = {
      innerRef: this.setSelectionMaskRef,
      selectedPosition,
      getSelectedDimensions: this.getSelectedDimensions,
    };
    return (
      <SelectionMask {...props}>
        {showDragHandle ?
          <DragHandler
            onDragStart={this.handleDragStart}
            onDragEnd={this.handleDragEnd}
          />
          : null}
      </SelectionMask>
    );
  };

  renderCellRangeSelectView = () => {
    const { selectedRange } = this.state;
    const { columns, rowHeight } = this.props;

    const isDragEnabled = this.isSelectedCellEditable();
    const canEdit = window.sfMetadataContext.canModifyRows();
    const showDragHandle = (isDragEnabled && canEdit);
    return [
      <SelectionRangeMask
        key="range-mask"
        innerRef={this.setSelectionRangeMaskRef}
        selectedRange={selectedRange}
        columns={columns}
        rowHeight={rowHeight}
        getSelectedRangeDimensions={this.getSelectedRangeDimensions}
      >
        {showDragHandle ?
          <DragHandler
            onDragStart={this.handleDragStart}
            onDragEnd={this.handleDragEnd}
          />
          : null}
      </SelectionRangeMask>,
      <SelectionMask
        key="selection-mask"
        innerRef={this.setSelectionMaskRef}
        selectedPosition={selectedRange.startCell}
        getSelectedDimensions={this.getSelectedDimensions}
      />
    ];
  };

  render() {
    const { selectedRange, isEditorEnabled, draggedRange, selectedPosition, firstEditorKeyDown, openEditorMode, editorPosition } = this.state;
    const { table, columns, isGroupView, recordGetterByIndex, scrollTop, getScrollLeft, editorPortalTarget, contextMenu, recordMetrics } = this.props;
    const isSelectedSingleCell = selectedRangeIsSingleCell(selectedRange);
    return (
      <div
        className='interaction-mask'
        ref={this.setContainerRef}
        onKeyDown={this.onKeyDown}
        onFocus={this.onFocus}
        onScroll={this.onScroll}
        tabIndex={0}
        aria-hidden="true"
      >
        {draggedRange && (
          <DragMask
            draggedRange={draggedRange}
            getSelectedDimensions={this.getSelectedDimensions}
            getSelectedRangeDimensions={this.getSelectedRangeDimensions}
          />
        )}
        {isSelectedSingleCell && this.renderSingleCellSelectView()}
        {!isSelectedSingleCell && this.renderCellRangeSelectView()}
        {isEditorEnabled && (
          <EditorPortal target={editorPortalTarget}>
            <EditorContainer
              table={table}
              columns={columns}
              scrollTop={scrollTop}
              firstEditorKeyDown={firstEditorKeyDown}
              openEditorMode={openEditorMode}
              portalTarget={editorPortalTarget}
              scrollLeft={getScrollLeft()}
              record={getSelectedRow({ selectedPosition, isGroupView, recordGetterByIndex })}
              column={getSelectedColumn({ selectedPosition, columns })}
              value={getSelectedCellValue({ selectedPosition, columns, isGroupView, recordGetterByIndex })}
              onCommit={this.onCommit}
              onCommitCancel={this.onCommitCancel}
              modifyColumnData={this.props.modifyColumnData}
              editorPosition={editorPosition}
              {...{
                ...this.getSelectedDimensions(selectedPosition),
                ...this.state.editorPosition
              }}
            />
          </EditorPortal>
        )}

        {isValidElement(contextMenu) && cloneElement(contextMenu, {
          recordMetrics: recordMetrics,
          selectedPosition: isSelectedSingleCell ? selectedPosition : null,
          selectedRange: !isSelectedSingleCell ? selectedRange : null,
          onClearSelected: this.handleSelectCellsDelete,
          onCopySelected: this.onCopySelected,
          getTableContentRect: this.props.getTableContentRect,
          getTableCanvasContainerRect: this.props.getTableCanvasContainerRect
        })}
      </div>
    );
  }
}

InteractionMasks.propTypes = {
  contextmenu: PropTypes.element,
  table: PropTypes.object,
  columns: PropTypes.array,
  canAddRow: PropTypes.bool,
  isGroupView: PropTypes.bool,
  recordsCount: PropTypes.number,
  recordMetrics: PropTypes.object,
  groups: PropTypes.array,
  groupMetrics: PropTypes.object,
  rowHeight: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  frozenColumnsWidth: PropTypes.number,
  enableCellSelect: PropTypes.bool,
  getRowTop: PropTypes.func,
  scrollTop: PropTypes.number,
  getScrollLeft: PropTypes.func,
  getTableContentRect: PropTypes.func,
  getMobileFloatIconStyle: PropTypes.func,
  onToggleMobileMoreOperations: PropTypes.func,
  onToggleInsertRecordDialog: PropTypes.func,
  onCellRangeSelectionStarted: PropTypes.func,
  onCellRangeSelectionUpdated: PropTypes.func,
  onCellRangeSelectionCompleted: PropTypes.func,
  selectNone: PropTypes.func,
  onCheckCellIsEditable: PropTypes.func,
  editorPortalTarget: PropTypes.instanceOf(Element).isRequired,
  modifyRecord: PropTypes.func.isRequired,
  recordGetterByIndex: PropTypes.func,
  recordGetterById: PropTypes.func,
  updateRecords: PropTypes.func,
  deleteRecordsLinks: PropTypes.func,
  paste: PropTypes.func,
  editMobileCell: PropTypes.func,
  getVisibleIndex: PropTypes.func,
  onHitBottomBoundary: PropTypes.func,
  onHitTopBoundary: PropTypes.func,
  onCellClick: PropTypes.func,
  scrollToColumn: PropTypes.func,
  setRecordsScrollLeft: PropTypes.func,
  getGroupCanvasScrollTop: PropTypes.func,
  setGroupCanvasScrollTop: PropTypes.func,
  appPage: PropTypes.object,
  onFillingDragRows: PropTypes.func,
  onCellsDragged: PropTypes.func,
  gridUtils: PropTypes.object,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
  onCommit: PropTypes.func,
  getTableCanvasContainerRect: PropTypes.func,
};

export default InteractionMasks;
