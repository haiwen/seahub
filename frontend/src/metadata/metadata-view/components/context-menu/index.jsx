import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getColumnByKey, PRIVATE_COLUMN_KEY } from '../../_basic';
import { gettext } from '../../utils';
import { siteRoot } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { useMetadata } from '../../hooks';
import toaster from '../../../../components/toast';

import './index.css';

const OPERATION = {
  CLEAR_SELECTED: 'clear-selected',
  COPY_SELECTED: 'copy-selected',
  OPEN_PARENT_FOLDER: 'open-parent-folder',
  OPEN_IN_NEW_TAB: 'open-new-tab',
  GENERATE_SUMMARY: 'generate-summary',
};

const ContextMenu = ({
  isGroupView,
  selectedRange,
  selectedPosition,
  recordMetrics,
  recordGetterByIndex,
  onClearSelected,
  onCopySelected,
  updateRecords,
}) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { metadata } = useMetadata();

  const options = useMemo(() => {
    if (!visible) return [];
    const permission = window.sfMetadataContext.getPermission();
    const isReadonly = permission === 'r';
    const { columns } = metadata;
    const summaryColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.FILE_SUMMARY);
    const canModifyRow = window.sfMetadataContext.canModifyRow;
    let list = [];

    if (selectedRange) {
      !isReadonly && list.push({ value: OPERATION.CLEAR_SELECTED, label: gettext('Clear selected') });
      list.push({ value: OPERATION.COPY_SELECTED, label: gettext('Copy selected') });

      if (summaryColumn) {
        const { topLeft, bottomRight } = selectedRange;
        for (let i = topLeft.rowIdx; i <= bottomRight.rowIdx; i++) {
          const record = recordGetterByIndex({ isGroupView, groupRecordIndex: topLeft.groupRecordIndex, recordIndex: i });
          const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
          if (Utils.isSdocFile(fileName) && canModifyRow(record)) {
            list.push({ value: OPERATION.GENERATE_SUMMARY, label: gettext('Generate summary') });
            break;
          }
        }
      }
      return list;
    }

    const selectedRecords = Object.keys(recordMetrics.idSelectedRecordMap);
    if (selectedRecords.length > 1) {
      if (summaryColumn) {
        const isIncludeSdocRecord = selectedRecords.filter(id => {
          const record = metadata.id_row_map[id];
          if (record) {
            const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
            return Utils.isSdocFile(fileName) && canModifyRow(record);
          }
          return false;
        });
        if (isIncludeSdocRecord.length > 0) {
          list.push({ value: OPERATION.GENERATE_SUMMARY, label: gettext('Generate summary') });
        }
      }
      return list;
    }

    if (!selectedPosition) return list;
    const { groupRecordIndex, rowIdx: recordIndex } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });
    if (!record) return list;
    const isFolder = record[PRIVATE_COLUMN_KEY.IS_DIR];
    list.push({ value: OPERATION.OPEN_IN_NEW_TAB, label: isFolder ? gettext('Open folder in new tab') : gettext('Open file in new tab') });
    list.push({ value: OPERATION.OPEN_PARENT_FOLDER, label: gettext('Open parent folder') });
    if (summaryColumn) {
      const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
      if (Utils.isSdocFile(fileName) && canModifyRow(record)) {
        list.push({ value: OPERATION.GENERATE_SUMMARY, label: gettext('Generate summary') });
      }
    }

    return list;
  }, [visible, isGroupView, selectedPosition, recordMetrics, selectedRange, metadata, recordGetterByIndex]);

  const handleHide = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef]);

  const onOpenFileInNewTab = useCallback(() => {
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    if (!record) return;
    const repoID = window.sfMetadataStore.repoId;
    const isFolder = record[PRIVATE_COLUMN_KEY.IS_DIR];
    const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];

    let url;
    if (isFolder) {
      url = window.location.origin + window.location.pathname + Utils.encodePath(Utils.joinPath(parentDir, fileName));
    } else {
      url = `${siteRoot}lib/${repoID}/file${Utils.encodePath(Utils.joinPath(parentDir, fileName))}`;
    }

    window.open(url, '_blank');
  }, [isGroupView, recordGetterByIndex, selectedPosition]);

  const onOpenParentFolder = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    if (!record) return;
    const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    const url = window.location.origin + window.location.pathname + Utils.encodePath(parentDir);
    window.open(url, '_blank');
  }, [isGroupView, recordGetterByIndex, selectedPosition]);

  const generateSummary = useCallback(() => {
    const canModifyRow = window.sfMetadataContext.canModifyRow;
    const selectedRecords = Object.keys(recordMetrics.idSelectedRecordMap);
    const summaryColumnKey = PRIVATE_COLUMN_KEY.FILE_SUMMARY;
    let paths = [];
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    if (selectedRange) {
      const { topLeft, bottomRight } = selectedRange;
      for (let i = topLeft.rowIdx; i <= bottomRight.rowIdx; i++) {
        const record = recordGetterByIndex({ isGroupView, groupRecordIndex: topLeft.groupRecordIndex, recordIndex: i });
        if (!canModifyRow(record)) continue;
        const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
        if (!Utils.isSdocFile(fileName)) continue;
        const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
        paths.push(Utils.joinPath(parentDir, fileName));
        idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
        idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
      }
    } else if (selectedRecords.length > 0) {
      selectedRecords.forEach(recordId => {
        const record = metadata.id_row_map[recordId];
        const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
        if (Utils.isSdocFile(fileName) && canModifyRow(record)) {
          const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
          paths.push(Utils.joinPath(parentDir, fileName));
          idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
          idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
        }
      });
    } else if (selectedPosition) {
      const { groupRecordIndex, rowIdx } = selectedPosition;
      const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
      const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
      if (Utils.isSdocFile(fileName) && canModifyRow(record)) {
        const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
        paths.push(Utils.joinPath(parentDir, fileName));
        idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
        idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
      }
    }
    if (paths.length === 0) return;
    window.sfMetadataContext.generateSummary(paths).then(res => {
      const updatedRecords = res.data.rows;
      let recordIds = [];
      let idRecordUpdates = {};
      let idOriginalRecordUpdates = {};
      updatedRecords.forEach(updatedRecord => {
        const { _id: updateRecordId, _summary } = updatedRecord;
        recordIds.push(updateRecordId);
        idRecordUpdates[updateRecordId] = { [summaryColumnKey]: _summary };
        idOriginalRecordUpdates[updateRecordId] = { [summaryColumnKey]: _summary };
      });
      updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
    }).catch(error => {
      const errorMessage = gettext('Failed to generate summary');
      toaster.danger(errorMessage);
    });
  }, [isGroupView, selectedRange, selectedPosition, recordMetrics, metadata, recordGetterByIndex, updateRecords]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    switch (option.value) {
      case OPERATION.OPEN_IN_NEW_TAB: {
        onOpenFileInNewTab();
        break;
      }
      case OPERATION.OPEN_PARENT_FOLDER: {
        onOpenParentFolder(event);
        break;
      }
      case OPERATION.COPY_SELECTED: {
        onCopySelected && onCopySelected();
        break;
      }
      case OPERATION.CLEAR_SELECTED: {
        onClearSelected && onClearSelected();
        break;
      }
      case OPERATION.GENERATE_SUMMARY: {
        generateSummary && generateSummary();
        break;
      }
      default: {
        break;
      }
    }
    setVisible(false);
  }, [onOpenFileInNewTab, onOpenParentFolder, onCopySelected, onClearSelected, generateSummary]);

  const getMenuPosition = (x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;

    const { innerWidth, innerHeight } = window;
    const rect = menuRef.current.getBoundingClientRect();

    // Calculate the offset of the parent components
    const parentRect = menuRef.current.parentElement.getBoundingClientRect();
    const offsetX = parentRect.left;
    const offsetY = parentRect.top;

    // Adjust the position based on the offset
    menuStyles.top = y - offsetY;
    menuStyles.left = x - offsetX;

    const metadataResultFooterHeight = 32;
    const contentHeight = innerHeight - metadataResultFooterHeight;
    if (y + rect.height > contentHeight) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > innerWidth) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.height < contentHeight ? (contentHeight - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }
    return menuStyles;
  };

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      setVisible(true);

      const position = getMenuPosition(event.clientX, event.clientY);
      setPosition(position);
    };

    document.addEventListener('contextmenu', handleShow);

    return () => {
      document.removeEventListener('contextmenu', handleShow);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      document.addEventListener('mousedown', handleHide);
    } else {
      document.removeEventListener('mousedown', handleHide);
    }

    return () => {
      document.removeEventListener('mousedown', handleHide);
    };
  }, [visible, handleHide]);

  if (!visible) return null;
  if (options.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className='dropdown-menu sf-metadata-contextmenu'
      style={position}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className='dropdown-item sf-metadata-contextmenu-item'
          onClick={(event) => handleOptionClick(event, option)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

ContextMenu.propTypes = {
  isGroupView: PropTypes.bool,
  selectedRange: PropTypes.object,
  selectedPosition: PropTypes.object,
  recordMetrics: PropTypes.object,
  recordGetterByIndex: PropTypes.func,
};

export default ContextMenu;
