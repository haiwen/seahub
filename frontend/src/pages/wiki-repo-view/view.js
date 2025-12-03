import React from 'react';
import Loading from '@/components/loading';
import CenteredLoading from '@/components/centered-loading';
import { gettext } from '../../utils/constants';
import { useMetadataView } from './hooks/metadata-view';
import Table from './table';

const View = () => {
  const { isLoading, isBeingBuilt, errorMessage } = useMetadataView();

  if (isLoading) {
    if (isBeingBuilt) {
      return (
        <div className="sf-metadata-loading-wrapper">
          <Loading className="sf-metadata-loading-tip center" />
          <span className="sf-metadata-loading-tip">{gettext('Extended properties are being built.')}</span>
        </div>
      );
    }
    return (<CenteredLoading />);
  }

  return (
    <div className="sf-metadata-wrapper" id="sf-metadata-wrapper">
      <div className="sf-metadata-main">
        {errorMessage && <div className="d-center-middle error">{errorMessage}</div>}
        {!errorMessage && <Table />}
      </div>
    </div>
  );
};

export default View;
