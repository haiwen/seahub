import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import TextTranslation from '../../utils/text-translation';
import { getFileById, getFileName } from '../../tag/utils/file';
import OpIcon from '../../components/op-icon';
import OpElement from '../../components/op-element';
import Icon from '../icon';
import CustomDropdown from '../dropdown';
import { getDirentItemMenuList, getBatchMenuList } from '../dir-view-mode/utils/contextMenuUtils';

const SINGLE_EXCLUDES = ['Download', 'Delete', 'Share', 'Move', 'Copy'];
const MULTI_EXCLUDES = ['Download', 'Delete', 'Move', 'Copy'];

const TagFilesToolbar = ({ currentRepoInfo }) => {
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const tagFilesRef = useRef([]);

  const eventBus = window.sfTagsDataContext && window.sfTagsDataContext.eventBus;
  const selectedFilesLen = selectedFileIds.length;

  const unSelect = useCallback(() => {
    setSelectedFileIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UNSELECT_TAG_FILES);
  }, [eventBus]);

  const shareTagFile = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SHARE_TAG_FILE);
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
      case TextTranslation.RENAME.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.RENAME_TAG_FILE_IN_DIALOG);
        break;
      case TextTranslation.CHAT_WITH_AI.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CHAT_WITH_AI_ABOUT_TAG_FILES);
        break;
      case TextTranslation.STAR.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_STAR_ITEM);
        break;
      case TextTranslation.UNSTAR.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_STAR_ITEM);
        break;
      case TextTranslation.LOCK.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.LOCK_FILE);
        break;
      case TextTranslation.UNLOCK.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UNLOCK_FILE);
        break;
      case TextTranslation.UNFREEZE_DOCUMENT.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UNLOCK_FILE);
        break;
      case TextTranslation.FREEZE_DOCUMENT.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.FREEZE_DOCUMENT);
        break;
      case TextTranslation.HISTORY.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.FILE_HISTORY);
        break;
      case TextTranslation.ACCESS_LOG.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.FILE_ACCESS_LOG);
        break;
      case TextTranslation.PROPERTIES.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.PROPERTIES);
        break;
      case TextTranslation.OPEN_WITH_DEFAULT.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.OPEN_WITH_DEFAULT);
        break;
      case TextTranslation.OPEN_WITH_ONLYOFFICE.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.OPEN_WITH_ONLYOFFICE);
        break;
      case TextTranslation.OPEN_VIA_CLIENT.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.OPEN_VIA_CLIENT);
        break;
      case TextTranslation.CONVERT_TO_SDOC.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CONVERT_FILE, 'sdoc');
        break;
      case TextTranslation.CONVERT_TO_MARKDOWN.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CONVERT_FILE, 'markdown');
        break;
      case TextTranslation.CONVERT_TO_DOCX.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CONVERT_FILE, 'docx');
        break;
      case TextTranslation.EXPORT_DOCX.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.EXPORT_DOCX);
        break;
      case TextTranslation.EXPORT_SDOC.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.EXPORT_SDOC);
        break;
      case TextTranslation.EXPORT_MARKDOWN.key:
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.EXPORT_MARKDOWN);
        break;
      default:
        break;
    }
  }, [eventBus]);

  const toFileObj = useCallback((fileId) => {
    const file = getFileById(tagFilesRef.current, fileId);
    return {
      name: getFileName(file),
      type: 'file', // for 'chat with AI'
      permission: window.sfTagsDataContext && window.sfTagsDataContext.permission
    };
  }, []);

  const buildMenuOps = useCallback((allOperations, excludesOperations) => {
    const iconOps = excludesOperations.filter(item => {
      return allOperations.some(op => op.key === item);
    });
    const validOperations = allOperations
      .filter((item) => excludesOperations.indexOf(item.key) === -1)
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
    if (validOperations.length > 0 && validOperations[0] === 'Divider') {
      validOperations.shift();
    }
    return { iconOps, menuOps: validOperations };
  }, [onMenuItemClick]);

  const getMenuList = useCallback(() => {
    if (selectedFilesLen !== 1) return {};
    const fileObj = toFileObj(selectedFileIds[0]);
    const allOperations = getDirentItemMenuList(currentRepoInfo, fileObj, true);
    return buildMenuOps(allOperations, SINGLE_EXCLUDES);
  }, [currentRepoInfo, toFileObj, buildMenuOps, selectedFileIds, selectedFilesLen]);

  const getSelectedFilesMenuList = useCallback(() => {
    if (selectedFilesLen <= 1) return {};
    const selectedFiles = selectedFileIds.map(toFileObj);
    const allOperations = getBatchMenuList(currentRepoInfo, selectedFiles, getDirentItemMenuList);
    return buildMenuOps(allOperations, MULTI_EXCLUDES);
  }, [currentRepoInfo, toFileObj, buildMenuOps, selectedFileIds, selectedFilesLen]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_TAG_FILES, (ids, tagFiles) => {
      tagFilesRef.current = tagFiles || [];
      setSelectedFileIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  }, [eventBus]);

  const renderIconButtons = (iconOps) => {
    return iconOps.map((item) => {
      switch (item) {
        case 'Download':
          return <OpIcon key="dl-btn" id="dl-btn" symbol="download" className="cur-view-path-btn" tooltip={gettext('Download')} op={downloadTagFiles} />;
        case 'Delete':
          return <OpIcon key="del-btn" id="del-btn" symbol="delete1" className="cur-view-path-btn" tooltip={gettext('Delete')} op={deleteTagFiles} />;
        case 'Share':
          return <OpIcon key="share-btn" id="share-btn" symbol="share" className="cur-view-path-btn" tooltip={gettext('Share')} op={shareTagFile} />;
        case 'Move':
          return <OpIcon key="move-btn" id="move-btn" symbol="move" className="cur-view-path-btn" tooltip={gettext('Move')} op={moveTagFile} />;
        case 'Copy':
          return <OpIcon key="copy-btn" id="copy-btn" symbol="copy" className="cur-view-path-btn" tooltip={gettext('Copy')} op={copyTagFile} />;
        default:
          return null;
      }
    });
  };

  const { iconOps, menuOps } = getMenuList();
  const { iconOps: iconOpsForMulti, menuOps: menuOpsForMulti } = getSelectedFilesMenuList();

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
      {selectedFilesLen > 1 && (
        <>
          {renderIconButtons(iconOpsForMulti)}
          <CustomDropdown
            target="tag-files-toolbar-menu"
            items={menuOpsForMulti}
            triggerClassName="cur-view-path-btn"
          />
        </>
      )}
      {selectedFilesLen === 1 && (
        <>
          {renderIconButtons(iconOps)}
          <CustomDropdown
            target="tag-files-toolbar-menu"
            items={menuOps}
            triggerClassName="cur-view-path-btn"
          />
        </>
      )}
    </div>
  );
};

export default TagFilesToolbar;
