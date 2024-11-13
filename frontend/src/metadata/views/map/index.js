import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import loadBMap, { initMapInfo } from '../../../utils/map-utils';
import { wgs84_to_gcj02, gcj02_to_bd09 } from '../../../utils/coord-transform';
import { MAP_TYPE } from '../../../constants';
import Loading from '../../../components/loading';
import { isValidPosition } from '../../utils/validate';
import { appAvatarURL, baiduMapKey, googleMapKey, mediaUrl, siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { useMetadataView } from '../../hooks/metadata-view';
import { PREDEFINED_FILE_TYPE_OPTION_KEY, PRIVATE_COLUMN_KEY } from '../../constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';
import { Utils } from '../../../utils/utils';
import customImageOverlay from './customImageOverlay';
import customAvatarOverlay from './customAvatarOverlay';
import { createBMapGeolocationControl } from './geolocation-control';

import './index.css';

const DEFAULT_POSITION = { lng: 104.195, lat: 35.861 };
const DEFAULT_ZOOM = 4;
const BATCH_SIZE = 500;

const Map = () => {
  const [isLoading, setIsLoading] = useState(true);

  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const batchIndexRef = useRef(0);

  const { metadata } = useMetadataView();

  const mapInfo = useMemo(() => initMapInfo({ baiduMapKey, googleMapKey }), []);

  const validImages = useMemo(() => {
    return metadata.rows
      .filter(row => row[PRIVATE_COLUMN_KEY.FILE_TYPE] === PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE && row[PRIVATE_COLUMN_KEY.LOCATION])
      .map(row => {
        const id = row[PRIVATE_COLUMN_KEY.ID];
        const repoID = window.sfMetadataContext.getSetting('repoID');
        const fileName = getFileNameFromRecord(row);
        const parentDir = getParentDirFromRecord(row);
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}`;
        const { lng, lat } = row[PRIVATE_COLUMN_KEY.LOCATION];
        return isValidPosition(lng, lat) ? { id, src, lng, lat } : null;
      })
      .filter(Boolean);
  }, [metadata]);

  const addMapController = useCallback(() => {
    var navigation = new window.BMap.NavigationControl();
    const GeolocationControl = createBMapGeolocationControl(window.BMap, (err, point) => {
      if (!err && point) {
        mapRef.current.setCenter({ lng: point.lng, lat: point.lat });
      }
    });
    const geolocationControl = new GeolocationControl();
    mapRef.current.addControl(geolocationControl);
    mapRef.current.addControl(navigation);
  }, []);

  const renderMarkersBatch = useCallback(() => {
    if (!validImages.length || !clusterRef.current) return;

    const startIndex = batchIndexRef.current * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, validImages.length);
    const batchMarkers = [];

    for (let i = startIndex; i < endIndex; i++) {
      const image = validImages[i];
      const { lng, lat } = image;
      const point = new window.BMap.Point(lng, lat);
      const marker = customImageOverlay(point, image.src);
      batchMarkers.push(marker);
    }

    clusterRef.current.addMarkers(batchMarkers);

    if (endIndex < validImages.length) {
      batchIndexRef.current += 1;
      setTimeout(renderMarkersBatch, 20); // Schedule the next batch
    }
  }, [validImages]);

  const initializeClusterer = useCallback(() => {
    if (mapRef.current && !clusterRef.current) {
      clusterRef.current = new window.BMapLib.MarkerClusterer(mapRef.current);
    }
  }, []);

  const initializeUserMarker = useCallback(() => {
    if (!window.BMap) return;

    const imageUrl = `${mediaUrl}/img/marker.png`;
    const addMarker = (lng, lat) => {
      const point = new window.BMap.Point(lng, lat);
      const avatarMarker = customAvatarOverlay(point, appAvatarURL, imageUrl);
      mapRef.current.addOverlay(avatarMarker);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => addMarker(position.coords.longitude, position.coords.latitude), 
        () => addMarker(DEFAULT_POSITION.lng, DEFAULT_POSITION.lat)
      );
    } else {
      addMarker(DEFAULT_POSITION.lng, DEFAULT_POSITION.lat);
    }
  }, []);

  const renderBaiduMap = useCallback(() => {
    setIsLoading(false);
    if (!window.BMap.Map) return;
    let mapCenter = window.sfMetadataContext.localStorage.getItem('map-center') || DEFAULT_POSITION;
    // ask for user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((userInfo) => {
        mapCenter = { lng: userInfo.coords.longitude, lat: userInfo.coords.latitude };
        window.sfMetadataContext.localStorage.setItem('map-center', mapCenter);
      });
    }
    if (!isValidPosition(mapCenter?.lng, mapCenter?.lat)) return;

    const gcPosition = wgs84_to_gcj02(mapCenter.lng, mapCenter.lat);
    const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
    const { lng, lat } = bdPosition;

    mapRef.current = new window.BMap.Map('sf-metadata-map-container', { enableMapClick: false });
    const point = new window.BMap.Point(lng, lat);
    mapRef.current.centerAndZoom(point, DEFAULT_ZOOM);
    mapRef.current.enableScrollWheelZoom(true);

    addMapController();
    initializeUserMarker();
    initializeClusterer();

    batchIndexRef.current = 0; // Reset batch index
    renderMarkersBatch();
  }, [addMapController, initializeClusterer, initializeUserMarker, renderMarkersBatch]);

  useEffect(() => {
    if (mapInfo) {
      if (mapInfo.type === MAP_TYPE.B_MAP) {
        window.renderMap = renderBaiduMap;
        loadBMap(mapInfo.key).then(() => renderBaiduMap());
        return;
      }
    }

    return () => {
      if (mapInfo.type === MAP_TYPE.B_MAP) {
        window.renderMap = null;
      }
    };
  }, [mapInfo, renderBaiduMap]);

  return (
    <div className="w-100 h-100 sf-metadata-view-map">
      {isLoading ? <Loading /> : (
        <div className="sf-metadata-map-container" ref={mapRef} id="sf-metadata-map-container"></div>
      )}
    </div>
  );
};

export default Map;
