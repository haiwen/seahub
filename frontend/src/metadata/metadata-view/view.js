import React, { useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import Table from '../views/table';
import Gallery from '../views/gallery';
import FaceRecognition from '../views/face-recognition';
import Kanban from '../views/kanban';
import Map from '../views/map';
import { useMetadataView } from '../hooks/metadata-view';
import { gettext } from '../../utils/constants';
import { VIEW_TYPE } from '../constants';

const View = () => {
  const { isLoading, metadata, errorMsg } = useMetadataView();

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
