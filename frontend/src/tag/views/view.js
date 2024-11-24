import React, { useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useTagView } from '../hooks';
import TagFiles from './tag-files';

const View = () => {
  const { isLoading, errorMessage, tagFiles } = useTagView();

  const renderTagView = useCallback(() => {
    if (!tagFiles) return null;
    return (<TagFiles />);
  }, [tagFiles]);

  if (isLoading) return (<CenteredLoading />);
  return (
    <div className="sf-metadata-tags-wrapper sf-metadata-tag-files-wrapper">
      <div className="sf-metadata-tags-main">
        {errorMessage ? <div className="d-center-middle error">{errorMessage}</div> : renderTagView()}
      </div>
    </div>
  );
};

export default View;
