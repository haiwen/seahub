import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { gettext, enableSeafileAI } from '../../utils/constants';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import { getFileName } from '../../tag/utils/file';
import RowUtils from '../../metadata/views/table/utils/row-utils';
import { checkIsDir } from '../../metadata/utils/row';
import { Utils } from '../../utils/utils';
import { getFileNameFromRecord } from '../../metadata/utils/cell';
import { getColumnByKey } from '../../metadata/utils/column';
import { openInNewTab, openParentFolder } from '../../metadata/utils/file';
import MetadataTableSearcher from '../../metadata/views/table/table-searcher';

const TableFilesToolbar = ({ repoID }) => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const metadataRef = useRef([]);
  const menuRef = useRef(null);

  const canModify = window.sfMetadataContext && window.sfMetadataContext.canModify();
  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  const records = useMemo(() => selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || [], [selectedRecordIds]);

  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, []);
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const deleteRecords = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DELETE_RECORDS, selectedRecordIds, {
      success_callback: () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    });
  }, [eventBus, selectedRecordIds]);

  const toggleMoveDialog = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, records[0]);
  }, [eventBus, records]);

  const checkCanModifyRow = (row) => window.sfMetadataContext.canModifyRow(row);

  const getMenuList = useCallback(() => {
    const { EXTRACT_FILE_DETAIL, EXTRACT_FILE_DETAILS, OPEN_FILE_IN_NEW_TAB, OPEN_FOLDER_IN_NEW_TAB, OPEN_PARENT_FOLDER, GENERATE_DESCRIPTION, OCR } = TextTranslation;
    const length = selectedRecordIds.length;
    const list = [];
    if (length > 1) {
      if (enableSeafileAI) {
        const imageOrVideoRecords = records.filter(record => {
          if (checkIsDir(record) || !checkCanModifyRow(record)) return false;
          const fileName = getFileName(record);
          return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
        });
        if (imageOrVideoRecords.length > 0) {
          list.push(EXTRACT_FILE_DETAILS);
        }
      }

      return list;
    }

    const record = records[0];
    const isFolder = checkIsDir(record);
    const canModifyRow = checkCanModifyRow(record);

    list.push(isFolder ? OPEN_FOLDER_IN_NEW_TAB : OPEN_FILE_IN_NEW_TAB);
    list.push(OPEN_PARENT_FOLDER);

    const modifyOptions = [];

    if (modifyOptions.length > 0) {
      list.push('Divider');
      list.push(...modifyOptions);
    }

    if (enableSeafileAI && !isFolder && canModifyRow) {
      const { columns } = metadataRef.current;
      const fileName = getFileNameFromRecord(record);
      const isDescribableFile = canModifyRow && Utils.isDescriptionSupportedFile(fileName);
      const isImage = Utils.imageCheck(fileName);
      const isVideo = Utils.videoCheck(fileName);
      const isPDF = Utils.pdfCheck(fileName);
      const descriptionColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION);
      const aiOptions = [];

      if (isImage || isVideo) {
        aiOptions.push(EXTRACT_FILE_DETAIL);
      }

      if (descriptionColumn && isDescribableFile) {
        aiOptions.push(GENERATE_DESCRIPTION);
      }

      if (isImage || isPDF) {
        aiOptions.push(OCR);
      }

      if (aiOptions.length > 0) {
        list.push('Divider');
        list.push(...aiOptions);
      }
    }
    return list;
  }, [selectedRecordIds, records]);

  const onMenuItemClick = useCallback((operation) => {
    const records = selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean);
    switch (operation) {
      case TextTranslation.EXTRACT_FILE_DETAIL.key:
      case TextTranslation.EXTRACT_FILE_DETAILS.key: {
        const imageOrVideoRecords = records.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder) return false;
          const canModifyRow = checkCanModifyRow(record);
          if (!canModifyRow) return false;
          const fileName = getFileNameFromRecord(record);
          return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
        });
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_RECORD_DETAILS, imageOrVideoRecords);
        break;
      }
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key: {
        openInNewTab(repoID, records[0]);
        break;
      }
      case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key: {
        openParentFolder(records[0]);
        break;
      }
      case TextTranslation.OPEN_PARENT_FOLDER.key: {
        openParentFolder(records[0]);
        break;
      }
      case TextTranslation.GENERATE_DESCRIPTION.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_DESCRIPTION, records[0]);
        break;
      }
      case TextTranslation.OCR.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.OCR, records[0], menuRef.current.dropdownRef.current);
        break;
      }
      default:
        break;
    }
  }, [repoID, eventBus, selectedRecordIds]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata) => {
      metadataRef.current = metadata || [];
      setSelectedRecordIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const length = selectedRecordIds.length;
  
  // Show searcher when no records are selected
  if (length === 0) {
    return (
      <div className="cur-view-toolbar">
        <MetadataTableSearcher />
      </div>
    );
  }

  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>
      {(length === 1 && canModify) &&
        <>
          <span className="cur-view-path-btn" onClick={toggleMoveDialog}>
            <span className="sf3-font-move1 sf3-font" aria-label={gettext('Move')} title={gettext('Move')}></span>
          </span>
        </>
      }
      {canModify &&
        <span className="cur-view-path-btn" onClick={deleteRecords}>
          <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
        </span>
      }
      {length > 0 && (
        <ItemDropdownMenu
          ref={menuRef}
          item={{}}
          toggleClass="cur-view-path-btn sf3-font-more sf3-font"
          onMenuItemClick={onMenuItemClick}
          getMenuList={getMenuList}
        />
      )}
    </div>
  );
};

TableFilesToolbar.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default TableFilesToolbar;
