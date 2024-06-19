import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Input, Popover, PopoverBody } from 'reactstrap';
import classnames from 'classnames';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { init } from 'emoji-mart';
import { gettext } from '../../../utils/constants';

init({ data }); // init data for emoji-mart, used in Picker and `getRandomEmoji` method

const propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

const PageHeader = ({ currentPageConfig, onUpdatePage }) => {
  const [isShowController, setIsShowController] = useState(false);
  const [isShowIconPanel, setIsShowIconPanel] = useState(false);
  const iconPanelPopoverRef = useRef(null);

  console.log('currentPageConfig', currentPageConfig);

  const handleRenameDocument = useCallback((e) => {
    const { nativeEvent: { isComposing } } = e;
    if (isComposing) return;

    const newName = e.target.value.trim();
    const { id, name, icon } = currentPageConfig;
    if (newName === name) return;
    const pageConfig = { name: newName, icon };
    onUpdatePage && onUpdatePage(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

  const changeControllerDisplayed = useCallback(() => {
    setIsShowController(!isShowController);
  }, [isShowController]);

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

  const handleIconPanelDisplayedChange = useCallback(() => {
    setIsShowIconPanel(!isShowIconPanel);
  }, [isShowIconPanel]);

  const handleClickAddIcon = useCallback(() => {
    setRandomEmoji();
    handleIconPanelDisplayedChange();
  }, [handleIconPanelDisplayedChange, setRandomEmoji]);

  const handleIconPanelListener = useCallback((e) => {
    const isClickInPopover = iconPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleIconPanelDisplayedChange();
  }, [handleIconPanelDisplayedChange]);

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

  const handleIconRemove = () => {
    handleSetIcon('');
    handleIconPanelDisplayedChange();

  };

  const handleAddCover = useCallback(() => { }, []);



  return (
    <div
      className='wiki-page-header-wrapper'
    >
      <div className='wiki-cover'></div>
      <div className='wiki-page-gap-container'>
        <div
          className='wiki-editor-header'
          onMouseEnter={changeControllerDisplayed}
          onMouseLeave={changeControllerDisplayed}
        >

          <div className='wiki-icon-container'>
            <div className={classnames('wiki-icon-wrapper', { show: currentPageConfig.icon })} id='wiki-icon-wrapper' onClick={handleIconPanelDisplayedChange}>
              <span>{currentPageConfig.icon}</span>
            </div>
          </div>
          <Popover
            flip
            target="wiki-icon-wrapper"
            toggle={() => void 0}
            placement="bottom"
            isOpen={currentPageConfig.icon && isShowIconPanel}
            innerClassName='wiki-icon-panel'
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
                  onEmojiSelect={(emoji) => handleSetIcon(emoji.native, handleIconPanelDisplayedChange)}
                  previewPosition="none"
                  skinTonePosition="none"
                  locale={window.seafile.lang.slice(0, 2)}
                  maxFrequentRows={2}
                />
              </PopoverBody>
            </div>
          </Popover>
          <div className={classnames('wiki-page-controller', { show: isShowController })}>
            {!currentPageConfig.icon && (
              <div className='wiki-page-controller-item' onClick={handleClickAddIcon}>
                <i className='fa fa-save'></i>
                <span className='text'>{gettext('Add icon')}</span>
              </div>
            )}
            <div className='wiki-page-controller-item'>
              <i className='fa fa-save'></i>
              <span className='text'>{gettext('Add cover')}</span>
            </div>
          </div>
          <Input className='sf-wiki-title' onCompositionEnd={handleRenameDocument} bsSize="lg" onChange={handleRenameDocument} defaultValue={currentPageConfig.name} />
        </div>
      </div>
    </div>
  );
};

PageHeader.propTypes = propTypes;

export default PageHeader;