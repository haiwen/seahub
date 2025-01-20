import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import loadBMap, { initMapInfo } from '../../../../utils/map-utils';
import { appAvatarURL, baiduMapKey, googleMapKey, mediaUrl } from '../../../../utils/constants';
import { isValidPosition } from '../../../utils/validate';
import { wgs84_to_gcj02, gcj02_to_bd09 } from '../../../../utils/coord-transform';
import { MAP_TYPE as MAP_PROVIDER } from '../../../../constants';
import { EVENT_BUS_TYPE, MAP_TYPE, STORAGE_MAP_CENTER_KEY, STORAGE_MAP_TYPE_KEY, STORAGE_MAP_ZOOM_KEY } from '../../../constants';
import { createBMapGeolocationControl, createBMapZoomControl } from './control';
import { customAvatarOverlay, customImageOverlay } from './overlay';

import './index.css';
import ModalPortal from '../../../../components/modal-portal';
import ImageDialog from '../../../../components/dialog/image-dialog';

const DEFAULT_POSITION = { lng: 104.195, lat: 35.861 };
const DEFAULT_ZOOM = 4;
const BATCH_SIZE = 500;
const MAX_ZOOM = 21;
const MIN_ZOOM = 3;

const MapView = ({ images, onDeleteRecords }) => {
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [clusterImageIds, setClusterImageIds] = useState([]);

  const mapInfo = useMemo(() => initMapInfo({ baiduMapKey, googleMapKey }), []);
  const imageCluster = useMemo(() => {
    return images.filter(image => clusterImageIds.includes(image.id));
  }, [images, clusterImageIds]);

  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const batchIndexRef = useRef(0);
  const markersMapRef = useRef({});

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

  const onClickMarker = useCallback((e, markers) => {
    saveMapState();
    const imageIds = markers.map(marker => marker._id);
    // onOpenCluster(imageIds);
    setClusterImageIds(imageIds);
    setIsImagePopupOpen(true);
  }, [saveMapState]);

  const renderMarkersBatch = useCallback(() => {
    if (!images.length || !clusterRef.current) return;

    const startIndex = batchIndexRef.current * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, images.length);
    const batchMarkers = [];

    for (let i = startIndex; i < endIndex; i++) {
      const image = images[i];
      const { lng, lat } = image;
      const point = new window.BMapGL.Point(lng, lat);
      const marker = customImageOverlay(point, image, {
        callback: (e, markers) => onClickMarker(e, markers)
      });
      batchMarkers.push(marker);
      markersMapRef.current[image.id] = marker;
    }
    clusterRef.current.addMarkers(batchMarkers);

    if (endIndex < images.length) {
      batchIndexRef.current += 1;
      setTimeout(renderMarkersBatch, 20); // Schedule the next batch
    }
  }, [images, onClickMarker]);

  const initializeCluster = useCallback(() => {
    if (mapRef.current && !clusterRef.current) {
      clusterRef.current = new window.BMapLib.MarkerCluster(mapRef.current, {
        callback: (e, markers) => onClickMarker(e, markers),
        maxZoom: 21,
      });
    }
  }, [onClickMarker]);

  const renderBaiduMap = useCallback(() => {
    if (!mapRef.current || !window.BMapGL.Map) return;
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
    mapRef.current = new window.BMapGL.Map('sf-metadata-map-container', {
      enableMapClick: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      mapType: getBMapType(mapTypeValue),
    });

    if (isValidPosition(center?.lng, center?.lat)) {
      mapRef.current.centerAndZoom(center, zoom);
    }

    mapRef.current.enableScrollWheelZoom(true);
    addMapController();

    initializeUserMarker(userPosition);
    initializeCluster();

    batchIndexRef.current = 0;
    renderMarkersBatch();
  }, [addMapController, initializeCluster, initializeUserMarker, renderMarkersBatch, getBMapType, loadMapState]);

  const closeCluster = useCallback(() => {
    setIsImagePopupOpen(false);
  }, []);

  const moveToPrevImage = useCallback(() => {
    setImageIndex((imageIndex + imageCluster.length - 1) % imageCluster.length);
  }, [imageIndex, imageCluster.length]);

  const moveToNextImage = useCallback(() => {
    setImageIndex((imageIndex + 1) % imageCluster.length);
  }, [imageIndex, imageCluster.length]);

  const handelDelete = useCallback(() => {
    const image = imageCluster[imageIndex];
    if (!image) return;
    onDeleteRecords([image.id]);

    const marker = markersMapRef.current[image.id];
    if (marker) {
      clusterRef.current.removeMarker(marker);
      delete markersMapRef.current[image.id];
    }
  }, [imageCluster, imageIndex, onDeleteRecords]);

  useEffect(() => {
    const modifyMapTypeSubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_MAP_TYPE, (newType) => {
      window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_TYPE_KEY, newType);
      const mapType = getBMapType(newType);
      mapRef.current && mapRef.current.setMapType(mapType);
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
    <div className="sf-metadata-view-map">
      <div className="sf-metadata-map-container" ref={mapRef} id="sf-metadata-map-container"></div>
      {isImagePopupOpen && (
        <ModalPortal>
          <ImageDialog
            imageItems={imageCluster}
            imageIndex={imageIndex}
            closeImagePopup={closeCluster}
            moveToPrevImage={moveToPrevImage}
            moveToNextImage={moveToNextImage}
            onDeleteImage={handelDelete}
          />
        </ModalPortal>
      )}
    </div>
  );
};

MapView.propTypes = {
  images: PropTypes.array,
  onOpenCluster: PropTypes.func,
};

export default MapView;
