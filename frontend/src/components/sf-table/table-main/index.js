import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import EmptyTip from '../../empty-tip';
import Records from './records';
import { gettext } from '../../../utils/constants';
import { GROUP_VIEW_OFFSET } from '../constants/group';
import { SEQUENCE_COLUMN_WIDTH } from '../constants/grid';
import { getCellValueByColumn } from '../utils/cell';
import GridUtils from '../utils/grid-utils';
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
  isLoadingMoreRecords,
  showGridFooter,
  recordsTree,
  showRecordAsTree,
  loadMore,
  loadAll,
  getTreeNodeByIndex,
  recordGetterByIndex,
  recordGetterById,
  getClientCellValueDisplayString,
  ...customProps
}) => {

  const gridUtils = useMemo(() => {
    return new GridUtils(recordsIds, {
      recordGetterByIndex,
      recordGetterById,
    });
  }, [recordsIds, recordGetterByIndex, recordGetterById]);

  const tableId = useMemo(() => {
    return (table && table._id) || '';
  }, [table]);

  const recordsCount = useMemo(() => {
    return recordsIds.length;
  }, [recordsIds]);

  const treeNodesCount = useMemo(() => {
    return recordsTree.length;
  }, [recordsTree]);

  const treeNodeKeyRecordIdMap = useMemo(() => {
    // treeNodeKeyRecordIdMap: { [node_key]: _id, ... }
    return generateKeyTreeNodeRowIdMap(recordsTree);
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
    return groupbys.length;
  }, [groupbys]);

  const groupOffset = useMemo(() => {
    return groupbysCount * GROUP_VIEW_OFFSET;
  }, [groupbysCount]);

  const getCopiedRecordsAndColumnsFromRange = useCallback(({ type, copied, columns, isGroupView }) => {
    return gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
  }, [gridUtils]);

  const getInternalClientCellValueDisplayString = useCallback((record, column) => {
    if (getClientCellValueDisplayString) {
      return getClientCellValueDisplayString(record, column);
    }
    return getCellValueByColumn(record, column);
  }, [getClientCellValueDisplayString]);

  return (
    <div className={classnames('sf-table-main-container container-fluid p-0', { [`group-level-${groupbysCount + 1}`]: groupbysCount > 0, 'sf-table-tree': showRecordAsTree })}>
      {hasNoRecords && <EmptyTip text={noRecordsTipsText || gettext('No record')} />}
      {!hasNoRecords &&
        <Records
          {...customProps}
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
          scrollToLoadMore={loadMore}
          loadAll={loadAll}
          getTreeNodeByIndex={getTreeNodeByIndex}
          recordGetterById={recordGetterById}
          recordGetterByIndex={recordGetterByIndex}
          getClientCellValueDisplayString={getInternalClientCellValueDisplayString}
          getCopiedRecordsAndColumnsFromRange={getCopiedRecordsAndColumnsFromRange}
        />
      }
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
  modifyRecords: PropTypes.func,
  loadMore: PropTypes.func,
  loadAll: PropTypes.func,
  onDrop: PropTypes.func,
  createGhostElement: PropTypes.func,
};

export default TableMain;
