import React, { useCallback } from 'react';

import './index.css';


const ChatHeader = ({
  session,
  isEmpty,
  customHeaderTitle,
}) => {

  const renderCustomTitle = useCallback(() => {
    const title = isEmpty ? customHeaderTitle : session?.name;
    return <div className="chat-header-title-content" title={title}>{title}</div>;
  }, [session, isEmpty, customHeaderTitle]);

  return (
    <>
      {customHeaderTitle ? renderCustomTitle() : <div className="chat-header-title-content" title={session?.name}>{session?.name}</div>}
    </>
  );

};

export default ChatHeader;
