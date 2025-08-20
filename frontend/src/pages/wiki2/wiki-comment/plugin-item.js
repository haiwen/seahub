import React, { useCallback } from 'react';

import './plugin-item.css';

const CommentPlugin = ({ setIsShowRightPanel, unseenNotificationsCount }) => {

  const handleOnClick = useCallback((event) => {
    event.stopPropagation();
    setIsShowRightPanel(prev => !prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className="op-item wiki-plugin-operation-btn-container" onClick={handleOnClick}>
      <i className='sdocfont sdoc-comments'></i>
      {unseenNotificationsCount > 0 && (
        <span className="sdoc-unread-message-tip"></span>
      )}
    </span>
  );
};

export default CommentPlugin;
