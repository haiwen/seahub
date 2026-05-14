import React from 'react';
import { gettext } from '../../../utils/constants';
import CustomDropdown from '../../dropdown';

import './comment-body-header.css';

const t = gettext;

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

const CommentBodyHeader = ({ commentList = [], commentType, setCommentType }) => {
  let commentTip = null;
  if (commentList.length === 1) {
    commentTip = gettext('Total {comments_count} comment');
    commentTip = commentTip.replace('{comments_count}', commentList.length);
  }
  if (commentList.length > 1) {
    commentTip = gettext('Total {comments_count} comments');
    commentTip = commentTip.replace('{comments_count}', commentList.length);
  }

  const items = [
    { key: 'All comments', label: t('All comments') },
    { key: 'Resolved comments', label: t('Resolved comments') },
    { key: 'Unresolved comments', label: t('Unresolved comments') },
  ];

  return (
    <div className='comments-panel-body__header'>
      <div className="comments-types-count">
        <div id="comment-types" className='comment-type'>
          <CustomDropdown
            items={items}
            trigger={<div id={'comment-type-controller'}>{getText(commentType)}</div>}
            triggerClassName="d-flex align-items-center justify-content-center"
            toggleProps={{ tag: 'div', caret: true }}
            menuClassName="sdoc-dropdown-menu sdoc-comment-filter-dropdown"
            dropdownProps={{ container: 'comment-types' }}
            menuPortal={false}
            onItemClick={(item) => setCommentType(null, item.key)}
          />
        </div>
        <div className='comment-count-tip'>{commentTip}</div>
      </div>
    </div>
  );
};

export default CommentBodyHeader;
