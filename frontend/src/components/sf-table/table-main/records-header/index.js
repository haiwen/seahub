import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Cell from './cell';
import ActionsCell from './actions-cell';
import InsertColumn from './insert-column';
import { GRID_HEADER as Z_INDEX_GRID_HEADER, SEQUENCE_COLUMN as Z_INDEX_SEQUENCE_COLUMN } from '../../constants/z-index';
import { HEADER_HEIGHT_TYPE, GRID_HEADER_DEFAULT_HEIGHT, GRID_HEADER_DOUBLE_HEIGHT, MIN_COLUMN_WIDTH } from '../../constants/grid';
import { isEmptyObject } from '../../../../utils/object';
import { getFrozenColumns, checkIsColumnFrozen, recalculateColumnMetricsByResizeColumn } from '../../utils/column';
import { isMobile } from '../../../../utils/utils';

const RecordsHeader = ({
  containerWidth,
  showSequenceColumn,
  sequenceColumnWidth,
  isGroupView,
  hasSelectedRecord,
  isSelectedAll,
  lastFrozenColumnKey,
  groupOffsetLeft,
  columnDropdownMenu,
  headerSettings,
  columnMetrics: propsColumnMetrics,
  colOverScanStartIdx,
  colOverScanEndIdx,
  onRef,
  selectNoneRecords,
  selectAllRecords,
  modifyColumnWidth: modifyColumnWidthAPI,
  modifyColumnOrder: modifyColumnOrderAPI,
  insertColumn,
  ...props
}) => {
  const [resizingColumnMetrics, setResizingColumnMetrics] = useState(null);
  const [draggingColumnKey, setDraggingCellKey] = useState(null);
  const [dragOverColumnKey, setDragOverCellKey] = useState(null);

  const height = useMemo(() => {
    const heightMode = isEmptyObject(headerSettings) ? HEADER_HEIGHT_TYPE.DEFAULT : headerSettings.header_height;
    return heightMode === HEADER_HEIGHT_TYPE.DOUBLE ? GRID_HEADER_DOUBLE_HEIGHT : GRID_HEADER_DEFAULT_HEIGHT;
  }, [headerSettings]);

  const rowStyle = useMemo(() => {
    return {
      width: containerWidth,
      minWidth: '100%',
      zIndex: Z_INDEX_GRID_HEADER,
      height,
    };
  }, [containerWidth, height]);

  const columnMetrics = useMemo(() => {
    if (resizingColumnMetrics) return resizingColumnMetrics;
    return propsColumnMetrics;
  }, [resizingColumnMetrics, propsColumnMetrics]);

  const wrapperStyle = useMemo(() => {
    const { columns } = columnMetrics;
    let value = {
      position: (isMobile ? 'absolute' : 'fixed'),
      marginLeft: '0px',
      height,
      zIndex: Z_INDEX_SEQUENCE_COLUMN,
    };
    if ((isGroupView && !checkIsColumnFrozen(columns[0])) || isMobile) {
      value.position = 'absolute';
    }
    return value;
  }, [isGroupView, columnMetrics, height]);

  const moveable = useMemo(() => {
    return !!modifyColumnOrderAPI;
  }, [modifyColumnOrderAPI]);

  const resizable = useMemo(() => {
    return !!modifyColumnWidthAPI;
  }, [modifyColumnWidthAPI]);

  const modifyLocalColumnWidth = useCallback((column, width) => {
    setResizingColumnMetrics(recalculateColumnMetricsByResizeColumn(propsColumnMetrics, sequenceColumnWidth, column.key, Math.max(width, MIN_COLUMN_WIDTH)));
  }, [propsColumnMetrics, sequenceColumnWidth]);

  const modifyColumnWidth = useCallback((column, newWidth) => {
    setResizingColumnMetrics(null);
    modifyColumnWidthAPI && modifyColumnWidthAPI(column, newWidth);
  }, [modifyColumnWidthAPI]);

  const modifyColumnOrder = useCallback((source, target) => {
    modifyColumnOrderAPI && modifyColumnOrderAPI(source.key, target.key);
  }, [modifyColumnOrderAPI]);

  const updateDraggingKey = useCallback((cellKey) => {
    if (cellKey === draggingColumnKey) return;
    setDraggingCellKey(cellKey);
  }, [draggingColumnKey]);

  const updateDragOverKey = useCallback((cellKey) => {
    if (cellKey === dragOverColumnKey) return;
    setDragOverCellKey(cellKey);
  }, [dragOverColumnKey]);

  const frozenColumns = getFrozenColumns(columnMetrics.columns);
  const displayColumns = columnMetrics.columns.slice(colOverScanStartIdx, colOverScanEndIdx);
  const frozenColumnsWidth = frozenColumns.reduce((total, c) => total + c.width, groupOffsetLeft + sequenceColumnWidth);
  const draggingColumnIndex = draggingColumnKey ? columnMetrics.columns.findIndex(c => c.key === draggingColumnKey) : -1;

  return (
    <div className="static-sf-table-result-content grid-header" style={{ height: height + 1 }}>
      <div className="sf-table-row" style={rowStyle}>
        {/* frozen */}
        <div className="frozen-columns d-flex" style={wrapperStyle} ref={ref => onRef(ref)}>
          {showSequenceColumn &&
            <ActionsCell
              isMobile={isMobile}
              height={height}
              hasSelectedRecord={hasSelectedRecord}
              isSelectedAll={isSelectedAll}
              isLastFrozenCell={!lastFrozenColumnKey}
              groupOffsetLeft={groupOffsetLeft}
              selectNoneRecords={selectNoneRecords}
              selectAllRecords={selectAllRecords}
            />
          }
          {frozenColumns.map((column, columnIndex) => {
            const { key } = column;
            const isLastFrozenCell = key === lastFrozenColumnKey;
            return (
              <Cell
                key={`sf-table-frozen-header-cell-${key}`}
                {...props}
                frozen
                moveable={moveable}
                resizable={resizable}
                height={height}
                column={column}
                columnIndex={columnIndex}
                fullIndex={columnIndex}
                groupOffsetLeft={groupOffsetLeft}
                isLastFrozenCell={isLastFrozenCell}
                frozenColumnsWidth={frozenColumnsWidth}
                columnDropdownMenu={columnDropdownMenu}
                draggingColumnKey={draggingColumnKey}
                draggingColumnIndex={draggingColumnIndex}
                dragOverColumnKey={dragOverColumnKey}
                modifyLocalColumnWidth={modifyLocalColumnWidth}
                modifyColumnWidth={modifyColumnWidth}
                onMove={modifyColumnOrder}
                updateDraggingKey={updateDraggingKey}
                updateDragOverKey={updateDragOverKey}
              />
            );
          })}
        </div>
        {displayColumns.map((column, displayIndex) => {
          const fullIndex = colOverScanStartIdx + displayIndex;
          return (
            <Cell
              key={`sf-table-header-cell-${column.key}`}
              {...props}
              moveable={moveable}
              resizable={resizable}
              columnDropdownMenu={columnDropdownMenu}
              groupOffsetLeft={groupOffsetLeft}
              height={height}
              column={column}
              columnIndex={displayIndex}
              fullIndex={fullIndex}
              draggingColumnKey={draggingColumnKey}
              draggingColumnIndex={draggingColumnIndex}
              dragOverColumnKey={dragOverColumnKey}
              frozenColumnsWidth={frozenColumnsWidth}
              modifyLocalColumnWidth={modifyLocalColumnWidth}
              modifyColumnWidth={modifyColumnWidth}
              onMove={modifyColumnOrder}
              updateDraggingKey={updateDraggingKey}
              updateDragOverKey={updateDragOverKey}
            />
          );
        })}
        {(props.canInsertColumn && insertColumn) && (
          <InsertColumn
            lastColumn={columnMetrics.columns[columnMetrics.columns.length - 1]}
            groupOffsetLeft={groupOffsetLeft}
            height={height}
            metadata={props.table}
            insertColumn={insertColumn}
          />
        )}
      </div>
    </div>
  );
};

RecordsHeader.propTypes = {
  containerWidth: PropTypes.number,
  showSequenceColumn: PropTypes.bool,
  sequenceColumnWidth: PropTypes.number,
  columnMetrics: PropTypes.object.isRequired,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  enableRecordNumber: PropTypes.bool,
  hasSelectedRecord: PropTypes.bool,
  isSelectedAll: PropTypes.bool,
  isGroupView: PropTypes.bool,
  groupOffsetLeft: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
  onRef: PropTypes.func,
  selectNoneRecords: PropTypes.func,
  selectAllRecords: PropTypes.func,
  insertColumn: PropTypes.func,
  canModifyColumn: PropTypes.func,
};

export default RecordsHeader;
