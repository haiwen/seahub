import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileNameFromRecord, getFileTypeFromRecord, getImageLocationFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { isValidPosition } from '../../utils/validate';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../utils/coord-transform';
import loadBMap, { initMapInfo } from '../../../utils/map-utils';
import { appAvatarURL, baiduMapKey, fileServerRoot, googleMapKey, mediaUrl, siteRoot, thumbnailSizeForGrid, thumbnailSizeForOriginal } from '../../../utils/constants';
import { MAP_TYPE as MAP_PROVIDER, PRIVATE_FILE_TYPE } from '../../../constants';
import { EVENT_BUS_TYPE, MAP_TYPE, PREDEFINED_FILE_TYPE_OPTION_KEY, STORAGE_MAP_CENTER_KEY, STORAGE_MAP_TYPE_KEY, STORAGE_MAP_ZOOM_KEY } from '../../constants';
import { createBMapGeolocationControl, createBMapZoomControl } from './control';
import { customAvatarOverlay, customImageOverlay } from './overlay';
import ModalPortal from '../../../components/modal-portal';
import ImageDialog from '../../../components/dialog/image-dialog';

import './index.css';

const DEFAULT_POSITION = { lng: 104.195, lat: 35.861 };
const DEFAULT_ZOOM = 4;
const MAX_ZOOM = 21;
const MIN_ZOOM = 3;

const Map = () => {
  const [imageIndex, setImageIndex] = useState(0);
  const [clusterLeaveIds, setClusterLeaveIds] = useState([]);

  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const clickTimeoutRef = useRef(null);
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
          location: bdPosition
        };
      })
      .filter(Boolean);
  }, [repoID, repoInfo.encrypted, metadata]);

  const mapInfo = useMemo(() => initMapInfo({ baiduMapKey, googleMapKey }), []);
  const clusterLeaves = useMemo(() => images.filter(image => clusterLeaveIds.includes(image.id)), [images, clusterLeaveIds]);

  const getPoints = useCallback(() => {
    if (!window.Cluster || !images) return [];
    return window.Cluster.pointTransformer(images, (data) => ({
      point: [data.location.lng, data.location.lat],
      properties: {
        id: data.id,
        src: data.src,
      }
    }));
  }, [images]);

  const saveMapState = useCallback(() => {
    if (!mapRef.current) return;
    const point = mapRef.current.getCenter && mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom && mapRef.current.getZoom();
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_CENTER_KEY, point);
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_ZOOM_KEY, zoom);
  }, []);

  const addMapController = useCallback(() => {
    const ZoomControl = createBMapZoomControl(window.BMapGL, { maxZoom: MAX_ZOOM, minZoom: MIN_ZOOM }, saveMapState);
    const zoomControl = new ZoomControl();
    const GeolocationControl = createBMapGeolocationControl(window.BMapGL, (point) => {
      point && mapRef.current && mapRef.current.setCenter(point);
    });

    const geolocationControl = new GeolocationControl();
    mapRef.current.addControl(zoomControl);
    mapRef.current.addControl(geolocationControl);
  }, [saveMapState]);

  const initializeUserMarker = useCallback((centerPoint) => {
    if (!window.BMapGL || !mapRef.current) return;
    const imageUrl = `${mediaUrl}img/marker.png`;
    const avatarMarker = customAvatarOverlay(centerPoint, appAvatarURL, imageUrl);
    mapRef.current.addOverlay(avatarMarker);
  }, []);

  const getBMapType = useCallback((type) => {
    switch (type) {
      case MAP_TYPE.SATELLITE: {
        return window.BMAP_EARTH_MAP;
      }
      default: {
        return window.BMAP_NORMAL_MAP;
      }
    }
  }, []);

  const loadMapState = useCallback(() => {
    const savedCenter = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_CENTER_KEY) || DEFAULT_POSITION;
    const savedZoom = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_ZOOM_KEY) || DEFAULT_ZOOM;
    return { center: savedCenter, zoom: savedZoom };
  }, []);

  const initializeCluster = useCallback(() => {
    clusterRef.current = new window.Cluster.View(mapRef.current, {
      clusterRadius: 60,
      updateRealTime: true,
      fitViewOnClick: false,
      isAnimation: true,
      clusterMap: (properties) => ({ src: properties.src, id: properties.id }),
      clusterReduce: (acc, properties) => {
        if (!acc.properties) {
          acc.properties = [];
        }
        acc.properties.push(properties);
      },
      renderClusterStyle: {
        type: window.Cluster.ClusterRender.DOM,
        style: { offsetX: -40, offsetY: -80 },
        inject: (props) => customImageOverlay(props),
      },
    });

    clusterRef.current.setData(getPoints());

    clusterRef.current.on(window.Cluster.ClusterEvent.CLICK, (element) => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        return;
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          let imageIds = [];
          if (element.isCluster) {
            imageIds = clusterRef.current.getLeaves(element.id).map(item => item.properties.id).filter(Boolean);
          } else {
            imageIds = [element.properties.id];
          }
          clickTimeoutRef.current = null;
          setClusterLeaveIds(imageIds);
        }, 300);
      }
    });
    window.BMapCluster = clusterRef.current;
  }, [getPoints]);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL.Map) return;
    let { center, zoom } = loadMapState();
    let userPosition = { lng: 116.40396418840683, lat: 39.915106021711345 };
    // ask for user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((userInfo) => {
        const gcPosition = wgs84_to_gcj02(userInfo.coords.longitude, userInfo.coords.latitude);
        const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
        const { lng, lat } = bdPosition;
        userPosition = new window.BMapGL.Point(lng, lat);
        center = userPosition;
        window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_CENTER_KEY, center);
      });
    }
    const mapTypeValue = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_TYPE_KEY);

    if (!window.BMapInstance) {
      mapRef.current = new window.BMapGL.Map('sf-metadata-map-container', {
        enableMapClick: false,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        mapType: getBMapType(mapTypeValue),
      });
      window.BMapInstance = mapRef.current;

      if (isValidPosition(center?.lng, center?.lat)) {
        mapRef.current.centerAndZoom(center, zoom);
      }

      mapRef.current.enableScrollWheelZoom(true);
      addMapController();

      initializeUserMarker(userPosition);
      initializeCluster();
    } else {
      const viewDom = document.getElementById('sf-metadata-view-map');
      const container = window.BMapInstance.getContainer();
      viewDom.replaceChild(container, mapRef.current);

      mapRef.current = window.BMapInstance;
      clusterRef.current = window.BMapCluster;
      clusterRef.current.setData(getPoints());
    }
  }, [addMapController, initializeCluster, initializeUserMarker, getBMapType, loadMapState, getPoints]);

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

  useEffect(() => {
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${viewID}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const modifyMapTypeSubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_MAP_TYPE, (newType) => {
      window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_TYPE_KEY, newType);
      const mapType = getBMapType(newType);
      mapRef.current && mapRef.current.setMapType(mapType);
      mapRef.current.setCenter(mapRef.current.getCenter());
    });

    return () => {
      modifyMapTypeSubscribe();
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapInfo.type === MAP_PROVIDER.B_MAP) {
      loadBMap(mapInfo.key).then(() => renderBaiduMap());
      return () => {
        window.renderMap = null;
      };
    }
    return;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-metadata-view-map" id="sf-metadata-view-map">
      <div ref={mapRef} className="sf-metadata-map-container" id="sf-metadata-map-container"></div>
      {clusterLeaveIds.length > 0 && (
        <ModalPortal>
          <ImageDialog
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
