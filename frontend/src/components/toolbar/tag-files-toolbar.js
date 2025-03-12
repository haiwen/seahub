import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import { getFileById, getFileName, getTagFileOperationList } from '../../tag/utils/file';

const TagFilesToolbar = ({ currentRepoInfo }) => {
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const tagFilesRef = useRef([]);

  const canModify = window.sfTagsDataContext && window.sfTagsDataContext.canModify();
  const eventBus = window.sfTagsDataContext && window.sfTagsDataContext.eventBus;

  const selectedFilesLen = useMemo(() => {
    return selectedFileIds.length;
  }, [selectedFileIds]);

  const unSelect = useCallback(() => {
    setSelectedFileIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UNSELECT_TAG_FILES);
  }, [eventBus]);

  const moveTagFile = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MOVE_TAG_FILE);
  }, [eventBus]);

  const copyTagFile = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.COPY_TAG_FILE);
  }, [eventBus]);

  const deleteTagFiles = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DELETE_TAG_FILES);
  }, [eventBus]);

  const downloadTagFiles = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_TAG_FILES);
  }, [eventBus]);

  const getMenuList = useCallback(() => {
    if (selectedFilesLen > 1) return [];
    const fileId = selectedFileIds[0];
    const file = getFileById(tagFilesRef.current, fileId);
    const fileName = getFileName(file);
    const allOperations = getTagFileOperationList(fileName, currentRepoInfo, canModify);
    const excludesOperations = ['Move', 'Copy', 'Delete', 'Download'];
    const validOperations = allOperations.filter((item) => {
      return excludesOperations.indexOf(item.key) == -1;
    });
    return validOperations;
  }, [canModify, currentRepoInfo, selectedFileIds, selectedFilesLen]);

  const onMenuItemClick = useCallback((operation) => {
    switch (operation) {
      case TextTranslation.SHARE.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SHARE_TAG_FILE);
        break;
      case TextTranslation.RENAME.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_RENAME_DIALOG);
        break;
      case TextTranslation.HISTORY.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.FILE_HISTORY);
        break;
      case TextTranslation.ACCESS_LOG.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.FILE_ACCESS_LOG);
        break;
      case TextTranslation.OPEN_VIA_CLIENT.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.OPEN_VIA_CLIENT);
        break;
      case TextTranslation.CONVERT_TO_SDOC.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CONVERT_FILE, 'sdoc');
        break;
      case TextTranslation.CONVERT_TO_MARKDOWN.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CONVERT_FILE, 'markdown');
        break;
      }
      case TextTranslation.CONVERT_TO_DOCX.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CONVERT_FILE, 'docx');
        break;
      }
      case TextTranslation.EXPORT_DOCX.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.EXPORT_DOCX);
        break;
      }
      case TextTranslation.EXPORT_SDOC.key: {
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.EXPORT_SDOC);
        break;
      }
      default:
        break;
    }
  }, [eventBus]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_TAG_FILES, (ids, tagFiles) => {
      tagFilesRef.current = tagFiles || [];
      setSelectedFileIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  }, [eventBus]);

  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{selectedFilesLen}{' '}{gettext('selected')}</span>
      </span>
      {(selectedFilesLen === 1 && canModify) &&
        <>
          <span className="cur-view-path-btn" onClick={moveTagFile}>
            <span className="sf3-font-move1 sf3-font" aria-label={gettext('Move')} title={gettext('Move')}></span>
          </span>
          <span className="cur-view-path-btn" onClick={copyTagFile}>
            <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')} title={gettext('Copy')}></span>
          </span>
        </>
      }
      {canModify &&
        <>
          <span className="cur-view-path-btn" onClick={deleteTagFiles}>
            <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
          </span>
          <span className="cur-view-path-btn" onClick={downloadTagFiles}>
            <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
          </span>
        </>
      }
      {selectedFilesLen === 1 &&
        <ItemDropdownMenu
          item={{}}
          toggleClass={'cur-view-path-btn sf3-font-more-vertical sf3-font'}
          onMenuItemClick={onMenuItemClick}
          getMenuList={getMenuList}
        />
      }
    </div>
  );
};

export default TagFilesToolbar;
