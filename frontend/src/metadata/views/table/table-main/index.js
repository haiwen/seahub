import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Records from './records';
import GridUtils from '../utils/grid-utils';
import { GROUP_VIEW_OFFSET, TABLE_NOT_DISPLAY_COLUMN_KEYS } from '../../../constants';
import { useMetadataStatus } from '../../../../hooks';

import './index.css';

const TableMain = ({
  metadata, modifyRecord, modifyRecords, loadMore, loadAll, searchResult, recordGetterByIndex, recordGetterById, insertColumn,
  modifyColumnData, updateFileTags,
  ...props
}) => {
  const { globalHiddenColumns } = useMetadataStatus();

  const gridUtils = useMemo(() => {
    return new GridUtils(metadata, {
      modifyRecord,
      modifyRecords,
      recordGetterByIndex,
      recordGetterById,
      modifyColumnData,
      updateFileTags,
    });
  }, [metadata, modifyRecord, modifyRecords, recordGetterByIndex, recordGetterById, modifyColumnData, updateFileTags]);

  const groupbysCount = useMemo(() => {
    const groupbys = metadata?.view?.groupbys || [];
    return groupbys.length;
  }, [metadata]);

  const groupOffset = useMemo(() => {
    return groupbysCount * GROUP_VIEW_OFFSET;
  }, [groupbysCount]);

  const columns = useMemo(() => {
    const { columns, hidden_columns } = metadata.view;
    return columns.filter(column => !globalHiddenColumns.includes(column.key) && !hidden_columns.includes(column.key) && !TABLE_NOT_DISPLAY_COLUMN_KEYS.includes(column.key));
  }, [metadata, globalHiddenColumns]);

  const getCopiedRecordsAndColumnsFromRange = useCallback(({ type, copied, isGroupView }) => {
    return gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
  }, [gridUtils, columns]);

  const updateRecord = useCallback(({ rowId, updates, originalUpdates, oldRowData, originalOldRowData }) => {
    modifyRecord && modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [modifyRecord]);

  const handleInsertColumn = useCallback((name, type, { key, data }) => {
    insertColumn && insertColumn(name, type, { key, data });
  }, [insertColumn]);

  const paste = useCallback(({ type, copied, multiplePaste, pasteRange, isGroupView, pasteSource, cutPosition, viewId }) => {
    gridUtils.paste({ type, copied, multiplePaste, pasteRange, isGroupView, columns, pasteSource, cutPosition, viewId });
  }, [gridUtils, columns]);

  return (
    <div className={classnames('table-main-container container-fluid p-0', { [`group-level-${groupbysCount + 1}`]: groupbysCount > 0 })}>
      <Records
        columns={columns}
        recordIds={metadata.view.rows || []}
        groups={metadata.view.groups}
        groupbys={metadata.view.groupbys}
        recordsCount={metadata?.view?.rows?.length || 0}
        table={metadata}
        hasMore={metadata.hasMore}
        gridUtils={gridUtils}
        scrollToLoadMore={loadMore}
        loadAll={loadAll}
        paste={paste}
        groupOffsetLeft={groupOffset}
        modifyRecord={updateRecord}
        deleteRecords={props.deleteRecords}
        getCopiedRecordsAndColumnsFromRange={getCopiedRecordsAndColumnsFromRange}
        recordGetterById={recordGetterById}
        recordGetterByIndex={recordGetterByIndex}
        modifyColumnData={modifyColumnData}
        insertColumn={handleInsertColumn}
        updateFileTags={updateFileTags}
        modifyRecords={modifyRecords}
        {...props}
      />
    </div>
  );

};

TableMain.propTypes = {
  metadata: PropTypes.object.isRequired,
  modifyRecord: PropTypes.func,
  modifyRecords: PropTypes.func,
  loadMore: PropTypes.func,
  loadAll: PropTypes.func,
  searchResult: PropTypes.object,
};

export default TableMain;
