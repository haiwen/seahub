import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Cell from './cell';
import ActionsCell from './actions-cell';
import InsertColumn from './insert-column';
import { isMobile } from '../../../../../utils/utils';
import { isFrozen, recalculateColumnMetricsByResizeColumn, getFrozenColumns } from '../../../../utils/column';
import { isEmptyObject } from '../../../../utils/common';
import { GRID_HEADER_DEFAULT_HEIGHT, GRID_HEADER_DOUBLE_HEIGHT, HEADER_HEIGHT_TYPE, SEQUENCE_COLUMN_WIDTH,
  metadataZIndexes,
} from '../../../../constants';

const RecordsHeader = ({
  isGroupView,
  containerWidth,
  hasSelectedRecord,
  isSelectedAll,
  lastFrozenColumnKey,
  groupOffsetLeft,
  table,
  columnMetrics: propsColumnMetrics,
  onRef,
  colOverScanStartIdx,
  colOverScanEndIdx,
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
  const settings = useMemo(() => table.header_settings || {}, [table]);
  // const isHideTriangle = useMemo(() => settings && settings.is_hide_triangle, [settings]);
  const isHideTriangle = true;
  const height = useMemo(() => {
    const heightMode = isEmptyObject(settings) ? HEADER_HEIGHT_TYPE.DEFAULT : settings.header_height;
    return heightMode === HEADER_HEIGHT_TYPE.DOUBLE ? GRID_HEADER_DOUBLE_HEIGHT : GRID_HEADER_DEFAULT_HEIGHT;
  }, [settings]);
  const rowStyle = useMemo(() => {
    return {
      width: containerWidth,
      minWidth: '100%',
      zIndex: metadataZIndexes.GRID_HEADER,
      height
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
      zIndex: metadataZIndexes.SEQUENCE_COLUMN,
    };
    if ((isGroupView && !isFrozen(columns[0])) || isMobile) {
      value.position = 'absolute';
    }
    return value;
  }, [isGroupView, columnMetrics, height]);

  // const canInsertColumn = window.sfMetadataContext.canInsertColumn();
  const canInsertColumn = false;

  const modifyLocalColumnWidth = useCallback((column, width) => {
    setResizingColumnMetrics(recalculateColumnMetricsByResizeColumn(propsColumnMetrics, column.key, Math.max(width, 50)));
  }, [propsColumnMetrics]);

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
  const frozenColumnsWidth = frozenColumns.reduce((total, c) => total + c.width, groupOffsetLeft + SEQUENCE_COLUMN_WIDTH);
  const draggingColumnIndex = draggingColumnKey ? columnMetrics.columns.findIndex(c => c.key === draggingColumnKey) : -1;

  return (
    <div className="static-sf-metadata-result-content grid-header" style={{ height: height + 1 }}>
      <div className="sf-metadata-result-table-row" style={rowStyle}>
        {/* frozen */}
        <div className="frozen-columns d-flex" style={wrapperStyle} ref={ref => onRef(ref)}>
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
          {frozenColumns.map((column, columnIndex) => {
            const { key } = column;
            const isLastFrozenCell = key === lastFrozenColumnKey;
            return (
              <Cell
                frozen
                key={key}
                height={height}
                column={column}
                columnIndex={columnIndex}
                isLastFrozenCell={isLastFrozenCell}
                frozenColumnsWidth={frozenColumnsWidth}
                isHideTriangle={isHideTriangle}
                draggingColumnKey={draggingColumnKey}
                draggingColumnIndex={draggingColumnIndex}
                dragOverColumnKey={dragOverColumnKey}
                view={table.view}
                modifyLocalColumnWidth={modifyLocalColumnWidth}
                modifyColumnWidth={modifyColumnWidth}
                onMove={modifyColumnOrder}
                updateDraggingKey={updateDraggingKey}
                updateDragOverKey={updateDragOverKey}
                {...props}
              />
            );
          })}
        </div>
        {/* scroll */}
        {displayColumns.map((column, columnIndex) => {
          return (
            <Cell
              isHideTriangle={isHideTriangle}
              key={column.key}
              groupOffsetLeft={groupOffsetLeft}
              height={height}
              column={column}
              columnIndex={columnIndex}
              draggingColumnKey={draggingColumnKey}
              draggingColumnIndex={draggingColumnIndex}
              dragOverColumnKey={dragOverColumnKey}
              view={table.view}
              frozenColumnsWidth={frozenColumnsWidth}
              modifyLocalColumnWidth={modifyLocalColumnWidth}
              modifyColumnWidth={modifyColumnWidth}
              onMove={modifyColumnOrder}
              updateDraggingKey={updateDraggingKey}
              updateDragOverKey={updateDragOverKey}
              {...props}
            />
          );
        })}
        {canInsertColumn && insertColumn && (
          <InsertColumn
            lastColumn={columnMetrics.columns[columnMetrics.columns.length - 1]}
            groupOffsetLeft={groupOffsetLeft}
            height={height}
            metadata={table}
            insertColumn={insertColumn}
          />
        )}
      </div>
    </div>
  );
};

RecordsHeader.propTypes = {
  containerWidth: PropTypes.number,
  columnMetrics: PropTypes.object.isRequired,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  table: PropTypes.object,
  hasSelectedRecord: PropTypes.bool,
  isSelectedAll: PropTypes.bool,
  isGroupView: PropTypes.bool,
  groupOffsetLeft: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
  onRef: PropTypes.func,
  selectNoneRecords: PropTypes.func,
  selectAllRecords: PropTypes.func,
  insertColumn: PropTypes.func,
};

export default RecordsHeader;
