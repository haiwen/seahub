import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Formatter from './formatter';
import { Utils } from '../../../../../../../utils/utils';
import { siteRoot } from '../../../../../../../utils/constants';
import ObjectUtils from '../../../../../../../utils/object';
import { isCellValueChanged, getCellValueByColumn } from '../../../../../../utils/cell';
import { CellType, PRIVATE_COLUMN_KEYS, TABLE_SUPPORT_EDIT_TYPE_MAP, EVENT_BUS_TYPE } from '../../../../../../constants';
import { checkIsDir } from '../../../../../../utils/row';
import { useTags } from '../../../../../../../tag/hooks';

import './index.css';

const Cell = React.memo(({
  needBindEvents = true,
  metadata,
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
}) => {
  const { tagsData } = useTags();
  const canEditable = useMemo(() => {
    const { type } = column;
    if (!window.sfMetadataContext.canModifyColumn(column)) return false;
    if (!TABLE_SUPPORT_EDIT_TYPE_MAP[type]) return false;
    if (type === CellType.TAGS) return !checkIsDir(record);
    return true;
  }, [column, record]);

  const className = useMemo(() => {
    const { type } = column;
    return classnames('sf-metadata-result-table-cell', `sf-metadata-result-table-${type}-cell`, highlightClassName, {
      'table-cell-uneditable': !canEditable,
      'last-cell': isLastCell,
      'table-last--frozen': isLastFrozenCell,
      'cell-selected': isCellSelected,
    });
  }, [canEditable, column, highlightClassName, isLastCell, isLastFrozenCell, isCellSelected]);

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
      value['backgroundColor'] = bgColor;
    }
    return value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen, height, column, column.left, bgColor]);

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
    const { key: columnKey, name: columnName } = column;
    const oldRowData = PRIVATE_COLUMN_KEYS.includes(columnKey) ? { [columnKey]: originalOldCellValue } : { [columnName]: originalOldCellValue };
    const originalOldRowData = { [columnKey]: originalOldCellValue }; // { [column.key]: cellValue }
    return { oldRowData, originalOldRowData };
  }, [column]);

  const modifyRecord = useCallback((updated) => {
    if (!Utils.isFunction(cellMetaData.modifyRecord)) return;
    const { key: columnKey, type: columnType, name: columnName } = column;
    const originalOldCellValue = getCellValueByColumn(record, column);
    if (!isCellValueChanged(originalOldCellValue, updated[columnKey], columnType)) return;
    const rowId = record._id;
    const key = Object.keys(updated)[0];
    const updates = PRIVATE_COLUMN_KEYS.includes(columnKey) ? updated : { [columnName]: updated[key] };
    const { oldRowData, originalOldRowData } = getOldRowData(originalOldCellValue);
    // updates used for update remote record data
    // originalUpdates used for update local record data
    // oldRowData ues for undo/undo modify record
    // originalOldRowData ues for undo/undo modify record
    cellMetaData.modifyRecord({ rowId, cellKey: columnKey, updates, originalUpdates: updated, oldRowData, originalOldRowData });
  }, [cellMetaData, record, column, getOldRowData]);

  const onFileNameClick = useCallback((event) => {
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    if (!isCellSelected) return;
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const { showFolder, commitID, baseDir, folderPath } = metadata;
    if (showFolder) {
      // render trash folder
      if (record.type == 'dir') {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOAD_TRASH_FOLDER_RECORDS, commitID, baseDir, Utils.joinPath(folderPath, record.name));
      } else {
        window.open(`${siteRoot}repo/${repoID}/trash/files/?obj_id=${record.obj_id}&commit_id=${commitID}&base=${encodeURIComponent(baseDir)}&p=${encodeURIComponent(Utils.joinPath(folderPath, record.name))}`);
      }
    } else {
    // render trash
      const { is_dir } = record;
      if (is_dir) {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOAD_TRASH_FOLDER_RECORDS, record.commit_id, record.parent_dir, Utils.joinPath('/', record.obj_name));
      } else {
        window.open(`${siteRoot}repo/${repoID}/trash/files/?obj_id=${record.obj_id}&commit_id=${record.commit_id}&base=${encodeURIComponent(record.parent_dir)}&p=${encodeURIComponent('/' + record.obj_name)}`);
      }
    }
  }, [isCellSelected, record, metadata]);

  const cellValue = getCellValueByColumn(record, column);
  const cellEvents = needBindEvents && getEvents();
  const containerProps = {
    className,
    style,
    ...cellEvents,
  };

  return (
    <div key={`${record._id}-${column.key}`} {...containerProps}>
      <Formatter
        isCellSelected={isCellSelected}
        value={cellValue}
        field={column}
        onChange={modifyRecord}
        record={record}
        tagsData={tagsData}
        onFileNameClick={onFileNameClick}
      />
    </div>
  );
}, (props, nextProps) => {
  const { record: oldRecord, column, isCellSelected, isLastCell, highlightClassName, height, bgColor } = props;
  const { record: newRecord, highlightClassName: newHighlightClassName, height: newHeight, column: newColumn, bgColor: newBgColor } = nextProps;
  // the modification of column is not currently supported, only the modification of cell data is considered
  const oldValue = oldRecord[column.name] || oldRecord[column.key];
  const newValue = newRecord[column.name] || newRecord[column.key];
  const isChanged = (
    isCellValueChanged(oldValue, newValue, column.type) ||
    oldRecord._last_modifier !== newRecord._last_modifier ||
    isCellSelected !== nextProps.isCellSelected ||
    isLastCell !== nextProps.isLastCell ||
    highlightClassName !== newHighlightClassName ||
    height !== newHeight ||
    column.left !== newColumn.left ||
    column.width !== newColumn.width ||
    bgColor !== newBgColor ||
    !ObjectUtils.isSameObject(column.data, newColumn.data) ||
    props.groupRecordIndex !== nextProps.groupRecordIndex ||
    props.recordIndex !== nextProps.recordIndex
  );
  return !isChanged;
});

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
  lockRecordViaButton: PropTypes.func,
  modifyRecordViaButton: PropTypes.func,
  reloadCurrentRecord: PropTypes.func,
  highlightClassName: PropTypes.string,
  bgColor: PropTypes.string,
};

export default Cell;
