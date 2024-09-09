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
  IMAGE_CAPTION: 'image-caption',
  IMAGE_SEARCH: 'image-search',
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
  getTableContentRect,
  getTableCanvasContainerRect,
  searchSimilarImages: searchSimilarImagesAPI,
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
          if (Utils.isSummarySupportedFile(fileName) && canModifyRow(record)) {
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
            return Utils.isSummarySupportedFile(fileName) && canModifyRow(record);
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
    const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
    if (summaryColumn) {
      if (Utils.isSummarySupportedFile(fileName) && canModifyRow(record)) {
        list.push({ value: OPERATION.GENERATE_SUMMARY, label: gettext('Generate summary') });
      } else if (Utils.imageCheck(fileName) && canModifyRow(record)) {
        list.push({ value: OPERATION.IMAGE_CAPTION, label: gettext('Generate image description') });
      }
    }
    if (Utils.imageCheck(fileName) && canModifyRow(record)) {
      list.push({ value: OPERATION.IMAGE_SEARCH, label: gettext('Search similar images') });
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
    let parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];

    if (window.location.pathname.endsWith('/')) {
      parentDir = parentDir.slice(1);
    }

    const url = window.location.origin + window.location.pathname + Utils.encodePath(parentDir);
    window.open(url, '_blank');
  }, [isGroupView, recordGetterByIndex, selectedPosition]);

  const generateSummary = useCallback(() => {
    const canModifyRow = window.sfMetadataContext.canModifyRow;
    const summaryColumnKey = PRIVATE_COLUMN_KEY.FILE_SUMMARY;
    let path = '';
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
    if (Utils.isSummarySupportedFile(fileName) && canModifyRow(record)) {
      const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
      path = Utils.joinPath(parentDir, fileName);
      idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
      idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
    }
    if (path === '') return;
    window.sfMetadataContext.generateSummary(path).then(res => {
      const summary = res.data.summary;
      const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
      const recordIds = [updateRecordId];
      let idRecordUpdates = {};
      let idOriginalRecordUpdates = {};
      idRecordUpdates[updateRecordId] = { [summaryColumnKey]: summary };
      idOriginalRecordUpdates[updateRecordId] = { [summaryColumnKey]: summary };
      updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
    }).catch(error => {
      const errorMessage = gettext('Failed to generate summary');
      toaster.danger(errorMessage);
    });
  }, [isGroupView, selectedPosition, recordGetterByIndex, updateRecords]);

  const imageCaption = useCallback(() => {
    const canModifyRow = window.sfMetadataContext.canModifyRow;
    const summaryColumnKey = PRIVATE_COLUMN_KEY.FILE_SUMMARY;
    let path = '';
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
    if (Utils.imageCheck(fileName) && canModifyRow(record)) {
      const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
      path = Utils.joinPath(parentDir, fileName);
      idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
      idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
    }
    if (path === '') return;
    window.sfMetadataContext.imageCaption(path).then(res => {
      const desc = res.data.desc;
      const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
      const recordIds = [updateRecordId];
      let idRecordUpdates = {};
      let idOriginalRecordUpdates = {};
      idRecordUpdates[updateRecordId] = { [summaryColumnKey]: desc };
      idOriginalRecordUpdates[updateRecordId] = { [summaryColumnKey]: desc };
      updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
    }).catch(error => {
      const errorMessage = gettext('Failed to generate image description');
      toaster.danger(errorMessage);
    });
  }, [isGroupView, selectedPosition, recordGetterByIndex, updateRecords]);

  const searchSimilarImages = useCallback(() => {
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    if (!record) return;
    searchSimilarImagesAPI && searchSimilarImagesAPI(record);
  }, [isGroupView, selectedPosition, recordGetterByIndex, searchSimilarImagesAPI]);

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
      case OPERATION.IMAGE_CAPTION: {
        imageCaption && imageCaption();
        break;
      }
      case OPERATION.IMAGE_SEARCH: {
        searchSimilarImages && searchSimilarImages();
        break;
      }
      default: {
        break;
      }
    }
    setVisible(false);
  }, [onOpenFileInNewTab, onOpenParentFolder, onCopySelected, onClearSelected, generateSummary, imageCaption, searchSimilarImages]);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;
    const rect = menuRef.current.getBoundingClientRect();
    const tableCanvasContainerRect = getTableCanvasContainerRect();
    const tableContentRect = getTableContentRect();
    const { right: innerWidth, bottom: innerHeight } = tableContentRect;
    menuStyles.top = menuStyles.top - tableCanvasContainerRect.top;
    menuStyles.left = menuStyles.left - tableCanvasContainerRect.left;

    if (y + rect.height > innerHeight - 10) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > innerWidth) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.bottom > innerHeight ? (innerHeight - 10 - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }
    return menuStyles;
  }, [getTableContentRect, getTableCanvasContainerRect]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  getTableContentRect: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
};

export default ContextMenu;
