import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { gettext, wikiPermission } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';
import PageIcon from './page-icon';
import { generateARandomEmoji, generateEmojiIcon } from '../utils/emoji-utils';
import PageTitleEditor from './page-title-editor';

import './page-title.css';

const propTypes = {
  isUpdateBySide: PropTypes.bool,
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

const PageTitle = ({ isUpdateBySide, currentPageConfig, onUpdatePage }) => {
  const [isShowController, setIsShowController] = useState(false);
  const isDesktop = Utils.isDesktop();

  const onMouseEnter = useCallback(() => {
    setIsShowController(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsShowController(false);
  }, []);

  const handleAddIcon = useCallback(() => {
    const icon = generateARandomEmoji();
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, icon: icon });
  }, [currentPageConfig.id, currentPageConfig.name, onUpdatePage]);

  const handleAddCover = useCallback(() => {
    const coverName = WIKI_COVER_LIST[Math.floor(Math.random() * WIKI_COVER_LIST.length)];
    const coverImgUrl = `${coverName}`;
    onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, cover_img_url: coverImgUrl });
  }, [currentPageConfig.id, currentPageConfig.name, onUpdatePage]);

  // Update current page favicon
  useEffect(() => {
    let faviconUrl = '';
    if (currentPageConfig.icon) {
      faviconUrl = generateEmojiIcon(currentPageConfig.icon);
    } else {
      const { serviceUrl, mediaUrl, faviconPath } = window.seafile;
      faviconUrl = `${serviceUrl}${mediaUrl}${faviconPath}`;
    }
    document.getElementById('favicon').href = faviconUrl;
  }, [currentPageConfig.icon]);


  return (
    <div id="wiki-page-title" className='wiki-page-title-wrapper' onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {currentPageConfig.icon && (
        <PageIcon currentPageConfig={currentPageConfig} onUpdatePage={onUpdatePage} />
      )}
      <div className={classnames('wiki-page-controller', { 'show': isShowController, 'd-none': !isDesktop })}>
        {!currentPageConfig.icon && wikiPermission !== 'public' && (
          <div className='wiki-page-controller-item' onClick={handleAddIcon}>
            <i className='sf3-font sf3-font-icon'></i>
            <span className='text'>{gettext('Add icon')}</span>
          </div>
        )}
        {!currentPageConfig.cover_img_url && wikiPermission !== 'public' && (
          <div className='wiki-page-controller-item' onClick={handleAddCover}>
            <i className='sf3-font sf3-font-image'></i>
            <span className='text'>{gettext('Add cover')}</span>
          </div>
        )}
      </div>
      <PageTitleEditor isUpdateBySide={isUpdateBySide} currentPageConfig={currentPageConfig} onUpdatePage={onUpdatePage} />
    </div>
  );
};

PageTitle.propTypes = propTypes;

export default PageTitle;
