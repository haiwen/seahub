import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Input, Popover, PopoverBody } from 'reactstrap';
import classnames from 'classnames';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { init } from 'emoji-mart';
import { gettext } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';

// init data for emoji-mart, used in Picker and `getRandomEmoji` method
init({ data });

const propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

const PageHeader = ({ currentPageConfig, onUpdatePage }) => {
  const [isShowController, setIsShowController] = useState(false);
  const [isShowIconPanel, setIsShowIconPanel] = useState(false);
  const [isShowCoverController, setIsShowCoverController] = useState(false);
  const [isShowCoverPanel, setIsShowCoverPanel] = useState(false);
  const iconPanelPopoverRef = useRef(null);
  const coverPanelPopoverRef = useRef(null);
  const headerWrapperRef = useRef(null);

  const getCoverImgUrl = useCallback((imageName) => {
    const { serviceUrl, mediaUrl } = window.seafile;
    return `${serviceUrl}${mediaUrl}img/wiki/cover/${imageName}`;
  }, []);

  const handleRenameDocument = useCallback((e) => {
    const { nativeEvent: { isComposing } } = e;
    if (isComposing) return;

    const newName = e.target.value.trim();
    const { id, name, icon } = currentPageConfig;
    if (newName === name) return;
    const pageConfig = { name: newName, icon };
    onUpdatePage && onUpdatePage(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

  const changeControllerDisplayed = useCallback((isShowController) => {
    if (isShowCoverPanel) return;
    setIsShowController(isShowController);
  }, [isShowCoverPanel]);

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

  const handleIconPanelDisplayedChange = useCallback((isShowIconPanel) => {
    setIsShowIconPanel(isShowIconPanel);
    setIsShowCoverPanel(false);
  }, []);

  const handleClickAddIcon = useCallback(() => {
    setRandomEmoji();
    handleIconPanelDisplayedChange(false);
  }, [handleIconPanelDisplayedChange, setRandomEmoji]);

  const handleIconPanelListener = useCallback((e) => {
    const isClickInPopover = iconPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleIconPanelDisplayedChange(false);
  }, [handleIconPanelDisplayedChange]);

  const handleCoverPanelDisplayedChange = useCallback((isShowCoverPanel) => {
    setIsShowCoverPanel(isShowCoverPanel);
    setIsShowIconPanel(false);
  }, []);

  const handleCoverPanelListener = useCallback((e) => {
    const isClickInPopover = coverPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleCoverPanelDisplayedChange(false);
  }, [handleCoverPanelDisplayedChange]);

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
    if (isShowCoverPanel) {
      setTimeout(() => {
        // Avoid open behavior closing popover
        addEventListener('click', handleCoverPanelListener);
      }, 0);
    }
    if (!isShowCoverPanel) removeEventListener('click', handleCoverPanelListener);

    return () => {
      removeEventListener('click', handleIconPanelListener);
      removeEventListener('click', handleCoverPanelListener);
    };
  }, [handleCoverPanelListener, handleIconPanelListener, isShowCoverPanel, isShowIconPanel]);

  const handleIconRemove = () => {
    handleSetIcon('');
    handleIconPanelDisplayedChange(false);
  };

  const handleAddCover = useCallback(() => {
    const coverName = WIKI_COVER_LIST[Math.floor(Math.random() * WIKI_COVER_LIST.length)];
    const coverImgUrl = `${coverName}`;
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, cover_img_url: coverImgUrl });
  }, [currentPageConfig.id, currentPageConfig.name, onUpdatePage]);

  const showCoverController = useCallback(() => {
    setIsShowCoverController(true);
  }, []);

  const hideCoverController = useCallback((e) => {
    if (isShowCoverPanel) return;
    setIsShowCoverController(false);
  }, [isShowCoverPanel]);

  const handleSetCoverImage = (coverName) => {
    const coverImgUrl = `${coverName}`;
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, cover_img_url: coverImgUrl });
    handleCoverPanelDisplayedChange(false);
  };

  const handleCoverRemove = () => {
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, cover_img_url: '' });
    handleCoverPanelDisplayedChange(false);
  };

  return (
    <div
      className='wiki-page-header-wrapper'
      ref={headerWrapperRef}
      onMouseEnter={changeControllerDisplayed.bind(null, true)}
      onMouseLeave={changeControllerDisplayed.bind(null, false)}

    >
      {currentPageConfig.cover_img_url && (
        <div
          className='wiki-cover'
          onMouseMove={showCoverController}
          onMouseLeave={hideCoverController}
        >
          <img className='wiki-cover-img' alt={gettext('Cover')} src={getCoverImgUrl(currentPageConfig.cover_img_url)} />
          {isShowCoverController && (
            <div className='wiki-cover-controller'>
              <div onClick={handleCoverPanelDisplayedChange.bind(true)} className='wiki-cover-controller-btn' id='wiki-change-cover-btn'>{gettext('Change cover')}</div>
              <Popover
                flip
                target="wiki-change-cover-btn"
                toggle={() => void 0}
                placement="bottom"
                isOpen={!!(isShowCoverPanel && currentPageConfig.cover_img_url)}
                innerClassName='wiki-cover-panel'
                hideArrow={true}
                popperClassName='wiki-cover-popover'
              >
                <div ref={coverPanelPopoverRef}>
                  <div className='wiki-icon-panel-header popover-header'>
                    <span>{gettext('Gallery')}</span>
                    <span onClick={handleCoverRemove} className='wiki-remove-icon-btn'>{gettext('Remove')}</span>
                  </div>
                  <PopoverBody className='wiki-cover-panel-body'>
                    {
                      WIKI_COVER_LIST.map(imgName => (
                        <img key={imgName} onClick={handleSetCoverImage.bind(null, imgName)} className='wiki-cover-gallery-img' alt={gettext('Cover')} src={getCoverImgUrl(`${imgName}`)} />
                      ))
                    }
                  </PopoverBody>
                </div>
              </Popover>
            </div>
          )}

        </div>
      )}
      <div className='wiki-page-gap-container'>
        <div
          className='wiki-editor-header'
        >
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
          <div className={classnames('wiki-page-controller', { show: isShowController })}>
            {!currentPageConfig.icon && (
              <div className='wiki-page-controller-item' onClick={handleClickAddIcon}>
                <i className='sf3-font sf3-font-icon'></i>
                <span className='text'>{gettext('Add icon')}</span>
              </div>
            )}
            {!currentPageConfig.cover_img_url && (
              <div onClick={handleAddCover} className='wiki-page-controller-item'>
                <i className='sf3-font sf3-font-image'></i>
                <span className='text'>{gettext('Add cover')}</span>
              </div>
            )}
          </div>
          <Input className='sf-wiki-title' onCompositionEnd={handleRenameDocument} bsSize="lg" onChange={handleRenameDocument} defaultValue={currentPageConfig.name} />
        </div>

      </div>
    </div>
  );
};

PageHeader.propTypes = propTypes;

export default PageHeader;
