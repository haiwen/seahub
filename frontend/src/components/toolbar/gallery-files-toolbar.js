import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import RowUtils from '../../metadata/views/table/utils/row-utils';
import { buildGalleryToolbarMenuOptions } from '../../metadata/utils/menu-builder';
import TextTranslation from '../../utils/text-translation';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { getFileNameFromRecord } from '../../metadata/utils/cell/core';
import { Utils } from '../../utils/utils';
import { openInNewTab, openParentFolder } from '../../metadata/utils/file';
import { checkIsDir } from '../../metadata/utils/row';
import { useMetadataStatus } from '../../hooks';

const GalleryFilesToolbar = () => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [isSomeone, setIsSomeone] = useState(false);
  const metadataRef = useRef([]);
  const menuRef = useRef(null);

  const { enableFaceRecognition } = useMetadataStatus();
  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;
  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();
  const checkCanModifyRow = useCallback((row) => window.sfMetadataContext?.canModifyRow?.(row) ?? true, []);
  const canRemovePhotoFromPeople = window.sfMetadataContext.canRemovePhotoFromPeople();
  const canAddPhotoToPeople = window.sfMetadataContext.canAddPhotoToPeople();
  const canSetPeoplePhoto = window.sfMetadataContext.canSetPeoplePhoto();
  const repoID = window.sfMetadataContext?.getSetting('repoID') || '';

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata, isSomeone) => {
      metadataRef.current = metadata || [];
      setSelectedRecordIds(ids);
      setIsSomeone(isSomeone);
    });

    const unsubscribeMetadata = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_METADATA, (updatedMetadata) => {
      metadataRef.current = updatedMetadata || [];
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
      unsubscribeMetadata && unsubscribeMetadata();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const records = useMemo(() => selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || [], [selectedRecordIds]);

  const isReadonly = false;

  const toolbarMenuOptions = useMemo(() => {
    if (!records.length) return [];

    return buildGalleryToolbarMenuOptions(
      records,
      metadataRef.current.columns || [],
      enableFaceRecognition,
      checkCanModifyRow,
      canRemovePhotoFromPeople,
      canAddPhotoToPeople,
      canSetPeoplePhoto,
      isReadonly,
      isSomeone
    );
  }, [records, enableFaceRecognition, checkCanModifyRow, canRemovePhotoFromPeople, canAddPhotoToPeople, canSetPeoplePhoto, isReadonly, isSomeone]);

  const onMenuItemClick = useCallback((operation) => {
    switch (operation) {
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
      case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key: {
        openInNewTab(repoID, records[0]);
        break;
      }
      case TextTranslation.OPEN_PARENT_FOLDER.key: {
        openParentFolder(records[0]);
        break;
      }
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
      case TextTranslation.DETECT_FACES.key: {
        const images = records.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder) return false;
          const canModifyRow = checkCanModifyRow(record);
          if (!canModifyRow) return false;
          const fileName = getFileNameFromRecord(record);
          return Utils.imageCheck(fileName);
        });
        eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_FACE_RECOGNITION, images);
        break;
      }
      case TextTranslation.GENERATE_DESCRIPTION.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_DESCRIPTION, records[0]);
        break;
      }
      case TextTranslation.GENERATE_TAGS.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.GENERATE_FILE_TAGS, records[0]);
        break;
      }
      case TextTranslation.EXTRACT_TEXT.key: {
        eventBus.dispatch(EVENT_BUS_TYPE.EXTRACT_TEXT, records[0], menuRef.current.dropdownRef.current);
        break;
      }
      default:
        break;
    }
  }, [repoID, records, eventBus, checkCanModifyRow]);

  // Individual button handlers
  const onMoveClick = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, records);
  }, [records, eventBus]);

  const onCopyClick = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, records);
  }, [records, eventBus]);

  const onDownloadClick = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_RECORDS, selectedRecordIds);
  }, [selectedRecordIds, eventBus]);

  const onDeleteClick = useCallback(() => {
    eventBus.dispatch(EVENT_BUS_TYPE.DELETE_RECORDS, selectedRecordIds, {
      success_callback: () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    });
  }, [selectedRecordIds, eventBus]);

  const isMultipleImages = records.length > 1;
  const canMove = useMemo(() => records.length > 0 && !isMultipleImages && records.every(record => checkCanModifyRow?.(record) !== false), [records, checkCanModifyRow, isMultipleImages]);
  const canCopy = useMemo(() => records.length > 0 && !isMultipleImages, [records, isMultipleImages]);
  const canDownload = useMemo(() => records.length > 0, [records]);
  const canDelete = useMemo(() => records.length > 0 && checkCanDeleteRow, [records, checkCanDeleteRow]);

  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, []);
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const length = selectedRecordIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>

      {!isMultipleImages && (
        <>
          {canMove && (
            <span className="cur-view-path-btn" onClick={onMoveClick} title={gettext('Move')}>
              <span className="sf3-font-move sf3-font" aria-label={gettext('Move')}></span>
            </span>
          )}
          {canCopy && (
            <span className="cur-view-path-btn" onClick={onCopyClick} title={gettext('Copy')}>
              <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')}></span>
            </span>
          )}
        </>
      )}

      {canDownload && (
        <span className="cur-view-path-btn" onClick={onDownloadClick} title={gettext('Download')}>
          <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')}></span>
        </span>
      )}
      {canDelete && (
        <span className="cur-view-path-btn" onClick={onDeleteClick} title={gettext('Delete')}>
          <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')}></span>
        </span>
      )}

      {toolbarMenuOptions.length > 0 && (
        <ItemDropdownMenu
          ref={menuRef}
          toggleClass="cur-view-path-btn sf3-font-more sf3-font"
          item={{}}
          freezeItem={() => {}}
          unfreezeItem={() => {}}
          toggleItemMenuShow={() => {}}
          getMenuList={() => toolbarMenuOptions}
          onMenuItemClick={onMenuItemClick}
        />
      )}
    </div>
  );
};

export default GalleryFilesToolbar;
