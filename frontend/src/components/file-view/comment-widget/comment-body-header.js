import React, { useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext } from '../../../utils/constants';

import './comment-body-header.css';

const t = gettext;

const CommentBodyHeader = ({ commentList = [], commentType, setCommentType }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  let commentTip = null;
  if (commentList.length === 1) {
    commentTip = gettext('Total {comments_count} comment');
    commentTip = commentTip.replace('{comments_count}', commentList.length);
  }
  if (commentList.length > 1) {
    commentTip = gettext('Total {comments_count} comments');
    commentTip = commentTip.replace('{comments_count}', commentList.length);
  }

  const getText = (type) => {
    switch (type) {
      case 'All comments':
        return gettext('All comments');
      case 'Resolved comments':
        return gettext('Resolved comments');
      case 'Unresolved comments':
        return gettext('Unresolved comments');
      default:
        return gettext('All comments');
    }
  };

  return (
    <div className='comments-panel-body__header'>
      <div className="comments-types-count">
        <div id="comment-types" className='comment-type'>
          <Dropdown isOpen={isDropdownOpen} toggle={() => setDropdownOpen(!isDropdownOpen)}>
            <DropdownToggle tag={'div'} caret className='d-flex align-items-center justify-content-center'>
              <div id={'comment-type-controller'}>{getText(commentType)}</div>
            </DropdownToggle>
            <DropdownMenu className='sdoc-dropdown-menu sdoc-comment-filter-dropdown' container="comment-types">
              <DropdownItem className='sdoc-dropdown-menu-item' tag={'div'} onClick={(e) => setCommentType(e, 'All comments')}>
                {t('All comments')}
              </DropdownItem>
              <DropdownItem className='sdoc-dropdown-menu-item' tag={'div'} onClick={(e) => setCommentType(e, 'Resolved comments')}>{t('Resolved comments')}</DropdownItem>
              <DropdownItem className='sdoc-dropdown-menu-item' tag={'div'} onClick={(e) => setCommentType(e, 'Unresolved comments')}>{t('Unresolved comments')}</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className='comment-count-tip'>{commentTip}</div>
      </div>
    </div>
  );
};

export default CommentBodyHeader;

