import React, { useEffect, useMemo } from 'react';
import { getFileNameFromRecord, getFileTypeFromRecord, getImageLocationFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import MapView from './map-view';
import { PREDEFINED_FILE_TYPE_OPTION_KEY } from '../../constants';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { fileServerRoot, siteRoot, thumbnailSizeForGrid, thumbnailSizeForOriginal } from '../../../utils/constants';
import { isValidPosition } from '../../utils/validate';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../utils/coord-transform';
import { PRIVATE_FILE_TYPE } from '../../../constants';

import './index.css';

const Map = () => {
  const { metadata, viewID, updateCurrentPath } = useMetadataView();

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const repoInfo = window.sfMetadataContext.getSetting('repoInfo');

  const images = useMemo(() => {
    return metadata.rows
      .map(record => {
        const recordType = getFileTypeFromRecord(record);
        if (recordType !== PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE) return null;
        const id = getRecordIdFromRecord(record);
        const name = getFileNameFromRecord(record);
        const parentDir = getParentDirFromRecord(record);
        const path = Utils.encodePath(Utils.joinPath(parentDir, name));
        const location = getImageLocationFromRecord(record);
        if (!location) return null;
        const { lng, lat } = location;
        if (!isValidPosition(lng, lat)) return null;
        const gcPosition = wgs84_to_gcj02(lng, lat);
        const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);

        const repoEncrypted = repoInfo.encrypted;
        const cacheBuster = new Date().getTime();
        const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
        let thumbnail = '';
        const isGIF = fileExt === 'gif';
        if (repoEncrypted || isGIF) {
          thumbnail = `${siteRoot}repo/${repoID}/raw${path}?t=${cacheBuster}`;
        } else {
          thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
        }

        return {
          id,
          name,
          src: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}`,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          downloadURL: `${fileServerRoot}repos/${repoID}/files${path}?op=download`,
          thumbnail,
          parentDir,
          location: { lng: bdPosition.lng, lat: bdPosition.lat }
        };
      })
      .filter(Boolean);
  }, [repoID, repoInfo.encrypted, metadata]);

  useEffect(() => {
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${viewID}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (<MapView images={images} />);
};

export default Map;
