import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';
import HeaderIcon from './page-icon';
import { generateARandomEmoji, generateEmojiIcon } from '../utils/emoji-utils';

import './page-title.css';

const propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

const PageTitle = ({ currentPageConfig, onUpdatePage }) => {
  const [isShowController, setIsShowController] = useState(false);

  const handleRenameDocument = useCallback((e) => {
    const { nativeEvent: { isComposing } } = e;
    if (isComposing) return;

    const newName = e.target.value.trim();
    const { id, name, icon } = currentPageConfig;
    if (newName === name) return;
    const pageConfig = { name: newName, icon };
    onUpdatePage && onUpdatePage(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

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
    <div className='wiki-page-title-wrapper' onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {currentPageConfig.icon && (
        <HeaderIcon currentPageConfig={currentPageConfig} onUpdatePage={onUpdatePage} />
      )}
      <div className={classnames('wiki-page-controller', {'show': isShowController})}>
        {!currentPageConfig.icon && (
          <div className='wiki-page-controller-item' onClick={handleAddIcon}>
            <i className='sf3-font sf3-font-icon'></i>
            <span className='text'>{gettext('Add icon')}</span>
          </div>
        )}
        {!currentPageConfig.cover_img_url && (
          <div className='wiki-page-controller-item' onClick={handleAddCover}>
            <i className='sf3-font sf3-font-image'></i>
            <span className='text'>{gettext('Add cover')}</span>
          </div>
        )}
      </div>
      <Input className='wiki-sdoc-title' onCompositionEnd={handleRenameDocument} bsSize="lg" onChange={handleRenameDocument} defaultValue={currentPageConfig.name} />
    </div>
  );
};

PageTitle.propTypes = propTypes;

export default PageTitle;
