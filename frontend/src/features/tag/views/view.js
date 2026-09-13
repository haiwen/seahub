import React, { useCallback } from 'react';
import { useTagView } from '../hooks';
import TagFiles from './tag-files';

const View = () => {
  const { errorMessage, tagFiles } = useTagView();

  const renderTagView = useCallback(() => {
    if (!tagFiles) return null;
    return (<TagFiles />);
  }, [tagFiles]);

  return (
    <div className="sf-metadata-tags-wrapper sf-metadata-tag-files-wrapper">
      <div className="sf-metadata-tags-main">
        {errorMessage ? <div className="d-center-middle error">{errorMessage}</div> : renderTagView()}
      </div>
    </div>
  );
};

export default View;
