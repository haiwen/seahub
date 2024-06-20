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
  const [isShowCoverController, setIsShowCoverController] = useState(false);
  const [isShowCoverPanel, setIsShowCoverPanel] = useState(false);
  const [coverImgUrl, setCoverImgUrl] = useState('');
  const iconPanelPopoverRef = useRef(null);
  const coverPanelPopoverRef = useRef(null);

  // currentPageConfig.coverImgUrl = 'https://img2.baidu.com/it/u=2061573580,1495285204&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=500';

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
    setIsShowCoverPanel(false);
  }, [isShowIconPanel]);

  const handleClickAddIcon = useCallback(() => {
    setRandomEmoji();
    handleIconPanelDisplayedChange();
  }, [handleIconPanelDisplayedChange, setRandomEmoji]);

  const handleIconPanelListener = useCallback((e) => {
    const isClickInPopover = iconPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleIconPanelDisplayedChange();
  }, [handleIconPanelDisplayedChange]);

  const handleCoverPanelDisplayedChange = useCallback(() => {
    setIsShowCoverPanel(!isShowCoverPanel);
    setIsShowIconPanel(false);
  }, [isShowCoverPanel]);

  const handleCoverPanelListener = useCallback((e) => {
    const isClickInPopover = coverPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleCoverPanelDisplayedChange();
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
    handleIconPanelDisplayedChange();
  };

  const handleAddCover = useCallback(() => { }, []);

  const showCoverController = useCallback(() => {
    setIsShowCoverController(true);
  }, []);

  const hideCoverController = useCallback(() => {
    setIsShowCoverController(false);
  }, []);



  const handleSetCoverImage = (e) => {
    // TODO set cover image
    setCoverImgUrl(e.target.src);
    handleCoverPanelDisplayedChange();
  };

  return (
    <div
      className='wiki-page-header-wrapper'
    >
      {currentPageConfig.coverImgUrl && (
        <div
          className='wiki-cover'
          onMouseMove={showCoverController}
        // onMouseLeave={hideCoverController}
        >
          <img className='wiki-cover-img' alt={gettext('Cover')} src={coverImgUrl} />
          {isShowCoverController && (
            <div className='wiki-cover-controller'>
              <div onClick={handleCoverPanelDisplayedChange} className='wiki-cover-controller-btn' id='wiki-change-cover-btn'>{gettext('Change cover')}</div>
              <Popover
                flip
                target="wiki-change-cover-btn"
                toggle={() => void 0}
                placement="bottom"
                isOpen={isShowCoverPanel && currentPageConfig.coverImgUrl}
                innerClassName='wiki-cover-panel'
                hideArrow={true}
                popperClassName='wiki-cover-popover'
              >
                <div ref={coverPanelPopoverRef}>
                  <div className='wiki-icon-panel-header popover-header'>
                    <span>{gettext('Gallery')}</span>
                    <span onClick={handleIconRemove} className='wiki-remove-icon-btn'>{gettext('Remove')}</span>
                  </div>
                  <PopoverBody className='wiki-cover-panel-body'>
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://img0.baidu.com/it/u=1182742047,3628923944&fm=253&fmt=auto&app=120&f=JPEG?w=889&h=500' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://www.2008php.com/2015_Website_appreciate/2015-09-10/20150910002714.jpg' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://img1.baidu.com/it/u=3504078124,2689803181&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://img2.baidu.com/it/u=1882437344,2360797937&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://www.2008php.com/2014_Website_appreciate/2015-01-08/20150108181231.jpg' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://img2.baidu.com/it/u=1031726174,3597184508&fm=253&fmt=auto&app=120&f=JPEG?w=1422&h=800' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://img0.baidu.com/it/u=2265212344,3361529340&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=500' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://www.2008php.com/2012_Website_appreciate/2012-06-26/20120626041901.jpg' />
                    <img onClick={handleSetCoverImage} className='wiki-cover-gallery-img' alt={gettext('Cover')} src='https://img0.baidu.com/it/u=794065552,1847631001&fm=253&fmt=auto&app=120&f=JPEG?w=1422&h=800' />
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
          onMouseEnter={changeControllerDisplayed}
          onMouseLeave={changeControllerDisplayed}
        >
          <div className={classnames('wiki-icon-container', { gap: currentPageConfig.icon && !currentPageConfig.coverImgUrl })}>
            <div className={classnames('wiki-icon-wrapper', { show: currentPageConfig.icon })} id='wiki-icon-wrapper' onClick={handleIconPanelDisplayedChange}>
              <span>{currentPageConfig.icon}</span>
            </div>
          </div>
          <Popover
            flip
            target="wiki-icon-wrapper"
            toggle={() => void 0}
            placement="bottom"
            isOpen={isShowIconPanel && currentPageConfig.icon}
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
            {!currentPageConfig.coverImgUrl && (
              <div className='wiki-page-controller-item'>
                <i className='fa fa-save'></i>
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
