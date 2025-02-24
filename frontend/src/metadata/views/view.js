import React, { useCallback } from 'react';
import Loading from '../../components/loading';
import CenteredLoading from '../../components/centered-loading';
import Table from './table';
import Gallery from './gallery';
import FaceRecognition from './face-recognition';
import Kanban from './kanban';
import Map from './map';
import { useMetadataView } from '../hooks/metadata-view';
import { VIEW_TYPE } from '../constants';
import { gettext } from '../../utils/constants';

const View = () => {
  const { isLoading, isBeingBuilt, metadata, errorMessage } = useMetadataView();

  const renderView = useCallback((metadata) => {
    if (!metadata) return null;
    const viewType = metadata.view.type;
    switch (viewType) {
      case VIEW_TYPE.GALLERY: {
        return <Gallery />;
      }
      case VIEW_TYPE.TABLE: {
        return <Table />;
      }
      case VIEW_TYPE.FACE_RECOGNITION: {
        return (<FaceRecognition />);
      }
      case VIEW_TYPE.KANBAN: {
        return <Kanban />;
      }
      case VIEW_TYPE.MAP: {
        return <Map />;
      }
      default:
        return null;
    }
  }, []);

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
    <div className="sf-metadata-wrapper">
      <div className="sf-metadata-main">
        {errorMessage ? <div className="d-center-middle error">{errorMessage}</div> : renderView(metadata)}
      </div>
    </div>
  );

};

export default View;
