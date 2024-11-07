import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import loadBMap, { initMapInfo } from '../../../utils/map-utils';
import { wgs84_to_gcj02, gcj02_to_bd09 } from '../../../utils/coord-transform';
import { MAP_TYPE } from '../../../constants';
import Loading from '../../../components/loading';
import { isValidPosition } from '../../utils/validate';
import { baiduMapKey, googleMapKey, siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { useMetadataView } from '../../hooks/metadata-view';
import { PREDEFINED_FILE_TYPE_OPTION_KEY, PRIVATE_COLUMN_KEY } from '../../constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';
import { Utils } from '../../../utils/utils';
import buildImageOverlay from './buildImageOverlay';
import { createBMapGeolocationControl } from './geolocation-control';

import './index.css';

const DEFAULT_POSITION = { lng: 104.195, lat: 35.861 };
const DEFAULT_ZOOM = 5;
const DEFAULT_USER_ZOOM = 15;

const Map = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const mapRef = useRef(null);
  const googleMarkerRef = useRef(null);
  const clusterRef = useRef(null);

  const { metadata } = useMetadataView();

  const mapInfo = useMemo(() => {
    const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
    return { type, key };
  }, []);

  const validImages = useMemo(() => {
    // filter rows who has PRIVATE_COLUMN_KEY.LOCATION key
    const images = metadata.rows.filter(row => row[PRIVATE_COLUMN_KEY.FILE_TYPE] === PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE && row[PRIVATE_COLUMN_KEY.LOCATION])
      .reduce((acc, row) => {
        const id = row[PRIVATE_COLUMN_KEY.ID];
        const repoID = window.sfMetadataContext.getSetting('repoID');
        const fileName = getFileNameFromRecord(row);
        const parentDir = getParentDirFromRecord(row);
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}`;
        const { lng, lat } = row[PRIVATE_COLUMN_KEY.LOCATION];
        if (isValidPosition(lng, lat)) {
          acc.push({
            id,
            src,
            lng,
            lat
          });
        }
        return acc;
      }
      , []);
    return images;
  }, [metadata]);

  const addMarkerByPosition = useCallback((lng, lat) => {
    if (mapInfo.type === MAP_TYPE.B_MAP) {
      const point = new window.BMap.Point(lng, lat);
      const marker = new window.BMap.Marker(point, { offset: new window.BMap.Size(-2, -5) });
      if (mapRef.current) {
        mapRef.current.clearOverlays();
        mapRef.current.addOverlay(marker);
        mapRef.current.setCenter(point);
      }
      return;
    }
    if (mapInfo.type === MAP_TYPE.G_MAP) {
      if (!googleMarkerRef.current) {
        googleMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lng, lat },
          map: mapRef.current,
        });
        return;
      }
      googleMarkerRef.current.setPosition({ lng, lat });
      return;
    }
  }, [mapInfo]);

  const addMapController = useCallback(() => {
    var navigation = new window.BMap.NavigationControl();
    const GeolocationControl = createBMapGeolocationControl(window.BMap, (err, point) => !err && mapRef.current.setCenter({ lng: point.lng, lat: point.lat }));
    let geolocationControl = new GeolocationControl();
    mapRef.current.addControl(geolocationControl);
    mapRef.current.addControl(navigation);
  }, []);

  const renderMarkers = useCallback(() => {
    if (!validImages.length || !clusterRef.current) return;

    const customMarkers = [];
    validImages.forEach(image => {
      const { lng, lat } = image;
      const point = new window.BMap.Point(lng, lat);
      const marker = buildImageOverlay(point, image.src);
      customMarkers.push(marker);
    });

    clusterRef.current.clearMarkers();
    clusterRef.current.addMarkers(customMarkers);
  }, [validImages]);

  const initializeClusterer = useCallback(() => {
    if (mapRef.current && !clusterRef.current) {
      clusterRef.current = new window.BMapLib.MarkerClusterer(mapRef.current);
    }
  }, []);

  const renderBaiduMap = useCallback(() => {
    setIsLoading(false);
    if (!window.BMap.Map) return;
    if (!isValidPosition(position?.lng, position?.lat)) return;
    const gcPosition = wgs84_to_gcj02(position.lng, position.lat);
    const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
    const { lng, lat } = bdPosition;
    mapRef.current = new window.BMap.Map('sf-metadata-map-container', { enableMapClick: false });
    const point = new window.BMap.Point(lng, lat);
    mapRef.current.centerAndZoom(point, zoom);
    mapRef.current.enableScrollWheelZoom(true);

    addMapController();
    addMarkerByPosition(lng, lat);

    initializeClusterer();

    renderMarkers();
  }, [position, zoom, addMarkerByPosition, addMapController, initializeClusterer, renderMarkers]);

  // const renderGoogleMap = useCallback((position) => {
  //   setIsLoading(false);
  //   if (!window.google.maps.Map) return;
  //   if (!isValidPosition(position?.lng, position?.lat)) return;
  //   const gcPosition = wgs84_to_gcj02(position.lng, position.lat);
  //   const { lng, lat } = gcPosition || {};
  //   mapRef.current = new window.google.maps.Map(mapRef.current, {
  //     zoom: 16,
  //     center: gcPosition,
  //     mapId: googleMapId,
  //     zoomControl: false,
  //     mapTypeControl: false,
  //     scaleControl: false,
  //     streetViewControl: false,
  //     rotateControl: false,
  //     fullscreenControl: false
  //   });
  //   addMarkerByPosition(lng, lat);
  //   mapRef.current.setCenter(gcPosition);
  //   // var geocoder = new window.google.maps.Geocoder();
  //   // var latLng = new window.google.maps.LatLng(lat, lng);
  //   // geocoder.geocode({ 'location': latLng }, (results, status) => {
  //   //   if (status === 'OK') {
  //   //     if (results[0]) {
  //   //       var address = results[0].formatted_address.split(' ')[1];
  //   //       setAddress(address);
  //   //     } else {
  //   //       toaster.warning(gettext('No address found for the given coordinates.'));
  //   //     }
  //   //   }
  //   // });
  // }, [addMarkerByPosition]);

  // get user location
  useEffect(() => {
    if (mapInfo) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setPosition({ lng: longitude, lat: latitude });
        setZoom(DEFAULT_USER_ZOOM);
      },
      () => {
        setPosition(DEFAULT_POSITION);
        setZoom(DEFAULT_ZOOM);
      }
      );
    }
  }, [mapInfo]);

  // init map
  useEffect(() => {
    if (mapInfo) {
      if (mapInfo.type === MAP_TYPE.B_MAP) {
        loadBMap(mapInfo.key).then(() => renderBaiduMap());
        return;
      }
    }

    return () => {
      if (mapInfo.type === MAP_TYPE.B_MAP) {
        window.renderBaiduMap = null;
      }
    };
  }, [mapInfo, renderBaiduMap]);

  return (
    <div className='w-100 h-100 sf-metadata-view-map'>
      {isLoading && (<Loading />)}
      <div className="sf-metadata-map-container" ref={mapRef} id="sf-metadata-map-container"></div>
    </div>
  );
};

export default Map;
