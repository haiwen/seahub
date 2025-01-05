import React, { cloneElement, isValidElement, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../../../../utils/utils';
import { getCellValueByColumn } from '../../../../utils/cell';
import { cellCompare, checkCellValueChanged } from '../../../../utils/cell-comparer';
import { checkIsColumnEditable } from '../../../../utils/column';

import './index.css';

const Cell = React.memo(({
  needBindEvents,
  column,
  record,
  groupRecordIndex,
  recordIndex,
  cellMetaData,
  highlightClassName,
  isLastCell,
  isLastFrozenCell,
  isCellSelected,
  bgColor,
  frozen,
  height,
  checkCanModifyRecord,
}) => {
  const cellEditable = useMemo(() => {
    return checkIsColumnEditable(column) && checkCanModifyRecord && checkCanModifyRecord(record);
  }, [column, record, checkCanModifyRecord]);

  const className = useMemo(() => {
    const { type } = column;
    return classnames('sf-table-cell', `sf-table-${type}-cell`, highlightClassName, {
      'table-cell-uneditable': !cellEditable,
      'last-cell': isLastCell,
      'table-last--frozen': isLastFrozenCell,
      'cell-selected': isCellSelected,
      // 'dragging-file-to-cell': ,
      // 'row-comment-cell': ,
    });
  }, [cellEditable, column, highlightClassName, isLastCell, isLastFrozenCell, isCellSelected]);

  const style = useMemo(() => {
    const { left, width } = column;
    let value = {
      width,
      height,
    };
    if (!frozen) {
      value.left = left;
    }
    if (bgColor) {
      value.backgroundColor = bgColor;
    }
    return value;
  }, [frozen, height, column, bgColor]);

  const onCellClick = useCallback((event) => {
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };

    // select cell
    if (Utils.isFunction(cellMetaData.onCellClick)) {
      cellMetaData.onCellClick(cell, event);
    }
  }, [column, groupRecordIndex, recordIndex, cellMetaData]);

  const onCellDoubleClick = useCallback((event) => {
    if (!Utils.isFunction(cellMetaData.onCellDoubleClick)) return;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    cellMetaData.onCellDoubleClick(cell, event);
  }, [column, groupRecordIndex, recordIndex, cellMetaData]);

  const onCellMouseDown = useCallback((event) => {
    if (event.button === 2) return;
    if (!Utils.isFunction(cellMetaData.onCellMouseDown)) return;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    cellMetaData.onCellMouseDown(cell, event);
  }, [column, groupRecordIndex, recordIndex, cellMetaData]);

  const onCellMouseEnter = useCallback((event) => {
    if (!Utils.isFunction(cellMetaData.onCellMouseEnter)) return;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    const mousePosition = { x: event.clientX, y: event.clientY };
    cellMetaData.onCellMouseEnter({ ...cell, mousePosition }, event);
  }, [column, groupRecordIndex, recordIndex, cellMetaData]);

  const onCellMouseMove = useCallback((event) => {
    if (!Utils.isFunction(cellMetaData.onCellMouseMove)) return;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    const mousePosition = { x: event.clientX, y: event.clientY };
    cellMetaData.onCellMouseMove({ ...cell, mousePosition }, event);
  }, [column, groupRecordIndex, recordIndex, cellMetaData]);

  const onCellMouseLeave = useCallback(() => {
    return;
  }, []);

  const onDragOver = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const onCellContextMenu = useCallback((event) => {
    event.preventDefault();

    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    if (!Utils.isFunction(cellMetaData.onCellContextMenu)) return;
    cellMetaData.onCellContextMenu(cell);
  }, [cellMetaData, column, groupRecordIndex, recordIndex]);

  const getEvents = useCallback(() => {
    return {
      onClick: onCellClick,
      onDoubleClick: onCellDoubleClick,
      onMouseDown: onCellMouseDown,
      onMouseEnter: onCellMouseEnter,
      onMouseMove: onCellMouseMove,
      onMouseLeave: onCellMouseLeave,
      onDragOver: onDragOver,
      onContextMenu: onCellContextMenu,
    };
  }, [onCellClick, onCellDoubleClick, onCellMouseDown, onCellMouseEnter, onCellMouseMove, onCellMouseLeave, onDragOver, onCellContextMenu]);

  const getOldRowData = useCallback((originalOldCellValue) => {
    const { key: columnKey, name: columnName, is_private } = column;
    const oldRowData = is_private ? { [columnKey]: originalOldCellValue } : { [columnName]: originalOldCellValue };
    const originalOldRowData = { [columnKey]: originalOldCellValue }; // { [column.key]: cellValue }
    return { oldRowData, originalOldRowData };
  }, [column]);

  const modifyRecord = useCallback((updated) => {
    if (!Utils.isFunction(cellMetaData.modifyRecord)) return;
    const { key: columnKey, name: columnName, is_private } = column;
    const originalOldCellValue = getCellValueByColumn(record, column);
    const newCellValue = updated[columnKey];
    if (!checkCellValueChanged(originalOldCellValue, newCellValue)) return;
    const rowId = record._id;
    const key = Object.keys(updated)[0];
    let updates = updated;
    if (!is_private) {
      updates = { [columnName]: updated[key] };
    }
    const { oldRowData, originalOldRowData } = getOldRowData(originalOldCellValue);
    // updates used for update remote record data
    // originalUpdates used for update local record data
    // oldRowData ues for undo/undo modify record
    // originalOldRowData ues for undo/undo modify record
    cellMetaData.modifyRecord({ rowId, cellKey: columnKey, updates, originalUpdates: updated, oldRowData, originalOldRowData });
  }, [cellMetaData, record, column, getOldRowData]);

  const cellValue = getCellValueByColumn(record, column);
  const cellEvents = needBindEvents && getEvents();
  const containerProps = {
    className,
    style,
    ...cellEvents,
  };
  return (
    <div key={`${record._id}-${column.key}`} {...containerProps}>
      {isValidElement(column.formatter) && cloneElement(column.formatter, { isCellSelected, value: cellValue, column, record, onChange: modifyRecord })}
      {(isCellSelected && isValidElement(cellMetaData.CellOperationBtn)) && (cloneElement(cellMetaData.CellOperationBtn, { record, column }))}
    </div>
  );
}, (props, nextProps) => {
  return !cellCompare(props, nextProps);
});

Cell.defaultProps = {
  needBindEvents: true
};

Cell.propTypes = {
  frozen: PropTypes.bool,
  isCellSelected: PropTypes.bool,
  isLastCell: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  cellMetaData: PropTypes.object,
  record: PropTypes.object.isRequired,
  groupRecordIndex: PropTypes.number,
  recordIndex: PropTypes.number.isRequired,
  column: PropTypes.object.isRequired,
  height: PropTypes.number,
  needBindEvents: PropTypes.bool,
  modifyRecord: PropTypes.func,
  highlightClassName: PropTypes.string,
  bgColor: PropTypes.string,
};

export default Cell;
