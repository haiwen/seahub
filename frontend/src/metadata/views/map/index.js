import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileNameFromRecord, getFileTypeFromRecord, getImageLocationFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import ClusterPhotos from './cluster-photos';
import MapView from './map';
import { PREDEFINED_FILE_TYPE_OPTION_KEY } from '../../constants';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { gettext, siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { isValidPosition } from '../../utils/validate';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../utils/coord-transform';
import { PRIVATE_FILE_TYPE } from '../../../constants';

import './index.css';

const Map = () => {
  const [showCluster, setShowCluster] = useState(false);
  const { metadata, viewID, updateCurrentPath } = useMetadataView();

  const clusterRef = useRef([]);

  const repoID = window.sfMetadataContext.getSetting('repoID');

  const images = useMemo(() => {
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

  const openCluster = useCallback((clusterIds) => {
    clusterRef.current = clusterIds;
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${viewID}/${gettext('Location')}`);
    setShowCluster(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewID, updateCurrentPath]);

  const closeCluster = useCallback(() => {
    clusterRef.current = [];
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${viewID}`);
    setShowCluster(false);
  }, [viewID, updateCurrentPath]);

  useEffect(() => {
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${viewID}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showCluster) {
    return (<ClusterPhotos markerIds={clusterRef.current} onClose={closeCluster} />);
  }

  return (<MapView images={images} onOpenCluster={openCluster} />);
};

export default Map;
