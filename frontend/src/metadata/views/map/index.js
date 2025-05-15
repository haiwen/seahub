import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileNameFromRecord, getFileTypeFromRecord, getImageLocationFromRecord, getParentDirFromRecord,
  getRecordIdFromRecord, getFileMTimeFromRecord } from '../../utils/cell';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { isValidPosition } from '../../utils/validate';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../utils/coord-transform';
import { initMapInfo, loadBMap, loadGMap } from '../../../utils/map-utils';
import { baiduMapKey, fileServerRoot, googleMapKey, siteRoot, thumbnailSizeForGrid, thumbnailSizeForOriginal } from '../../../utils/constants';
import { MAP_TYPE as MAP_PROVIDER, PRIVATE_FILE_TYPE } from '../../../constants';
import { EVENT_BUS_TYPE, MAP_TYPE, PREDEFINED_FILE_TYPE_OPTION_KEY, STORAGE_MAP_CENTER_KEY, STORAGE_MAP_TYPE_KEY, STORAGE_MAP_ZOOM_KEY, DEFAULT_POSITION, DEFAULT_ZOOM } from '../../constants';
import ModalPortal from '../../../components/modal-portal';
import ImageDialog from '../../../components/dialog/image-dialog';
import { createClusterer, createGoogleMap } from './google';
import { createBaiduMap } from './baidu';

import './index.css';

const Map = () => {
  const [imageIndex, setImageIndex] = useState(0);
  const [clusterLeaveIds, setClusterLeaveIds] = useState([]);
  const [center, setCenter] = useState(DEFAULT_POSITION);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const mapRef = useRef(null);
  const containerRef = useRef(null);
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
        const mtime = getFileMTimeFromRecord(record);
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
          thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${mtime}`;
        }

        return {
          id,
          name,
          src: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}?mtime=${mtime}`,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          downloadURL: `${fileServerRoot}repos/${repoID}/files${path}?op=download`,
          thumbnail,
          parentDir,
          location: bdPosition,
          wgs_84: { lng, lat },
        };
      })
      .filter(Boolean);
  }, [repoID, repoInfo.encrypted, metadata]);

  const mapInfo = useMemo(() => initMapInfo({ baiduMapKey, googleMapKey }), []);
  const clusterLeaves = useMemo(() => images.filter(image => clusterLeaveIds.includes(image.id)), [images, clusterLeaveIds]);

  const onMapState = useCallback(() => {
    if (!mapRef.current) return;
    const point = mapRef.current.getCenter && mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom && mapRef.current.getZoom();
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_CENTER_KEY, point);
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_ZOOM_KEY, zoom);
  }, []);

  const onClusterLeaveIds = useCallback((ids) => {
    setClusterLeaveIds(ids);
  }, []);

  const getPoints = useCallback((images) => {
    if (!window.Cluster || !images) return [];
    return window.Cluster.pointTransformer(images, (data) => ({
      point: [data.location.lng, data.location.lat],
      properties: {
        id: data.id,
        src: data.src,
      }
    }));
  }, []);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL.Map) return;
    mapRef.current = createBaiduMap({ images, center, zoom, getPoints, onMapState, onClusterLeaveIds });
  }, [images, center, zoom, getPoints, onMapState, onClusterLeaveIds]);

  const renderGoogleMap = useCallback(() => {
    if (!window.google?.maps?.Map) return;
    mapRef.current = createGoogleMap({ images, center, zoom, onMapState, onClusterLeaveIds });
    window.mapViewInstance = mapRef.current;
  }, [images, center, zoom, onMapState, onClusterLeaveIds]);

  const handleClose = useCallback(() => {
    setImageIndex(0);
    setClusterLeaveIds([]);
  }, []);

  const moveToPrevImage = useCallback(() => {
    setImageIndex((imageIndex + clusterLeaves.length - 1) % clusterLeaves.length);
  }, [imageIndex, clusterLeaves.length]);

  const moveToNextImage = useCallback(() => {
    setImageIndex((imageIndex + 1) % clusterLeaves.length);
  }, [imageIndex, clusterLeaves.length]);

  const onMapTypeChange = useCallback((newType) => {
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_TYPE_KEY, newType);

    if (mapInfo.type === MAP_PROVIDER.B_MAP) {
      const baiduMapType = {
        [MAP_TYPE.MAP]: window.BMAP_NORMAL_MAP,
        [MAP_TYPE.SATELLITE]: window.BMAP_SATELLITE_MAP
      }[newType] || window.BMAP_NORMAL_MAP;

      mapRef.current?.setMapType(baiduMapType);
    } else if (mapInfo.type === MAP_PROVIDER.G_MAP) {
      const googleMapType = {
        [MAP_TYPE.MAP]: window.google.maps.MapTypeId.ROADMAP,
        [MAP_TYPE.SATELLITE]: window.google.maps.MapTypeId.HYBRID
      }[newType] || window.google.maps.MapTypeId.ROADMAP;

      mapRef.current?.setMapTypeId(googleMapType);
    }

    mapRef.current?.setCenter(mapRef.current.getCenter());
  }, [mapInfo.type]);

  const onClearMapInstance = useCallback(() => {
    if (window.mapViewInstance) {
      if (mapInfo.type === MAP_PROVIDER.B_MAP) {
        window.mapViewInstance.destroy();
      } else if (mapInfo.type === MAP_PROVIDER.G_MAP) {
        window.mapViewInstance.setMap(null);
      }
      delete window.mapViewInstance;
    }
    mapRef.current = null;
  }, [mapInfo.type]);

  const loadMapState = useCallback(() => {
    const savedCenter = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_CENTER_KEY) || DEFAULT_POSITION;
    const savedZoom = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_ZOOM_KEY) || DEFAULT_ZOOM;
    setCenter(savedCenter);
    setZoom(savedZoom);
  }, []);

  useEffect(() => {
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${viewID}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadMapState();
    const unsubscribeModifyMapType = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_MAP_TYPE, onMapTypeChange);
    const unsubscribeClearMapInstance = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.CLEAR_MAP_INSTANCE, onClearMapInstance);

    return () => {
      unsubscribeModifyMapType();
      unsubscribeClearMapInstance();
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapInfo.type === MAP_PROVIDER.B_MAP) {
      if (!window.mapViewInstance) {
        loadBMap(mapInfo.key).then(() => renderBaiduMap());
      } else {
        const viewDom = document.getElementById('sf-metadata-view-map');
        const container = window.mapViewInstance.getContainer();
        viewDom.replaceChild(container, containerRef.current);

        mapRef.current = window.mapViewInstance;
        window.BMapCluster.setData(getPoints());
      }
    } else if (mapInfo.type === MAP_PROVIDER.G_MAP) {
      if (!window.mapViewInstance) {
        loadGMap(mapInfo.key).then(() => renderGoogleMap());
      } else {
        const viewDom = document.getElementById('sf-metadata-view-map');
        const container = window.mapViewInstance.getDiv();
        viewDom.replaceChild(container, containerRef.current);

        mapRef.current = window.mapViewInstance;
        createClusterer(mapRef.current, images, onMapState);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-metadata-view-map" id="sf-metadata-view-map">
      <div ref={containerRef} className="sf-metadata-map-container" id="sf-metadata-map-container"></div>
      {clusterLeaveIds.length > 0 && (
        <ModalPortal>
          <ImageDialog
            repoID={repoID}
            repoInfo={repoInfo}
            imageItems={clusterLeaves}
            imageIndex={imageIndex}
            closeImagePopup={handleClose}
            moveToPrevImage={moveToPrevImage}
            moveToNextImage={moveToNextImage}
          />
        </ModalPortal>
      )}
    </div>
  );
};

export default Map;
