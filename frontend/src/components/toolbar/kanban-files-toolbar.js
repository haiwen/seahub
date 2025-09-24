import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import RowUtils from '../../metadata/views/table/utils/row-utils';
import { checkIsDir } from '../../metadata/utils/row';
import { Utils } from '../../utils/utils';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../metadata/utils/cell';
import { openInNewTab, openParentFolder } from '../../metadata/utils/file';
import { buildKanbanToolbarMenuOptions } from '../../metadata/utils/menu-builder';
import { useMetadataStatus } from '../../hooks';
import { getColumnByKey } from '../sf-table/utils/column';

const KanbanFilesToolbar = ({ repoID }) => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [metadata, setMetadata] = useState({});
  const metadataRef = useRef([]);
  const menuRef = useRef(null);

  const { enableFaceRecognition, enableTags } = useMetadataStatus();

  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  const records = useMemo(() => selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || [], [selectedRecordIds]);

  const areRecordsInSameFolder = useMemo(() => {
    if (records.length <= 1) return true;
    const firstPath = records[0] ? getParentDirFromRecord(records[0]) : null;
    return firstPath && records.every(record => getParentDirFromRecord(record) === firstPath);
  }, [records]);

  const readOnly = !window.sfMetadataContext.canModify();
  const isMultiple = selectedRecordIds.length > 1;

  const toolbarMenuOptions = useMemo(() => {
    if (!records.length || !metadata.columns) return [];
    const metadataStatus = {
      enableFaceRecognition,
      enableGenerateDescription: getColumnByKey(metadataRef.current.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    return buildKanbanToolbarMenuOptions(
      records,
      readOnly,
      metadataStatus,
      isMultiple,
      areRecordsInSameFolder,
      false
    );
  }, [records, metadata.columns, enableFaceRecognition, enableTags, readOnly, isMultiple, areRecordsInSameFolder]);

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
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, records);
  }, [eventBus, records]);

  const toggleCopyDialog = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, records);
  }, [eventBus, records]);

  const downloadRecords = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_RECORDS, selectedRecordIds);
  }, [eventBus, selectedRecordIds]);

  const getMenuList = useCallback(() => {
    return toolbarMenuOptions;
  }, [toolbarMenuOptions]);

  const onMenuItemClick = useCallback((operation) => {
    switch (operation) {
      // Basic file operations
      case TextTranslation.MOVE.key:
      case TextTranslation.MOVE_FILE.key:
      case TextTranslation.MOVE_FOLDER.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, records);
        break;
      }
      case TextTranslation.COPY.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, records);
        break;
      }
      case TextTranslation.DOWNLOAD.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_RECORDS, selectedRecordIds);
        break;
      }

      // AI operations
      case TextTranslation.EXTRACT_FILE_DETAIL.key:
      case TextTranslation.EXTRACT_FILE_DETAILS.key: {
        const imageOrVideoRecords = records.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder || readOnly) return false;
          const fileName = getFileNameFromRecord(record);
          return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
        });

        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_RECORD_DETAILS, imageOrVideoRecords);
        break;
      }
      case TextTranslation.DETECT_FACES.key: {
        const imageRecords = records.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder || readOnly) return false;
          const fileName = getFileNameFromRecord(record);
          return Utils.imageCheck(fileName);
        });

        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_FACE_RECOGNITION, imageRecords);
        break;
      }
      case TextTranslation.GENERATE_DESCRIPTION.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_DESCRIPTION, records[0]);
        break;
      }
      case TextTranslation.GENERATE_TAGS.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_FILE_TAGS, records[0]);
        break;
      }
      case TextTranslation.EXTRACT_TEXT.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.EXTRACT_TEXT, records[0], menuRef.current.dropdownRef.current);
        break;
      }

      // Navigation operations
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
      case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key: {
        openInNewTab(repoID, records[0]);
        break;
      }
      case TextTranslation.OPEN_PARENT_FOLDER.key: {
        openParentFolder(records[0]);
        break;
      }

      // File management operations
      case TextTranslation.RENAME.key:
      case TextTranslation.RENAME_FILE.key:
      case TextTranslation.RENAME_FOLDER.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR);
        break;
      }

      default:
        break;
    }
  }, [eventBus, records, selectedRecordIds, readOnly, repoID]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadataObj) => {
      metadataRef.current = metadataObj || [];
      setMetadata(metadataObj || {});
      setSelectedRecordIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const length = selectedRecordIds.length;

  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>

      {!isMultiple && !readOnly && (
        <>
          <span
            className="cur-view-path-btn"
            onClick={toggleMoveDialog}
            title={gettext('Move')}
          >
            <span className="sf3-font-move1 sf3-font" aria-label={gettext('Move')}></span>
          </span>
          <span
            className="cur-view-path-btn"
            onClick={toggleCopyDialog}
            title={gettext('Copy')}
          >
            <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')}></span>
          </span>
        </>
      )}

      <span
        className="cur-view-path-btn"
        onClick={downloadRecords}
        title={gettext('Download')}
      >
        <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')}></span>
      </span>

      {!readOnly && (
        <span
          className="cur-view-path-btn"
          onClick={deleteRecords}
          title={gettext('Delete')}
        >
          <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')}></span>
        </span>
      )}

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

KanbanFilesToolbar.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default KanbanFilesToolbar;
