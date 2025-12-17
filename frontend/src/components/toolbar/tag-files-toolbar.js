import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import { getFileById, getFileName, getTagFileOperationList } from '../../tag/utils/file';
import OpIcon from '../../components/op-icon';
import OpElement from '../../components/op-element';
import Icon from '../icon';

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
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.RENAME_TAG_FILE_IN_DIALOG);
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
      <OpElement
        className="cur-view-path-btn px-2"
        title={gettext('Unselect')}
        op={unSelect}
      >
        <span className="d-flex mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}>
          <Icon symbol="x-01" />
        </span>
        <span>{selectedFilesLen}{' '}{gettext('selected')}</span>
      </OpElement>
      {(selectedFilesLen === 1 && canModify) &&
        <>
          <OpIcon
            className="cur-view-path-btn"
            symbol="move"
            title={gettext('Move')}
            op={moveTagFile}
          />
          <OpIcon
            className="cur-view-path-btn"
            symbol="copy"
            title={gettext('Copy')}
            op={copyTagFile}
          />
        </>
      }
      {canModify &&
        <>
          <OpIcon
            className="cur-view-path-btn"
            symbol="delete1"
            title={gettext('Delete')}
            op={deleteTagFiles}
          />
          <OpIcon
            className="cur-view-path-btn"
            symbol="download"
            title={gettext('Download')}
            op={downloadTagFiles}
          />
        </>
      }
      {selectedFilesLen === 1 &&
        <ItemDropdownMenu
          item={{}}
          toggleClass={'cur-view-path-btn'}
          toggleChildren={<Icon symbol="more-level" />}
          onMenuItemClick={onMenuItemClick}
          getMenuList={getMenuList}
        />
      }
    </div>
  );
};

export default TagFilesToolbar;
