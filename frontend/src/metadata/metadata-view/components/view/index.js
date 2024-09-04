import React, { useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useMetadata } from '../../hooks';
import { gettext } from '../../utils';
import Table from './table';
import Gallery from './gallery';
import { VIEW_TYPE } from '../../_basic';

const View = () => {
  const { isLoading, metadata, errorMsg } = useMetadata();

  const renderView = useCallback((metadata) => {
    if (!metadata) return false;
    const viewType = metadata.view.type;
    switch (viewType) {
      case VIEW_TYPE.GALLERY: {
        return <Gallery />;
      }
      case VIEW_TYPE.TABLE: {
        return <Table />;
      }
      default:
        return null;
    }
  }, []);

  if (isLoading) return (<CenteredLoading />);

  return (
    <div className="sf-metadata-wrapper">
      <div className="sf-metadata-main">
        {errorMsg ? <div className="d-center-middle error">{gettext(errorMsg)}</div> : renderView(metadata)}
      </div>
    </div>
  );

};

export default View;
