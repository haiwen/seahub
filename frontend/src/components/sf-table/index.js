import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import TableMain from './table-main';

import './index.css';

const SFTable = ({
  table,
  visibleColumns,
  headerSettings,
  recordsIds,
  groupbys,
  groups,
  showSequenceColumn,
  isGroupView,
  noRecordsTipsText,
  isLoadingMoreRecords,
  hasMoreRecords,
  showGridFooter,
  onGridKeyDown,
  onGridKeyUp,
  loadMore,
  loadAll,
  ...customProps
}) => {
  const containerRef = useRef(null);

  const getTableContentRect = useCallback(() => {
    return containerRef.current?.getBoundingClientRect() || { x: 0, right: window.innerWidth };
  }, [containerRef]);

  const recordGetterById = useCallback((recordId) => {
    return table.id_row_map[recordId];
  }, [table]);

  const recordGetter = useCallback((recordIndex) => {
    const recordId = recordsIds[recordIndex];
    return recordId && recordGetterById(recordId);
  }, [recordsIds, recordGetterById]);

  const groupRecordGetter = useCallback((groupRecordIndex) => {
    if (!window.sfTableBody || !window.sfTableBody.getGroupRecordByIndex) return null;
    const groupRecord = window.sfTableBody.getGroupRecordByIndex(groupRecordIndex);
    const recordId = groupRecord.rowId;
    return recordId && recordGetterById(recordId);
  }, [recordGetterById]);

  const recordGetterByIndex = useCallback(({ isGroupView, groupRecordIndex, recordIndex }) => {
    if (isGroupView) return groupRecordGetter(groupRecordIndex);
    return recordGetter(recordIndex);
  }, [groupRecordGetter, recordGetter]);

  const beforeUnloadHandler = useCallback(() => {
    if (window.sfTableBody) {
      window.sfTableBody.storeScrollPosition && window.sfTableBody.storeScrollPosition();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler, false);
  });

  return (
    <div className={classnames('sf-table-wrapper', { 'no-sequence-column': !showSequenceColumn })} ref={containerRef}>
      <TableMain
        {...customProps}
        table={table}
        visibleColumns={visibleColumns}
        headerSettings={headerSettings}
        recordsIds={recordsIds}
        groupbys={groupbys}
        groups={groups}
        showSequenceColumn={showSequenceColumn}
        isGroupView={isGroupView}
        noRecordsTipsText={noRecordsTipsText}
        hasMoreRecords={hasMoreRecords}
        isLoadingMoreRecords={isLoadingMoreRecords}
        showGridFooter={showGridFooter}
        loadMore={loadMore}
        loadAll={loadAll}
        getTableContentRect={getTableContentRect}
        onGridKeyDown={onGridKeyDown}
        onGridKeyUp={onGridKeyUp}
        recordGetterById={recordGetterById}
        recordGetterByIndex={recordGetterByIndex}
      />
    </div>
  );
};

SFTable.propTypes = {
  /**
   * table: { _id, rows, id_row_map, columns, ... }
   */
  table: PropTypes.object,
  recordsIds: PropTypes.array,
  /**
   * columns: [column, ...]
   * column: {
   *  key, name, width, frozen, icon_name, is_name_column, is_private, editable, formatter, editor, editable,
   *  editable_via_click_cell,
   *  is_popup_editor, e.g. options-selector
   *  is_support_direct_edit, e.g. checkbox
   *  is_support_preview, e.g. image
   *  ...
   * }
   */
  visibleColumns: PropTypes.array.isRequired,
  headerSettings: PropTypes.object,
  showSequenceColumn: PropTypes.bool,
  groupbys: PropTypes.array,
  groups: PropTypes.array,
  isGroupView: PropTypes.bool,
  noRecordsTipsText: PropTypes.string,
  hasMoreRecords: PropTypes.bool,
  isLoadingMoreRecords: PropTypes.bool,
  showGridFooter: PropTypes.bool,
  canModifyRecords: PropTypes.bool,
  supportCopy: PropTypes.bool,
  supportCut: PropTypes.bool,
  supportPaste: PropTypes.bool,
  supportDragFill: PropTypes.bool,
  checkCanModifyRecord: PropTypes.func,
  checkCellValueChanged: PropTypes.func, // for complex cell value compare
  onGridKeyDown: PropTypes.func,
  onGridKeyUp: PropTypes.func,
  loadMore: PropTypes.func,
  loadAll: PropTypes.func,
};

SFTable.defaultProps = {
  recordsIds: [],
  groupbys: [],
  groups: [],
  isGroupView: false,
  showSequenceColumn: true,
  hasMoreRecords: false,
  isLoadingMoreRecords: false,
  showGridFooter: true,
  canModifyRecords: false,
  supportCopy: false,
  supportCut: false,
  supportPaste: false,
  supportDragFill: false,
};

export default SFTable;
