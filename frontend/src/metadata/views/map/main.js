import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import loadBMap, { initMapInfo } from '../../../utils/map-utils';
import { appAvatarURL, baiduMapKey, gettext, googleMapKey, mediaUrl } from '../../../utils/constants';
import { isValidPosition } from '../../utils/validate';
import { wgs84_to_gcj02, gcj02_to_bd09 } from '../../../utils/coord-transform';
import { MAP_TYPE as MAP_PROVIDER } from '../../../constants';
import { EVENT_BUS_TYPE, MAP_TYPE } from '../../constants';
import { createBMapGeolocationControl, createBMapZoomControl } from './control';
import { customAvatarOverlay, customImageOverlay } from './overlay';
import toaster from '../../../components/toast';

const DEFAULT_POSITION = { lng: 104.195, lat: 35.861 };
const DEFAULT_ZOOM = 4;
const BATCH_SIZE = 500;

const Main = ({ validImages, onOpen }) => {
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

  const getMapType = useCallback((type) => {
    if (!mapRef.current) return;
    switch (type) {
      case MAP_TYPE.SATELLITE:
        return window.BMAP_SATELLITE_MAP;
      default:
        return window.BMAP_NORMAL_MAP;
    }
  }, []);

  const onClickMarker = useCallback((e, markers) => {
    const imageIds = markers.map(marker => marker._imageId);
    onOpen(imageIds);
  }, [onOpen]);

  const renderMarkersBatch = useCallback(() => {
    if (!validImages.length || !clusterRef.current) return;

    const startIndex = batchIndexRef.current * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, validImages.length);
    const batchMarkers = [];

    for (let i = startIndex; i < endIndex; i++) {
      const image = validImages[i];
      const { lng, lat } = image;
      const point = new window.BMap.Point(lng, lat);
      const marker = customImageOverlay(point, image, {
        callback: (e, markers) => onClickMarker(e, markers)
      });
      batchMarkers.push(marker);
    }
    clusterRef.current.addMarkers(batchMarkers);

    if (endIndex < validImages.length) {
      batchIndexRef.current += 1;
      setTimeout(renderMarkersBatch, 20); // Schedule the next batch
    }
  }, [validImages, onClickMarker]);

  const initializeClusterer = useCallback(() => {
    if (mapRef.current && !clusterRef.current) {
      clusterRef.current = new window.BMapLib.MarkerClusterer(mapRef.current, {
        callback: (e, markers) => onClickMarker(e, markers)
      });
    }
  }, [onClickMarker]);

  const renderBaiduMap = useCallback(() => {
    if (!mapRef.current || !window.BMap.Map) return;
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

    const savedValue = window.sfMetadataContext.localStorage.getItem('map-type');
    mapRef.current && mapRef.current.setMapType(getMapType(savedValue));

    addMapController();
    initializeUserMarker();
    initializeClusterer();

    batchIndexRef.current = 0;
    renderMarkersBatch();
  }, [addMapController, initializeClusterer, initializeUserMarker, renderMarkersBatch, getMapType]);

  useEffect(() => {
    const switchMapTypeSubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SWITCH_MAP_TYPE, (newType) => {
      window.sfMetadataContext.localStorage.setItem('map-type', newType);
      mapRef.current && mapRef.current.setMapType(getMapType(newType));
    });

    return () => {
      switchMapTypeSubscribe();
    };

  }, [getMapType]);

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
  validImages: PropTypes.array,
  onOpen: PropTypes.func,
};

export default Main;
