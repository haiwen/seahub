import React, { useCallback, useRef, useState } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { gettext, wikiPermission } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';
import Icon from '../../../components/icon';

import './page-cover.css';

function PageCover({ currentPageConfig, onUpdatePage }) {

  const [isShowCoverController, setIsShowCoverController] = useState(false);
  const popoverRef = useRef(null);
  const isDesktop = Utils.isDesktop();

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
    <div id="wiki-page-cover" className='wiki-page-cover' onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <img className='wiki-page-cover__img' alt={gettext('Cover')} src={getCoverImgUrl(currentPageConfig.cover_img_url)} />
      {isDesktop && wikiPermission === 'rw' && isShowCoverController && (
        <>
          <button className='wiki-cover-controller-btn border-0 d-flex align-items-center' id='wiki-change-cover-btn'>
            <Icon symbol="gallery" className="mr-1" />
            {gettext('Change cover')}
          </button>
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
      )}
    </div>
  );
}

PageCover.propTypes = {
  currentPageConfig: PropTypes.object,
  onUpdatePage: PropTypes.func,
};

export default PageCover;
