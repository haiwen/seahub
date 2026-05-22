import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import { getFileById, getFileName, getTagFileOperationList } from '../../tag/utils/file';
import OpIcon from '../../components/op-icon';
import OpElement from '../../components/op-element';
import Icon from '../icon';
import CustomDropdown from '../dropdown';

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

  const getMenuList = useCallback(() => {
    if (selectedFilesLen > 1) return [];
    const fileId = selectedFileIds[0];
    const file = getFileById(tagFilesRef.current, fileId);
    const fileName = getFileName(file);
    const allOperations = getTagFileOperationList(fileName, currentRepoInfo, canModify);
    const excludesOperations = ['Move', 'Copy', 'Delete', 'Download'];
    const validOperations = allOperations.filter((item) => excludesOperations.indexOf(item.key) == -1)
      .map((item) => {
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
    return validOperations;
  }, [canModify, currentRepoInfo, onMenuItemClick, selectedFileIds, selectedFilesLen]);

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
          <Icon symbol="close" />
        </span>
        <span>{selectedFilesLen}{' '}{gettext('selected')}</span>
      </OpElement>
      {(selectedFilesLen === 1 && canModify) &&
        <>
          <OpIcon id="move-btn" symbol="move" className="cur-view-path-btn" tooltip={gettext('Move')} aria-label={gettext('Move')} op={moveTagFile} />
          <OpIcon id="copy-btn" symbol="copy" className="cur-view-path-btn" tooltip={gettext('Copy')} aria-label={gettext('Copy')} op={copyTagFile} />
        </>
      }
      {canModify &&
        <>
          <OpIcon
            id="delete-btn"
            className="cur-view-path-btn"
            symbol="delete1"
            tooltip={gettext('Delete')}
            op={deleteTagFiles}
          />
          <OpIcon
            id="download-btn"
            className="cur-view-path-btn"
            symbol="download"
            tooltip={gettext('Download')}
            op={downloadTagFiles}
          />
        </>
      }
      {selectedFilesLen === 1 &&
        <CustomDropdown
          target="tag-files-toolbar-menu"
          items={getMenuList()}
          triggerClassName="cur-view-path-btn"
        />
      }
    </div>
  );
};

export default TagFilesToolbar;
