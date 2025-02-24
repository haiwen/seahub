import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import ModalPortal from '../modal-portal';
import { Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';

const TagFilesToolbar = () => {
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [isDropdownMenuShow, setIsDropdownMenuShow] = useState(false);

  const unSelect = useCallback(() => {
    setSelectedFileIds([]);
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.UNSELECT_TAG_FILES);
  }, []);

  const moveTagFile = useCallback(() => {
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.MOVE_TAG_FILE);
  }, []);

  const copyTagFile = useCallback(() => {
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.COPY_TAG_FILE);
  }, []);

  const deleteTagFiles = useCallback(() => {
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.DELETE_TAG_FILES);
  }, []);

  const downloadTagFiles = useCallback(() => {
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_TAG_FILES);
  }, []);

  const menuList = useMemo(() => {
    const { SHARE, RENAME } = TextTranslation;
    return [SHARE, RENAME];
  }, []);

  const onMenuItemClick = useCallback((event) => {
    const operation = Utils.getEventData(event, 'toggle') ?? event.currentTarget.getAttribute('data-toggle');

    switch (operation) {
      case 'Share':
        window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.SHARE_TAG_FILE);
        break;
      case 'Rename':
        window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_RENAME_DIALOG);
        break;
      default:
        break;
    }
  }, []);

  const toggleDropdownMenu = useCallback(() => {
    setIsDropdownMenuShow(!isDropdownMenuShow);
  }, [isDropdownMenuShow]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = window.sfTagsDataContext && window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.SELECTED_TAG_FILE_IDS, (ids) => {
      setSelectedFileIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  }, []);

  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{selectedFileIds.length}{' '}{gettext('selected')}</span>
      </span>
      {selectedFileIds.length === 1 &&
      <>
        <span className="cur-view-path-btn" onClick={moveTagFile}>
          <span className="sf3-font-move1 sf3-font" aria-label={gettext('Move')} title={gettext('Move')}></span>
        </span>
        <span className="cur-view-path-btn" onClick={copyTagFile}>
          <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')} title={gettext('Copy')}></span>
        </span>
      </>
      }
      <span className="cur-view-path-btn" onClick={deleteTagFiles}>
        <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
      </span>
      <span className="cur-view-path-btn" onClick={downloadTagFiles}>
        <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
      </span>
      {selectedFileIds.length === 1 &&
      <Dropdown direction='down' isOpen={isDropdownMenuShow} toggle={toggleDropdownMenu} className="vam">
        <DropdownToggle
          tag='i'
          role='button'
          className="cur-view-path-btn sf3-font-more-vertical sf3-font"
          title={gettext('More operations')}
        />
        <ModalPortal>
          <DropdownMenu
            className="position-fixed"
            flip={false}
            modifiers={[{ preventOverflow: { boundariesElement: document.body } }]}
          >
            {menuList.map((item, index) => {
              if (item === 'Divider') {
                return <DropdownItem key={index} divider />;
              } else {
                return (
                  <DropdownItem
                    key={index}
                    data-toggle={item.key}
                    onClick={onMenuItemClick}
                  >
                    {item.value}
                  </DropdownItem>
                );
              }
            })}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
      }
    </div>
  );
};

export default TagFilesToolbar;
