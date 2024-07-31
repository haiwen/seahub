import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Records from './records';
import { GROUP_VIEW_OFFSET } from '../../../constants';
import GridUtils from '../../../utils/grid-utils';
import { useRecordDetails } from '../../../hooks';

import './index.css';

const TableMain = ({ metadata, modifyRecord, modifyRecords, loadMore, loadAll, searchResult, ...params }) => {
  const gridUtils = useMemo(() => {
    return new GridUtils(metadata, { modifyRecord, modifyRecords });
  }, [metadata, modifyRecord, modifyRecords]);
  const { openRecordDetails } = useRecordDetails();

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

  const updateRecord = useCallback(({ rowId, updates, originalUpdates, oldRowData, originalOldRowData }) => {
    modifyRecord && modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [modifyRecord]);

  const updateRecords = useCallback(({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isCopyPaste = false }) => {
    modifyRecords && modifyRecords(recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData, isCopyPaste);
  }, [modifyRecords]);

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
        groupOffsetLeft={groupOffset}
        modifyRecord={updateRecord}
        updateRecords={updateRecords}
        onRowExpand={openRecordDetails}
        {...params}
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
