import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Records from './records';
import GridUtils from '../utils/grid-utils';
import { GROUP_VIEW_OFFSET } from '../../../constants';

import './index.css';

const TableMain = ({ metadata, modifyRecord, modifyRecords, loadMore, loadAll, searchResult, recordGetterByIndex, recordGetterById, modifyColumnData, ...props }) => {

  const gridUtils = useMemo(() => {
    return new GridUtils(metadata, { modifyRecord, modifyRecords, recordGetterByIndex, recordGetterById, modifyColumnData });
  }, [metadata, modifyRecord, modifyRecords, recordGetterByIndex, recordGetterById, modifyColumnData]);

  const groupbysCount = useMemo(() => {
    const groupbys = metadata?.view?.groupbys || [];
    return groupbys.length;
  }, [metadata]);

  const groupOffset = useMemo(() => {
    return groupbysCount * GROUP_VIEW_OFFSET;
  }, [groupbysCount]);

  const columns = useMemo(() => {
    const { columns, hidden_columns } = metadata.view;
    return columns.filter(column => !hidden_columns.includes(column.key));
  }, [metadata]);

  const getCopiedRecordsAndColumnsFromRange = useCallback(({ type, copied, isGroupView }) => {
    return gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
  }, [gridUtils, columns]);

  const updateRecord = useCallback(({ rowId, updates, originalUpdates, oldRowData, originalOldRowData }) => {
    modifyRecord && modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [modifyRecord]);

  const updateRecords = useCallback(({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isCopyPaste = false }) => {
    modifyRecords && modifyRecords(recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isCopyPaste);
  }, [modifyRecords]);

  const paste = useCallback(({ type, copied, multiplePaste, pasteRange, isGroupView }) => {
    gridUtils.paste({ type, copied, multiplePaste, pasteRange, isGroupView, columns });
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
        updateRecords={updateRecords}
        deleteRecords={props.deleteRecords}
        getCopiedRecordsAndColumnsFromRange={getCopiedRecordsAndColumnsFromRange}
        recordGetterById={recordGetterById}
        recordGetterByIndex={recordGetterByIndex}
        modifyColumnData={modifyColumnData}
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
