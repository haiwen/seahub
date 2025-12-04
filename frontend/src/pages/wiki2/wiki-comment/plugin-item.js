import React, { useCallback } from 'react';
import { Utils } from '../../../utils/utils';

import './plugin-item.css';
import Icon from '../../../components/icon';

const CommentPlugin = ({ setIsShowRightPanel, unseenNotificationsCount }) => {

  const handleOnClick = useCallback((event) => {
    event.stopPropagation();
    setIsShowRightPanel(prev => !prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className="op-item wiki-plugin-operation-btn-container"
      onClick={handleOnClick}
      role='button'
      tabIndex={0}
      onKeyDown={Utils.onKeyDown}
    >
      <Icon symbol='context-comment' />
      {unseenNotificationsCount > 0 && (
        <span className="sdoc-unread-message-tip"></span>
      )}
    </span>
  );
};

export default CommentPlugin;
