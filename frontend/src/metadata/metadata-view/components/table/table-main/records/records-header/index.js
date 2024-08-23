import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import {
  HEADER_HEIGHT_TYPE,
  isEmptyObject,
  Z_INDEX,
} from '../../../../../_basic';
import Cell from './cell';
import ActionsCell from './actions-cell';
import { isMobile } from '../../../../../utils';
import { getFrozenColumns } from '../../../../../utils/table-utils';
import { isFrozen, recalculateColumnMetricsByResizeColumn } from '../../../../../utils/column-utils';
import { GRID_HEADER_DEFAULT_HEIGHT, GRID_HEADER_DOUBLE_HEIGHT } from '../../../../../constants';
import InsertColumn from './insert-column';
import html5DragDropContext from '../../../../../../../pages/wiki2/wiki-nav/html5DragDropContext';

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
  ...props
}) => {
  const [resizingColumnMetrics, setResizingColumnMetrics] = useState(null);
  const settings = useMemo(() => table.header_settings || {}, [table]);
  const isHideTriangle = useMemo(() => settings && settings.is_hide_triangle, [settings]);
  const height = useMemo(() => {
    const heightMode = isEmptyObject(settings) ? HEADER_HEIGHT_TYPE.DEFAULT : settings.header_height;
    return heightMode === HEADER_HEIGHT_TYPE.DOUBLE ? GRID_HEADER_DOUBLE_HEIGHT : GRID_HEADER_DEFAULT_HEIGHT;
  }, [settings]);
  const rowStyle = useMemo(() => {
    return {
      width: containerWidth,
      minWidth: '100%',
      zIndex: Z_INDEX.GRID_HEADER,
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
      zIndex: Z_INDEX.SEQUENCE_COLUMN,
    };
    if ((isGroupView && !isFrozen(columns[0])) || isMobile) {
      value.position = 'absolute';
    }
    return value;
  }, [isGroupView, columnMetrics, height]);

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

  const frozenColumns = getFrozenColumns(columnMetrics.columns);
  const displayColumns = columnMetrics.columns.slice(colOverScanStartIdx, colOverScanEndIdx);
  const frozenColumnsWidth = frozenColumns.reduce((total, c) => total + c.width, 0);

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
          {frozenColumns.map(column => {
            const { key } = column;
            const style = { backgroundColor: '#f9f9f9' };
            const isLastFrozenCell = key === lastFrozenColumnKey;
            return (
              <Cell
                frozen
                key={key}
                height={height}
                column={column}
                style={style}
                isLastFrozenCell={isLastFrozenCell}
                frozenColumnsWidth={frozenColumnsWidth}
                isHideTriangle={isHideTriangle}
                modifyLocalColumnWidth={modifyLocalColumnWidth}
                modifyColumnWidth={modifyColumnWidth}
                onMove={modifyColumnOrder}
                {...props}
              />
            );
          })}
        </div>
        {/* scroll */}
        {displayColumns.map(column => {
          return (
            <Cell
              isHideTriangle={isHideTriangle}
              key={column.key}
              groupOffsetLeft={groupOffsetLeft}
              height={height}
              column={column}
              frozenColumnsWidth={frozenColumnsWidth}
              modifyLocalColumnWidth={modifyLocalColumnWidth}
              modifyColumnWidth={modifyColumnWidth}
              onMove={modifyColumnOrder}
              {...props}
            />
          );
        })}
        <InsertColumn lastColumn={columnMetrics.columns[columnMetrics.columns.length - 1]} groupOffsetLeft={groupOffsetLeft} height={height} />
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
};

const DndRecordHeaderContainer = DropTarget('sfMetadataRecordHeaderCell', {}, connect => ({
  connectDropTarget: connect.dropTarget()
}))(RecordsHeader);

export default html5DragDropContext(DndRecordHeaderContainer);

