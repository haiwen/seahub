import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../metadata/constants';
import RowUtils from '../sf-table/utils/row';
import { buildGalleryToolbarMenuOptions } from '../../metadata/utils/menu-builder';
import TextTranslation from '../../utils/text-translation';
import { getFileNameFromRecord } from '../../metadata/utils/cell/core';
import { Utils } from '../../utils/utils';
import { openInNewTab, openParentFolder } from '../../metadata/utils/file';
import { checkIsDir } from '../../metadata/utils/row';
import { useMetadataStatus } from '../../hooks';
import { getColumnByKey } from '../../metadata/utils/column';
import Icon from '../icon';
import OpIcon from '../op-icon';
import CustomDropdown from '../dropdown';
import EventBus, { eventBus as globalEventBus } from '../common/event-bus';
import { EVENT_BUS_TYPE as DIR_EVENT_BUS_TYPE } from '../common/event-bus-type';
import { setPendingAttachments } from '../dir-view-mode/dir-chat/hooks/ai-chat-tools';
import { AttachmentObject } from '../dir-view-mode/dir-chat/models';
import { getParentDirFromRecord } from '../../metadata/utils/cell';

const GalleryFilesToolbar = () => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const metadataRef = useRef([]);
  const menuRef = useRef(null);

  const repoID = window.sfMetadataContext?.getSetting('repoID') || '';
  const { enableFaceRecognition, enableTags } = useMetadataStatus();
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
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata) => {
      metadataRef.current = metadata || [];
      setSelectedRecordIds(ids);
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
      case TextTranslation.CHAT_WITH_AI.key: {
        const attachments = records
          .filter((record) => !checkIsDir(record))
          .map((record) => {
            const fileName = getFileNameFromRecord(record);
            const parentDir = getParentDirFromRecord(record);
            return new AttachmentObject({
              repo_id: repoID,
              path: Utils.joinPath(parentDir, fileName),
              name: fileName,
            });
          });

        setPendingAttachments(attachments, records.length === 1);
        globalEventBus.dispatch(DIR_EVENT_BUS_TYPE.SWITCH_TO_CHAT_VIEW);
        if (attachments.length > 0) {
          EventBus.getInstance().dispatch(DIR_EVENT_BUS_TYPE.CHAT_ATTACH_FILES, {
            attachments,
            reset: records.length === 1,
          });
        }
        break;
      }
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
        const images = records.filter(record => {
          const isFolder = checkIsDir(record);
          if (isFolder || readOnly) return false;
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
  }, [repoID, records, eventBus, readOnly]);

  const toolbarMenuOptions = useMemo(() => {
    if (!records.length) return [];
    const metadataStatus = {
      enableFaceRecognition,
      enableGenerateDescription: getColumnByKey(metadataRef.current.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    let options = buildGalleryToolbarMenuOptions(
      records,
      readOnly,
      metadataStatus,
      null,
      faceRecognitionPermission
    );

    return options.map(item => {
      if (item === 'Divider') return item;
      if (item.subOpList) {
        return {
          ...item,
          onClick: () => onMenuItemClick(item.key),
          subOpList: item.subOpList.map((subItem) => {
            if (subItem === 'Divider') return subItem;
            return {
              ...subItem,
              onClick: () => onMenuItemClick(subItem.key)
            };
          })
        };
      }
      return {
        ...item,
        onClick: () => onMenuItemClick(item.key)
      };
    });
  }, [records, enableFaceRecognition, enableTags, readOnly, faceRecognitionPermission, onMenuItemClick]);

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


  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, []);
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const length = selectedRecordIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="d-flex mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}>
          <Icon symbol="close" />
        </span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>
      {length === 1 && !readOnly && (
        <>
          <OpIcon id="move-btn" symbol="move" className="cur-view-path-btn" tooltip={gettext('Move')} aria-label={gettext('Move')} op={onMoveClick} />
          <OpIcon id="copy-btn" symbol="copy" className="cur-view-path-btn" tooltip={gettext('Copy')} aria-label={gettext('Copy')} op={onCopyClick} />
        </>
      )}
      <OpIcon id="download-btn" symbol="download" className="cur-view-path-btn" tooltip={gettext('Download')} aria-label={gettext('Download')} op={onDownloadClick} />
      {!readOnly && <OpIcon id="delete-btn" symbol="delete1" className="cur-view-path-btn" tooltip={gettext('Delete')} aria-label={gettext('Delete')} op={onDeleteClick} />}

      {toolbarMenuOptions.length > 0 && (
        <CustomDropdown
          target="gallery-files-toolbar-menu-toggle"
          forwardedRef={menuRef}
          items={toolbarMenuOptions}
          triggerClassName="cur-view-path-btn"
        />
      )}
    </div>
  );
};

export default GalleryFilesToolbar;
