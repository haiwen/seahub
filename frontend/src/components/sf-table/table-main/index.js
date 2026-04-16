import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import EmptyTip from '../../empty-tip';
import CenteredLoading from '../../centered-loading';
import Records from './records';
import ContextMenu from '../context-menu';
import { gettext } from '../../../utils/constants';
import { GROUP_VIEW_OFFSET } from '../constants/group';
import { SEQUENCE_COLUMN_WIDTH } from '../constants/grid';
import { getCellValueByColumn } from '../utils/cell';
import GridUtils from '../utils/grid';
import { generateKeyTreeNodeRowIdMap } from '../utils/tree';

const TableMain = ({
  table,
  visibleColumns,
  headerSettings,
  recordsIds,
  groupbys,
  groups,
  showSequenceColumn,
  noRecordsTipsText,
  hasMoreRecords,
  isLoadingMore,
  isLoading = false,
  showGridFooter,
  recordsTree,
  showRecordAsTree,
  enableScrollToLoad = true,
  loadMore,
  loadAll,
  getTreeNodeByIndex,
  recordGetterByIndex,
  recordGetterById,
  getClientCellValueDisplayString,
  updateFileTags,
  gridUtils: injectedGridUtils,
  ...customProps
}) => {

  // Use injected GridUtils if provided, otherwise create one internally
  const gridUtils = useMemo(() => {
    if (injectedGridUtils) {
      return injectedGridUtils;
    }
    return new GridUtils(recordsIds, {
      recordGetterByIndex,
      recordGetterById,
      updateFileTags,
    });
  }, [injectedGridUtils, recordsIds, recordGetterByIndex, recordGetterById, updateFileTags]);

  const tableId = useMemo(() => {
    return (table && table._id) || '';
  }, [table]);

  const recordsCount = useMemo(() => {
    return (recordsIds || []).length;
  }, [recordsIds]);

  const treeNodesCount = useMemo(() => {
    return (recordsTree || []).length;
  }, [recordsTree]);

  const treeNodeKeyRecordIdMap = useMemo(() => {
    // treeNodeKeyRecordIdMap: { [node_key]: _id, ... }
    return recordsTree ? generateKeyTreeNodeRowIdMap(recordsTree) : {};
  }, [recordsTree]);

  const hasNoRecords = useMemo(() => {
    return recordsCount === 0 && !hasMoreRecords;
  }, [recordsCount, hasMoreRecords]);

  const tableColumns = useMemo(() => {
    return (table && table.columns) || [];
  }, [table]);

  const sequenceColumnWidth = useMemo(() => {
    return showSequenceColumn ? SEQUENCE_COLUMN_WIDTH : 0;
  }, [showSequenceColumn]);

  const groupbysCount = useMemo(() => {
    return (groupbys || []).length;
  }, [groupbys]);

  const groupOffset = useMemo(() => {
    return groupbysCount * GROUP_VIEW_OFFSET;
  }, [groupbysCount]);

  const getCopiedRecordsAndColumnsFromRange = useCallback(({ type, copied, columns, isGroupView }) => {
    return gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
  }, [gridUtils]);

  const getUpdateDraggedRecords = useCallback((draggedRange, columns, rows, idRowMap, groupMetrics, canModifyRow, canModifyColumn) => {
    return gridUtils.getUpdateDraggedRecords(draggedRange, columns, rows, idRowMap, groupMetrics, canModifyRow, canModifyColumn);
  }, [gridUtils]);

  const getInternalClientCellValueDisplayString = useCallback((record, column) => {
    if (getClientCellValueDisplayString) {
      return getClientCellValueDisplayString(record, column);
    }
    return getCellValueByColumn(record, column);
  }, [getClientCellValueDisplayString]);

  return (
    <div className={classnames('sf-table-main-container container-fluid p-0', { [`group-level-${groupbysCount + 1}`]: groupbysCount > 0, 'sf-table-tree': showRecordAsTree })}>
      {isLoading && (
        <div className="sf-table-canvas-ctx-wrapper">
          <CenteredLoading />
        </div>
      )}
      {!isLoading && hasNoRecords && (
        <div className="sf-table-canvas-ctx-wrapper">
          <EmptyTip text={noRecordsTipsText || gettext('No record')} />
          <ContextMenu
            createContextMenuOptions={customProps.createContextMenuOptions}
            selectedPosition={{ idx: -1, rowIdx: -1 }}
          />
        </div>
      )}
      {!isLoading && !hasNoRecords && (
        <Records
          {...customProps}
          table={table}
          tableId={tableId}
          tableColumns={tableColumns}
          columns={visibleColumns}
          headerSettings={headerSettings}
          recordIds={recordsIds}
          recordsCount={recordsCount}
          groupbys={groupbys}
          groups={groups}
          groupOffsetLeft={groupOffset}
          showSequenceColumn={showSequenceColumn}
          sequenceColumnWidth={sequenceColumnWidth}
          hasMoreRecords={hasMoreRecords}
          showGridFooter={showGridFooter}
          showRecordAsTree={showRecordAsTree}
          recordsTree={recordsTree}
          treeNodesCount={treeNodesCount}
          treeNodeKeyRecordIdMap={treeNodeKeyRecordIdMap}
          scrollToLoadMore={enableScrollToLoad ? loadMore : undefined}
          loadMore={loadMore}
          loadAll={loadAll}
          isLoadingMore={isLoadingMore}
          getTreeNodeByIndex={getTreeNodeByIndex}
          recordGetterById={recordGetterById}
          recordGetterByIndex={recordGetterByIndex}
          getClientCellValueDisplayString={getInternalClientCellValueDisplayString}
          getCopiedRecordsAndColumnsFromRange={getCopiedRecordsAndColumnsFromRange}
          getUpdateDraggedRecords={getUpdateDraggedRecords}
          updateFileTags={updateFileTags}
        />
      )}
    </div>
  );

};

TableMain.propTypes = {
  table: PropTypes.object,
  tableColumns: PropTypes.array,
  visibleColumns: PropTypes.array,
  showSequenceColumn: PropTypes.bool,
  recordsIds: PropTypes.array,
  groupbys: PropTypes.array,
  groups: PropTypes.array,
  noRecordsTipsText: PropTypes.string,
  recordsTree: PropTypes.array,
  showRecordAsTree: PropTypes.bool,
  modifyRecord: PropTypes.func,
  modifyRecords: PropTypes.func,
  enableScrollToLoad: PropTypes.bool,
  loadMore: PropTypes.func,
  loadAll: PropTypes.func,
  isLoading: PropTypes.bool,
  updateFileTags: PropTypes.func,
  canModifyColumn: PropTypes.func,
  /**
   * External GridUtils instance. If provided, this will be used instead of
   * internally creating one. Useful for metadata tables.
   */
  gridUtils: PropTypes.object,
};

export default TableMain;
