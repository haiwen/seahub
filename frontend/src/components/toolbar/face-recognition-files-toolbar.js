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
import Icon from '../icon';
import OpIcon from '../../components/op-icon';
import OpElement from '../../components/op-element';

const FaceRecognitionFilesToolbar = ({ repoID }) => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [isSomeone, setIsSomeone] = useState(false);
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

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata, isSomeone) => {
      metadataRef.current = metadata;
      setSelectedRecordIds(ids);
      setSelectedRecords(ids.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || []);
      setIsSomeone(isSomeone);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    setSelectedRecords([]);
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
      isSomeone,
      faceRecognitionPermission
    );
  }, [selectedRecords, enableTags, readOnly, faceRecognitionPermission, isSomeone]);

  const onMenuItemClick = useCallback((option) => {
    switch (option) {
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
      case TextTranslation.REMOVE_FROM_GROUP.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.REMOVE_PHOTOS_FROM_CURRENT_SET, selectedRecordIds);
        break;
      case TextTranslation.ADD_TO_GROUPS.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.ADD_PHOTO_TO_GROUPS);
        break;
      case TextTranslation.SET_AS_COVER.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SET_PHOTO_AS_COVER, selectedRecordIds[0]);
        break;
      default:
        return;
    }
  }, [repoID, eventBus, readOnly, selectedRecords, selectedRecordIds]);

  const length = selectedRecordIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="d-flex mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}>
          <Icon symbol="x-01" />
        </span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>
      {!readOnly && length === 1 && (
        <>
          <span className="cur-view-path-btn" onClick={onMoveClick} title={gettext('Move')} aria-label={gettext('Move')}>
            <Icon symbol="move1" />
          </span>
          <span className="cur-view-path-btn" onClick={onCopyClick} title={gettext('Copy')} aria-label={gettext('Copy')}>
            <Icon symbol="copy1" />
          </span>
        </>
      )}
      <span className="cur-view-path-btn" onClick={handleDownload} title={gettext('Download')} aria-label={gettext('Download')}>
        <Icon symbol="download" />
      </span>
      {!readOnly &&
        <span className="cur-view-path-btn" onClick={deleteRecords} title={gettext('Delete')} aria-label={gettext('Delete')}>
          <Icon symbol="delete1" />
        </span>
      }
      <ItemDropdownMenu
        ref={menuRef}
        item={{}}
        toggleClass="cur-view-path-btn"
        toggleChildren={<Icon symbol="more-level" />}
        onMenuItemClick={onMenuItemClick}
        getMenuList={() => toolbarMenuOptions}
      />
    </div>
  );
};

export default FaceRecognitionFilesToolbar;
