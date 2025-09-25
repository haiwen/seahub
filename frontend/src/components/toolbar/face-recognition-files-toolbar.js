import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../metadata/constants';
import { useFileOperations } from '../../hooks/file-operations';
import RowUtils from '../../metadata/views/table/utils/row-utils';
import { buildGalleryToolbarMenuOptions } from '../../metadata/utils/menu-builder';
import { getColumnByKey } from '../sf-table/utils/column';
import { useMetadataStatus } from '../../hooks';
import TextTranslation from '../../utils/text-translation';
import { openInNewTab, openParentFolder } from '../../metadata/utils/file';
import { checkIsDir } from '../../metadata/utils/row';
import { getFileNameFromRecord } from '../../metadata/utils/cell';
import { Utils } from '../../utils/utils';

const FaceRecognitionFilesToolbar = (repoID) => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const menuRef = useRef(null);
  const metadataRef = useRef([]);

  const { enableTags } = useMetadataStatus();
  const { handleDownload: handleDownloadAPI } = useFileOperations();
  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  const readOnly = !window.sfMetadataContext.canModify();
  const faceRecognitionPermission = useMemo(() => {
    return {
      canAddPhotoToPeople: window.sfMetadataContext.canAddPhotoToPeople(),
      canRemovePhotoFromPeople: window.sfMetadataContext.canRemovePhotoFromPeople(),
      canSetPeoplePhoto: window.sfMetadataContext.canSetPeoplePhoto(),
    };
  }, []);

  const selectedRecords = useMemo(() => selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || [], [selectedRecordIds]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata) => {
      metadataRef.current = metadata;
      setSelectedRecordIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, []);
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const onMoveClick = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, selectedRecords);
  }, [selectedRecords, eventBus]);

  const onCopyClick = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, selectedRecords);
  }, [selectedRecords, eventBus]);

  const handleDownload = useCallback(() => {
    const list = selectedRecords.map(record => {
      const { parentDir, name: fileName } = record || {};
      const name = parentDir === '/' ? fileName : `${parentDir}/${fileName}`;
      return { name };
    });
    handleDownloadAPI('/', list);
  }, [selectedRecords, handleDownloadAPI]);

  const deleteRecords = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DELETE_FACE_RECOGNITION_RECORDS, selectedRecords, {
      success_callback: () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    });
  }, [eventBus, selectedRecords]);

  const toolbarMenuOptions = useMemo(() => {
    if (!selectedRecords.length) return [];
    const metadataStatus = {
      enableFaceRecognition: true,
      enableGenerateDescription: getColumnByKey(metadataRef.current.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    return buildGalleryToolbarMenuOptions(
      selectedRecords,
      readOnly,
      metadataStatus,
      true,
      faceRecognitionPermission
    );
  }, [selectedRecords, enableTags, readOnly, faceRecognitionPermission]);

  const onMenuItemClick = useCallback((option) => {
    switch (option.key) {
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
      case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key: {
        openInNewTab(repoID, selectedRecords[0]);
        break;
      }
      case TextTranslation.OPEN_PARENT_FOLDER.key: {
        openParentFolder(selectedRecords[0]);
        break;
      }
      case TextTranslation.EXTRACT_FILE_DETAIL.key:
      case TextTranslation.EXTRACT_FILE_DETAILS.key: {
        const imageOrVideoRecords = selectedRecords.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder || readOnly) return false;
          const fileName = getFileNameFromRecord(record);
          return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
        });

        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_RECORD_DETAILS, imageOrVideoRecords);
        break;
      }
      case TextTranslation.DETECT_FACES.key: {
        const images = selectedRecords.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder || readOnly) return false;
          const fileName = getFileNameFromRecord(record);
          return Utils.imageCheck(fileName);
        });
        eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_FACE_RECOGNITION, images);
        break;
      }
      case TextTranslation.GENERATE_DESCRIPTION.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_DESCRIPTION, selectedRecords[0]);
        break;
      }
      case TextTranslation.GENERATE_TAGS.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_FILE_TAGS, selectedRecords[0]);
        break;
      }
      case TextTranslation.EXTRACT_TEXT.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.EXTRACT_TEXT, selectedRecords[0], menuRef.current.dropdownRef.current);
        break;
      }
      case TextTranslation.REMOVE_FROM_GROUP:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.REMOVE_PHOTOS_FROM_CURRENT_SET, selectedRecords);
        break;
      case TextTranslation.ADD_TO_GROUPS:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.ADD_PHOTO_TO_GROUPS);
        break;
      case TextTranslation.SET_AS_COVER:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SET_PHOTO_AS_COVER, selectedRecords[0]);
        break;
      default:
        return;
    }
  }, [repoID, eventBus, readOnly, selectedRecords]);

  const length = selectedRecordIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>
      {!readOnly && length === 1 && (
        <>
          <span className="cur-view-path-btn" onClick={onMoveClick} title={gettext('Move')}>
            <span className="sf3-font-move sf3-font" aria-label={gettext('Move')}></span>
          </span>
          <span className="cur-view-path-btn" onClick={onCopyClick} title={gettext('Copy')}>
            <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')}></span>
          </span>
        </>
      )}
      <span className="cur-view-path-btn" onClick={handleDownload}>
        <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
      </span>
      {!readOnly &&
        <span className="cur-view-path-btn" onClick={deleteRecords}>
          <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
        </span>
      }
      <ItemDropdownMenu
        ref={menuRef}
        item={{}}
        toggleClass="cur-view-path-btn sf3-font-more sf3-font"
        onMenuItemClick={onMenuItemClick}
        getMenuList={() => toolbarMenuOptions}
      />
    </div>
  );
};

export default FaceRecognitionFilesToolbar;
