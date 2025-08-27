import React, { useCallback, useEffect, useRef, useState } from 'react';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE, GALLERY_OPERATION_KEYS } from '../../metadata/constants';
import { useFileOperations } from '../../hooks/file-operations';

const FaceRecognitionFilesToolbar = () => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [opList, setOpList] = useState([]);
  const metadataRef = useRef([]);
  const menuRef = useRef(null);
  const { handleDownload: handleDownloadAPI } = useFileOperations();
  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();
  const canRemovePhotoFromPeople = window.sfMetadataContext.canRemovePhotoFromPeople();
  const canAddPhotoToPeople = window.sfMetadataContext.canAddPhotoToPeople();
  const canSetPeoplePhoto = window.sfMetadataContext.canSetPeoplePhoto();

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata, selectedRecords) => {
      metadataRef.current = metadata || [];
      setSelectedRecordIds(ids);
      setSelectedRecords(selectedRecords);
      getOpList(ids);
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

  const getMenuList = useCallback(() => {
    return opList;
  }, [opList]);

  const getOpList = useCallback((selectedIDs) => {
    const { current_row_id, id_row_map } = metadataRef.current;
    const row = id_row_map[current_row_id];
    const { _is_someone: isSomeone } = row;
    const list = [];
    if (isSomeone && canRemovePhotoFromPeople) {
      list.push({ key: GALLERY_OPERATION_KEYS.REMOVE_PHOTO_FROM_CURRENT_SET, value: gettext('Remove from this group') });
    }
    if (!isSomeone && canAddPhotoToPeople) {
      list.push({ key: GALLERY_OPERATION_KEYS.ADD_PHOTO_TO_GROUPS, value: gettext('Add to groups') });
    }
    if (canSetPeoplePhoto && selectedIDs.length == 1) {
      list.push({ key: GALLERY_OPERATION_KEYS.SET_PHOTO_AS_COVER, value: gettext('Set as cover photo') });
    }
    setOpList(list);
  }, [metadataRef, canRemovePhotoFromPeople, canAddPhotoToPeople, canSetPeoplePhoto]);

  const onMenuItemClick = useCallback((operation) => {
    switch (operation) {
      case GALLERY_OPERATION_KEYS.REMOVE_PHOTO_FROM_CURRENT_SET:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.REMOVE_PHOTOS_FROM_CURRENT_SET, selectedRecords);
        break;
      case GALLERY_OPERATION_KEYS.ADD_PHOTO_TO_GROUPS:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.ADD_PHOTO_TO_GROUPS);
        break;
      case GALLERY_OPERATION_KEYS.SET_PHOTO_AS_COVER:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SET_PHOTO_AS_COVER, selectedRecords[0]);
        break;
      default:
        return;
    }
  }, [eventBus, selectedRecords]);

  const length = selectedRecordIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>
      <span className="cur-view-path-btn" onClick={handleDownload}>
        <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
      </span>
      {checkCanDeleteRow &&
        <span className="cur-view-path-btn" onClick={deleteRecords}>
          <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
        </span>
      }
      <ItemDropdownMenu
        ref={menuRef}
        item={{}}
        toggleClass="cur-view-path-btn sf3-font-more sf3-font"
        onMenuItemClick={onMenuItemClick}
        getMenuList={getMenuList}
      />
    </div>
  );
};

export default FaceRecognitionFilesToolbar;
