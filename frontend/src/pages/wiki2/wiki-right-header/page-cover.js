import React, { useCallback, useRef, useState } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';

import './page-cover.css';

function PageCover({ currentPageConfig, onUpdatePage }) {

  const [isShowCoverController, setIsShowCoverController] = useState(false);
  const popoverRef = useRef(null);

  const onMouseEnter = useCallback(() => {
    setIsShowCoverController(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (popoverRef.current?.state.isOpen) {
      return;
    }
    setIsShowCoverController(false);
  }, []);

  const getCoverImgUrl = useCallback((imageName) => {
    const { serviceUrl, mediaUrl } = window.seafile;
    return `${serviceUrl}${mediaUrl}img/wiki/cover/${imageName}`;
  }, []);

  const updatePageCover = useCallback((imageName) => {
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, cover_img_url: imageName });
    setTimeout(() => {
      popoverRef.current?.toggle();
    }, 300);
  }, [currentPageConfig.id, currentPageConfig.name, onUpdatePage]);

  const removeCoverImage = useCallback(() => {
    updatePageCover('');
  }, [updatePageCover]);

  const updateCoverImage = useCallback((imageName) => {
    updatePageCover(imageName);
  }, [updatePageCover]);

  if (!currentPageConfig.cover_img_url) {
    return null;
  }

  return (
    <>
      <div id="wiki-page-cover" className='wiki-page-cover' onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <img className='wiki-page-cover__img' alt={gettext('Cover')} src={getCoverImgUrl(currentPageConfig.cover_img_url)} />
        <div className={classNames('wiki-page-cover__controller', {show: isShowCoverController})}>
          <div className='wiki-cover-controller-btn' id='wiki-change-cover-btn'>{gettext('Change cover')}</div>
        </div>
      </div>
      <UncontrolledPopover
        ref={popoverRef}
        flip
        target="wiki-change-cover-btn"
        placement="bottom"
        hideArrow={true}
        popperClassName='wiki-page-cover-popover'
        innerClassName='wiki-page-cover-panel wiki-page-panel'
        trigger="legacy"
      >
        <div className='wiki-page-cover-panel__header popover-header'>
          <span>{gettext('Gallery')}</span>
          <span onClick={removeCoverImage} className='wiki-remove-icon-btn'>{gettext('Remove')}</span>
        </div>
        <div className='wiki-page-cover-panel__body popover-body'>
          {WIKI_COVER_LIST.map(imgName => (
            <img key={imgName} onClick={updateCoverImage.bind(null, imgName)} className='wiki-cover-gallery-img' alt={gettext('Cover')} src={getCoverImgUrl(`${imgName}`)} />
          ))}
        </div>
      </UncontrolledPopover>
    </>
  );
}

PageCover.propTypes = {
  currentPageConfig: PropTypes.object,
  onUpdatePage: PropTypes.func,
};

export default PageCover;
