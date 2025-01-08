import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import loadBMap, { initMapInfo } from '../../../utils/map-utils';
import { appAvatarURL, baiduMapKey, gettext, googleMapKey, mediaUrl } from '../../../utils/constants';
import { isValidPosition } from '../../utils/validate';
import { wgs84_to_gcj02, gcj02_to_bd09 } from '../../../utils/coord-transform';
import { MAP_TYPE as MAP_PROVIDER } from '../../../constants';
import { EVENT_BUS_TYPE, MAP_TYPE, STORAGE_MAP_CENTER_KEY, STORAGE_MAP_TYPE_KEY, STORAGE_MAP_ZOOM_KEY } from '../../constants';
import { createBMapGeolocationControl, createBMapZoomControl } from './control';
import { customAvatarOverlay, customImageOverlay } from './overlay';
import toaster from '../../../components/toast';

const DEFAULT_POSITION = { lng: 104.195, lat: 35.861 };
const DEFAULT_ZOOM = 4;
const BATCH_SIZE = 500;

const Main = ({ images, onOpenCluster }) => {
  const mapInfo = useMemo(() => initMapInfo({ baiduMapKey, googleMapKey }), []);

  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const batchIndexRef = useRef(0);

  const addMapController = useCallback(() => {
    const ZoomControl = createBMapZoomControl(window.BMap);
    const zoomControl = new ZoomControl();
    const GeolocationControl = createBMapGeolocationControl(window.BMap, (err, point) => {
      if (!err && point) {
        mapRef.current.setCenter({ lng: point.lng, lat: point.lat });
      }
    });

    const geolocationControl = new GeolocationControl();

    mapRef.current.addControl(zoomControl);
    mapRef.current.addControl(geolocationControl);
  }, []);

  const initializeUserMarker = useCallback(() => {
    if (!window.BMap) return;

    const imageUrl = `${mediaUrl}/img/marker.png`;
    const addMarker = (lng, lat) => {
      const gcPosition = wgs84_to_gcj02(lng, lat);
      const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
      const point = new window.BMap.Point(bdPosition.lng, bdPosition.lat);
      const avatarMarker = customAvatarOverlay(point, appAvatarURL, imageUrl);
      mapRef.current && mapRef.current.addOverlay(avatarMarker);
    };

    if (!navigator.geolocation) {
      addMarker(DEFAULT_POSITION.lng, DEFAULT_POSITION.lat);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => addMarker(position.coords.longitude, position.coords.latitude),
      () => {
        addMarker(DEFAULT_POSITION.lng, DEFAULT_POSITION.lat);
        toaster.danger(gettext('Failed to get user location'));
      }
    );
  }, []);

  const getBMapType = useCallback((type) => {
    switch (type) {
      case MAP_TYPE.SATELLITE: {
        return window.BMAP_SATELLITE_MAP;
      }
      default: {
        return window.BMAP_NORMAL_MAP;
      }
    }
  }, []);

  const saveMapState = useCallback(() => {
    if (!mapRef.current) return;
    const point = mapRef.current.getCenter && mapRef.current.getCenter();
    const zoom = mapRef.current.getZoom && mapRef.current.getZoom();
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_CENTER_KEY, point);
    window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_ZOOM_KEY, zoom);
  }, []);

  const loadMapState = useCallback(() => {
    const savedCenter = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_CENTER_KEY) || DEFAULT_POSITION;
    const savedZoom = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_ZOOM_KEY) || DEFAULT_ZOOM;
    return { center: savedCenter, zoom: savedZoom };
  }, []);

  const onClickMarker = useCallback((e, markers) => {
    saveMapState();

    const imageIds = markers.map(marker => marker._imageId);
    onOpenCluster(imageIds);
  }, [onOpenCluster, saveMapState]);

  const renderMarkersBatch = useCallback(() => {
    if (!images.length || !clusterRef.current) return;

    const startIndex = batchIndexRef.current * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, images.length);
    const batchMarkers = [];

    for (let i = startIndex; i < endIndex; i++) {
      const image = images[i];
      const { lng, lat } = image;
      const point = new window.BMap.Point(lng, lat);
      const marker = customImageOverlay(point, image, {
        callback: (e, markers) => onClickMarker(e, markers)
      });
      batchMarkers.push(marker);
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
        callback: (e, markers) => onClickMarker(e, markers)
      });
    }
  }, [onClickMarker]);

  const renderBaiduMap = useCallback(() => {
    if (!mapRef.current || !window.BMap.Map) return;
    let { center, zoom } = loadMapState();
    // ask for user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((userInfo) => {
        center = { lng: userInfo.coords.longitude, lat: userInfo.coords.latitude };
        window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_CENTER_KEY, center);
      });
    }
    if (!isValidPosition(center?.lng, center?.lat)) return;

    const gcPosition = wgs84_to_gcj02(center.lng, center.lat);
    const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
    const { lng, lat } = bdPosition;

    mapRef.current = new window.BMap.Map('sf-metadata-map-container', { enableMapClick: false });
    const point = new window.BMap.Point(lng, lat);
    mapRef.current.centerAndZoom(point, zoom);
    mapRef.current.enableScrollWheelZoom(true);


    const savedValue = window.sfMetadataContext.localStorage.getItem(STORAGE_MAP_TYPE_KEY);
    mapRef.current && mapRef.current.setMapType(getBMapType(savedValue));

    addMapController();
    initializeUserMarker();
    initializeCluster();

    batchIndexRef.current = 0;
    renderMarkersBatch();
  }, [addMapController, initializeCluster, initializeUserMarker, renderMarkersBatch, getBMapType, loadMapState]);

  useEffect(() => {
    const modifyMapTypeSubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_MAP_TYPE, (newType) => {
      window.sfMetadataContext.localStorage.setItem(STORAGE_MAP_TYPE_KEY, newType);
      mapRef.current && mapRef.current.setMapType(getBMapType(newType));
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
  }, [mapInfo, renderBaiduMap]);

  return (
    <div className="sf-metadata-view-map">
      <div className="sf-metadata-map-container" ref={mapRef} id="sf-metadata-map-container"></div>
    </div>
  );
};

Main.propTypes = {
  images: PropTypes.array,
  onOpenCluster: PropTypes.func,
};

export default Main;
