import React, { useCallback, useRef } from 'react';
import { UncontrolledPopover } from 'reactstrap';
import classNames from 'classnames';
import Picker from '@emoji-mart/react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { gettext, wikiPermission } from '../../../utils/constants';
import { data } from './../utils/emoji-utils';

const PageIcon = ({ currentPageConfig, onUpdatePage }) => {
  const popoverRef = useRef(null);
  const isDesktop = Utils.isDesktop();

  const handleSetIcon = useCallback((emoji) => {
    onUpdatePage && onUpdatePage(currentPageConfig.id, { name: currentPageConfig.name, icon: emoji });
    setTimeout(() => {
      popoverRef.current?.toggle();
    }, 300);
  }, [currentPageConfig.id, currentPageConfig.name, onUpdatePage]);

  const handleIconRemove = useCallback(() => {
    handleSetIcon('');
  }, [handleSetIcon]);

  return (
    <>
      <div className={classNames('wiki-page-icon-wrapper', { 'no-page-cover': currentPageConfig.cover_img_url })}>
        <div className='wiki-page-icon-container' id='wiki-page-icon-container'>
          <span>{currentPageConfig.icon}</span>
        </div>
      </div>
      {isDesktop && wikiPermission === 'rw' &&
        <UncontrolledPopover
          ref={popoverRef}
          flip
          target="wiki-page-icon-container"
          placement="bottom"
          hideArrow={true}
          popperClassName='wiki-page-icon-popover'
          innerClassName='wiki-page-icon-panel wiki-page-panel'
          trigger="legacy"
        >
          <div className='wiki-page-icon-panel__header popover-header'>
            <span>{gettext('Emojis')}</span>
            <span onClick={handleIconRemove} className='wiki-remove-icon-btn'>{gettext('Remove')}</span>
          </div>
          <div className='wiki-page-icon-panel__body popover-body'>
            <Picker
              data={data}
              onEmojiSelect={(emoji) => handleSetIcon(emoji.native)}
              previewPosition="none"
              skinTonePosition="none"
              locale={window.seafile.lang.slice(0, 2)}
              maxFrequentRows={2}
              theme="light"
            />
          </div>
        </UncontrolledPopover>
      }
    </>
  );
};

PageIcon.propTypes = {
  currentPageConfig: PropTypes.object.isRequired,
  onUpdatePage: PropTypes.func,
};

export default PageIcon;
