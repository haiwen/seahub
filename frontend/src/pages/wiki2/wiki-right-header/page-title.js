import React, { useCallback, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { WIKI_COVER_LIST } from '../constant';
import PageIcon from './page-icon';
import { generateARandomEmoji, generateEmojiIcon } from '../utils/emoji-utils';

import './page-title.css';

const propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func.isRequired,
};

const PageTitle = ({ currentPageConfig, onUpdatePage }) => {
  const [isShowController, setIsShowController] = useState(false);
  const [pageName, setPageName] = useState(currentPageConfig.name);
  const isChineseInput = useRef(false);
  const isTyping = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    if (pageName !== currentPageConfig.name && isTyping.current === false) {
      setPageName(currentPageConfig.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageConfig.name]);

  const onKeyDown = useCallback(() => {
    isTyping.current = true;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onKeyUp = useCallback(() => {
    timer.current = setTimeout(() => {
      isTyping.current = false;
    }, 2000);
  }, []);

  const onCompositionStart = useCallback(() => {
    isChineseInput.current = true;
  }, []);

  const onCompositionEnd = useCallback((e) => {
    isChineseInput.current = false;
    const newName = e.target.value.trim();
    const { id, icon } = currentPageConfig;
    const pageConfig = { name: newName, icon };
    onUpdatePage && onUpdatePage(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

  const onChange = useCallback((e) => {
    setPageName(e.target.value);
    if (isChineseInput.current === false) {
      const newName = e.target.value.trim();
      if (newName === pageName) return;
      const { id, icon } = currentPageConfig;
      const pageConfig = { name: newName, icon };
      onUpdatePage && onUpdatePage(id, pageConfig);
    }
  }, [currentPageConfig, onUpdatePage, pageName]);

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
      <Input
        className='wiki-sdoc-title'
        bsSize="lg"
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onChange={onChange}
        value={pageName}
      />
    </div>
  );
};

PageTitle.propTypes = propTypes;

export default PageTitle;
