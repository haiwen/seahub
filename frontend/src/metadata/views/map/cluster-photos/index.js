import React, { useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import Gallery from '../../gallery/main';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../constants';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import { useMetadataView } from '../../../hooks/metadata-view';

import './index.css';

const ClusterPhotos = ({ metadata, markerIds, onClose }) => {
  const { store, duplicateRecord, addFolder } = useMetadataView();

  const repoID = window.sfMetadataContext.getSetting('repoID');

  const clusterMetadata = useMemo(() => {
    const filteredRows = metadata.rows.filter(row => markerIds.includes(row._id));
    const newMetadata = deepCopy(metadata);
    newMetadata.rows = filteredRows;
    return newMetadata;
  }, [metadata, markerIds]);

  const handelDelete = useCallback((deletedImages, { success_callback } = {}) => {
    if (!deletedImages.length) return;
    let recordIds = [];
    deletedImages.forEach((record) => recordIds.push(record.id));
    store.deleteRecords(recordIds, { success_callback });
  }, [store]);

  const handleViewChange = useCallback((update) => {
    metadataAPI.modifyView(repoID, metadata.view._id, update).then(res => {

    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
    });
  }, [metadata, repoID,]);

  useEffect(() => {
    const unsubscribeViewChange = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MAP_GALLERY_VIEW_CHANGE, handleViewChange);
    return () => {
      unsubscribeViewChange();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-metadata-view-map sf-metadata-map-photos-container">
      <div className="sf-metadata-map-photos-header">
        <div className="sf-metadata-map-photos-header-back" onClick={onClose}>
          <i className="sf3-font sf3-font-arrow rotate-180"></i>
        </div>
        <div className="sf-metadata-map-location">{gettext('Location')}</div>
      </div>
      <Gallery metadata={clusterMetadata} onDelete={handelDelete} duplicateRecord={duplicateRecord} onAddFolder={addFolder} />
    </div>
  );
};

ClusterPhotos.propTypes = {
  metadata: PropTypes.object,
  markerIds: PropTypes.array,
  onClose: PropTypes.func,
};

export default ClusterPhotos;
