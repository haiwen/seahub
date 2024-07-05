import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Popover, PopoverBody } from 'reactstrap';
import { init } from 'emoji-mart';
import Picker from '@emoji-mart/react';
import classnames from 'classnames';
import data from '@emoji-mart/data';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

// init data for emoji-mart, used in Picker and `getRandomEmoji` method
init({ data });

const HeaderIcon = ({ currentPageConfig, onUpdatePage }, ref) => {
  const [isShowIconPanel, setIsShowIconPanel] = useState(false);
  const iconPanelPopoverRef = useRef(null);


  const handleSetIcon = useCallback((emoji, cb) => {
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, icon: emoji });
    cb && cb();
  }, [currentPageConfig.id, currentPageConfig.name, onUpdatePage]);

  const setRandomEmoji = useCallback(() => {
    const nativeEmojis = Reflect.ownKeys(data.natives);
    const emojiCount = nativeEmojis.length;
    const emoji = nativeEmojis[Math.floor(Math.random() * emojiCount)];
    handleSetIcon(emoji);
  }, [handleSetIcon]);

  const handleIconRemove = () => {
    handleSetIcon('');
    handleIconPanelDisplayedChange(false);
  };

  const handleIconPanelDisplayedChange = useCallback((isShowIconPanel) => {
    setIsShowIconPanel(isShowIconPanel);
    // setIsShowCoverPanel(false);
  }, []);

  const handleClickAddIcon = useCallback(() => {
    setRandomEmoji();
    handleIconPanelDisplayedChange(false);
  }, [handleIconPanelDisplayedChange, setRandomEmoji]);

  useImperativeHandle(ref, () => {
    return { handleClickAddIcon };
  }, [handleClickAddIcon]);

  const handleIconPanelListener = useCallback((e) => {
    const isClickInPopover = iconPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleIconPanelDisplayedChange(false);
  }, [handleIconPanelDisplayedChange]);

  useEffect(() => {
    if (isShowIconPanel) {
      setTimeout(() => {
        // Avoid open behavior closing popover
        addEventListener('click', handleIconPanelListener);
      }, 0);
    }
    if (!isShowIconPanel) removeEventListener('click', handleIconPanelListener);

    return () => {
      removeEventListener('click', handleIconPanelListener);
    };
  }, [handleIconPanelListener, isShowIconPanel]);

  // Update current page favicon
  useEffect(() => {
    let faviconUrl = '';
    if (currentPageConfig.icon) {
      faviconUrl = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${currentPageConfig.icon}</text></svg>`;
    } else {
      const { serviceUrl, mediaUrl, faviconPath } = window.seafile;
      faviconUrl = `${serviceUrl}${mediaUrl}${faviconPath}`;
    }
    document.getElementById('favicon').href = faviconUrl;
  }, [currentPageConfig.icon]);

  return (
    <>
      <div className={classnames('wiki-icon-container', { gap: currentPageConfig.icon && !currentPageConfig.cover_img_url })}>
        <div className={classnames('wiki-icon-wrapper', { show: currentPageConfig.icon })} id='wiki-icon-wrapper' onClick={handleIconPanelDisplayedChange.bind(null, !isShowIconPanel)}>
          <span>{currentPageConfig.icon}</span>
        </div>
      </div>
      <Popover
        flip
        target="wiki-icon-wrapper"
        toggle={() => void 0}
        placement="bottom"
        isOpen={!!(isShowIconPanel && !!currentPageConfig.icon)}
        popperClassName='wiki-icon-popover'
        hideArrow={true}
      >
        <div ref={iconPanelPopoverRef}>
          <div className='wiki-icon-panel-header popover-header'>
            <span>{gettext('Emojis')}</span>
            <span onClick={handleIconRemove} className='wiki-remove-icon-btn'>{gettext('Remove')}</span>
          </div>
          <PopoverBody className='wiki-icon-panel-body'>
            <Picker
              data={data}
              onEmojiSelect={(emoji) => handleSetIcon(emoji.native, handleIconPanelDisplayedChange.bind(null, false))}
              previewPosition="none"
              skinTonePosition="none"
              locale={window.seafile.lang.slice(0, 2)}
              maxFrequentRows={2}
              theme="light"
            />
          </PopoverBody>
        </div>
      </Popover>
    </>
  );
};

HeaderIcon.propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

export default forwardRef(HeaderIcon);
