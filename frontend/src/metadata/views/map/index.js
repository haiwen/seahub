import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getFileNameFromRecord, getFileTypeFromRecord, getImageLocationFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import ClusterPhotos from './cluster-photos';
import Main from './main';
import { EVENT_BUS_TYPE, PREDEFINED_FILE_TYPE_OPTION_KEY } from '../../constants';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { isValidPosition } from '../../utils/validate';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../utils/coord-transform';

import './index.css';

const Map = () => {
  const [showGallery, setShowGallery] = useState(false);
  const [markerIds, setMarkerIds] = useState([]);
  const { metadata, store } = useMetadataView();

  const repoID = window.sfMetadataContext.getSetting('repoID');

  const validImages = useMemo(() => {
    return metadata.rows
      .map(record => {
        const recordType = getFileTypeFromRecord(record);
        if (recordType !== PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE) return null;
        const id = getRecordIdFromRecord(record);
        const fileName = getFileNameFromRecord(record);
        const parentDir = getParentDirFromRecord(record);
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}`;
        const location = getImageLocationFromRecord(record);
        if (!location) return null;
        const { lng, lat } = location;
        if (!isValidPosition(lng, lat)) return null;
        const gcPosition = wgs84_to_gcj02(lng, lat);
        const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
        return { id, src, lng: bdPosition.lng, lat: bdPosition.lat };
      })
      .filter(Boolean);
  }, [repoID, metadata.rows]);

  const openGallery = useCallback((cluster_marker_ids) => {
    setMarkerIds(cluster_marker_ids);
    setShowGallery(true);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MAP_VIEW_TOOLBAR, true);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MAP_VIEW, metadata.view);
  }, [metadata.view]);

  const closeGallery = useCallback(() => {
    setShowGallery(false);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MAP_VIEW_TOOLBAR, false);
  }, []);

  const onDeleteLocationPhotos = useCallback((ids) => {
    store.deleteLocationPhotos(ids);
  }, [store]);

  useEffect(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MAP_VIEW, metadata.view);
  }, [metadata.view]);

  return (
    <>
      {showGallery ? (
        <ClusterPhotos view={metadata.view} markerIds={markerIds} onClose={closeGallery} onDelete={onDeleteLocationPhotos} />
      ) : (
        <Main validImages={validImages} onOpen={openGallery} />
      )}
    </>
  );
};

export default Map;
