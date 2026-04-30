import React, { useCallback } from 'react';
import { Utils } from '../../../utils/utils';
import Icon from '../../../components/icon';
import Tooltip from '@/components/tooltip';
import { gettext } from '@/utils/constants';

import './plugin-item.css';

const CommentPlugin = ({ setIsShowRightPanel, unseenNotificationsCount }) => {

  const handleOnClick = useCallback((event) => {
    event.stopPropagation();
    setIsShowRightPanel(prev => !prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      id="comment-btn"
      className="op-item wiki-plugin-operation-btn-container"
      onClick={handleOnClick}
      role='button'
      tabIndex={0}
      onKeyDown={Utils.onKeyDown}
    >
      <Icon symbol='comment' />
      <Tooltip target="comment-btn">{gettext('Comment')}</Tooltip>
      {unseenNotificationsCount > 0 && (
        <span className="sdoc-unread-message-tip"></span>
      )}
    </span>
  );
};

export default CommentPlugin;
