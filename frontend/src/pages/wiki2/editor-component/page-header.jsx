import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Input, Popover, PopoverBody } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';
import HeaderIcon from './header-icon';

const propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

const PageHeader = ({ currentPageConfig, onUpdatePage }) => {
  const [isShowController, setIsShowController] = useState(false);
  const [isShowCoverController, setIsShowCoverController] = useState(false);
  const [isShowCoverPanel, setIsShowCoverPanel] = useState(false);
  const coverPanelPopoverRef = useRef(null);
  const headerWrapperRef = useRef(null);
  const headerIconRef = useRef({ handleClickAddIcon: () => void 0 });

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

  const handleCoverPanelDisplayedChange = useCallback((isShowCoverPanel) => {
    setIsShowCoverPanel(isShowCoverPanel);
  }, []);

  const handleCoverPanelListener = useCallback((e) => {
    const isClickInPopover = coverPanelPopoverRef.current.contains(e.target);
    if (!isClickInPopover) handleCoverPanelDisplayedChange(false);
  }, [handleCoverPanelDisplayedChange]);

  useEffect(() => {
    if (isShowCoverPanel) {
      setTimeout(() => {
        // Avoid open behavior closing popover
        addEventListener('click', handleCoverPanelListener);
      }, 0);
    }
    if (!isShowCoverPanel) removeEventListener('click', handleCoverPanelListener);

    return () => {
      removeEventListener('click', handleCoverPanelListener);
    };
  }, [handleCoverPanelListener, isShowCoverPanel]);

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
        <div className='wiki-editor-header'>
          <HeaderIcon currentPageConfig={currentPageConfig} onUpdatePage={onUpdatePage} ref={headerIconRef} />
          <div className={classnames('wiki-page-controller', { show: isShowController })}>
            {!currentPageConfig.icon && (
              <div className='wiki-page-controller-item' onClick={headerIconRef.current.handleClickAddIcon}>
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
