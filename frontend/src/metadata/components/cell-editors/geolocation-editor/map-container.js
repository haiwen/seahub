import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { createBMapGeolocationControl, createBMapZoomControl } from '../../map-controller';
import { createZoomControl } from '../../map-controller/zoom';
import { createGeolocationControl } from '../../map-controller/geolocation';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { baiduMapKey, googleMapId, googleMapKey } from '../../../../utils/constants';
import { MAP_TYPE } from '../../../../constants';
import { isValidPosition } from '../../../utils/validate';
import { DEFAULT_POSITION } from '../../../constants';

const MapContainer = ({
  position,
  locationTranslated,
  type,
  mapRefs,
  onPositionChange,
  onAddressChange,
  onLocationTranslatedChange,
  onMapReady,
  isFullScreen,
  updateTrigger,
}) => {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const geocRef = useRef(null);
  const markerRef = useRef(null);
  const googlePlacesRef = useRef(null);

  const performReverseGeocode = useCallback((position, callback) => {
    if (type === MAP_TYPE.B_MAP && geocRef.current) {
      const point = new window.BMapGL.Point(position.lng, position.lat);
      geocRef.current.getLocation(point, (result) => {
        if (result?.address) {
          const locationData = {
            address: result.address,
            country: result.addressComponents?.country || '',
            province: result.addressComponents?.province || '',
            city: result.addressComponents?.city || '',
            district: result.addressComponents?.district || '',
            street: result.addressComponents?.street || '',
          };
          callback(result.address, locationData);
        }
      });
    } else if (type === MAP_TYPE.G_MAP && geocRef.current) {
      const latLng = new window.google.maps.LatLng(position.lat, position.lng);
      geocRef.current.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const result = results[0];
          const components = result.address_components || [];

          const getComponent = (types) => {
            const component = components.find(comp =>
              types.some(type => comp.types.includes(type))
            );
            return component?.long_name || '';
          };

          const locationData = {
            address: result.formatted_address,
            country: getComponent(['country']),
            province: getComponent(['administrative_area_level_1']),
            city: getComponent(['locality', 'administrative_area_level_2']),
            district: getComponent(['sublocality', 'administrative_area_level_3']),
            street: getComponent(['route']),
          };

          callback(result.formatted_address, locationData);
        }
      });
    }
  }, [type]);

  const handleMapClick = useCallback((point, useStoredData = false) => {
    if (onPositionChange) {
      const newPosition = type === MAP_TYPE.B_MAP
        ? { lng: point.lng, lat: point.lat }
        : point;
      onPositionChange(newPosition);

      if (mapRef.current) {
        if (type === MAP_TYPE.B_MAP) {
          const baiduPoint = new window.BMapGL.Point(newPosition.lng, newPosition.lat);
          if (!markerRef.current) {
            markerRef.current = new window.BMapGL.Marker(baiduPoint, {
              offset: new window.BMapGL.Size(-2, -5),
            });
            mapRef.current.addOverlay(markerRef.current);
          } else {
            if (mapRef.current.getOverlays().indexOf(markerRef.current) === -1) {
              mapRef.current.addOverlay(markerRef.current);
            }
            markerRef.current.setPosition(baiduPoint);
          }
          mapRef.current.setCenter(baiduPoint);
        } else if (type === MAP_TYPE.G_MAP) {
          const latLng = new window.google.maps.LatLng(newPosition.lat, newPosition.lng);
          if (!markerRef.current) {
            markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
              position: latLng,
              map: mapRef.current,
            });
          } else {
            markerRef.current.position = latLng;
            if (!markerRef.current.map) {
              markerRef.current.map = mapRef.current;
            }
          }
          mapRef.current.panTo(latLng);
        }
      }

      if (!useStoredData && onAddressChange) {
        performReverseGeocode(newPosition, (address, locationData) => {
          onAddressChange(address);
          if (onLocationTranslatedChange && locationData) {
            onLocationTranslatedChange(locationData);
          }
        });
      }
    }
  }, [type, performReverseGeocode, onPositionChange, onAddressChange, onLocationTranslatedChange]);

  const handleGeolocationClick = useCallback((point) => {
    handleMapClick(point, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupBaiduMapControls = useCallback((map) => {
    const ZoomControl = createBMapZoomControl({
      anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
      offset: { x: 16, y: 30 },
    });
    const zoomControl = new ZoomControl();
    map.addControl(zoomControl);

    const GeolocationControl = createBMapGeolocationControl({
      anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
      offset: { x: 16, y: 96 },
      callback: handleGeolocationClick,
    });
    const geolocationControl = new GeolocationControl();
    map.addControl(geolocationControl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupGoogleMapControls = useCallback((map) => {
    const zoomControl = createZoomControl({ map });
    const geolocationControl = createGeolocationControl({
      map,
      callback: handleGeolocationClick,
    });
    map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomControl);
    map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(geolocationControl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeBaiduMarker = useCallback((map, point) => {
    geocRef.current = new window.BMapGL.Geocoder();

    if (isValidPosition(position?.lng, position?.lat)) {
      markerRef.current = new window.BMapGL.Marker(point, {
        offset: new window.BMapGL.Size(-2, -5),
      });
      map.addOverlay(markerRef.current);
    } else {
      markerRef.current = null;
    }
  }, [position]);

  const initializeGoogleMarker = useCallback((map, initialPosition) => {
    geocRef.current = new window.google.maps.Geocoder();
    googlePlacesRef.current = new window.google.maps.places.PlacesService(map);

    const isValid = isValidPosition(position?.lng, position?.lat);
    if (isValid) {
      markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        position: initialPosition,
        map,
      });
    } else {
      markerRef.current = null;
    }
  }, [position]);

  const setupBaiduMapEvents = useCallback((map) => {
    map.addEventListener('click', (e) => {
      const { lng, lat } = e.latlng;
      const point = new window.BMapGL.Point(lng, lat);

      if (!markerRef.current) {
        markerRef.current = new window.BMapGL.Marker(point, {
          offset: new window.BMapGL.Size(-2, -5),
        });
        map.addOverlay(markerRef.current);
      } else {
        if (map.getOverlays().indexOf(markerRef.current) === -1) {
          map.addOverlay(markerRef.current);
        }
        markerRef.current.setPosition(point);
      }
      map.setCenter(point);
      handleMapClick(point, false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupGoogleMapEvents = useCallback((map) => {
    window.google.maps.event.addListener(map, 'click', (e) => {
      const latLng = e.latLng;
      const point = { lat: latLng.lat(), lng: latLng.lng() };

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          position: point,
          map,
        });
      } else {
        markerRef.current.position = latLng;
      }
      map.panTo(latLng);
      handleMapClick(point, false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL?.Map || !ref.current) return;

    mapRef.current = new window.BMapGL.Map(ref.current);
    const initPos = isValidPosition(position?.lng, position?.lat) ? position : DEFAULT_POSITION;
    const point = new window.BMapGL.Point(initPos.lng, initPos.lat);

    setTimeout(() => {
      mapRef.current.centerAndZoom(point, 16);
      mapRef.current.enableScrollWheelZoom();
      mapRef.current.clearOverlays();

      setupBaiduMapControls(mapRef.current);
      initializeBaiduMarker(mapRef.current, point);
      setupBaiduMapEvents(mapRef.current);

      if (isValidPosition(position?.lng, position?.lat)) {
        if (locationTranslated?.address) {
          const actualPoint = new window.BMapGL.Point(position.lng, position.lat);
          markerRef.current.setPosition(actualPoint);
          mapRef.current.setCenter(actualPoint);
          handleMapClick(actualPoint, true);
        } else {
          handleMapClick(point, false);
        }
      }

      if (onMapReady) {
        const refs = {
          mapRef: mapRef.current,
          markerRef: markerRef.current,
          geocRef: geocRef.current,
          googlePlacesRef: googlePlacesRef.current,
        };

        if (mapRefs) {
          mapRefs.current.baiduMap = mapRef.current;
          mapRefs.current.baiduMarker = markerRef.current;
        }

        onMapReady(refs);
      }
    }, 10);
  }, [
    position,
    locationTranslated?.address,
    setupBaiduMapControls,
    initializeBaiduMarker,
    setupBaiduMapEvents,
    handleMapClick,
    onMapReady,
    mapRefs,
  ]);

  const renderGoogleMap = useCallback(() => {
    if (!window.google?.maps?.Map || !ref.current) return;

    const isValid = isValidPosition(position?.lng, position?.lat);
    const initPos = isValid ? position : DEFAULT_POSITION;
    const isDark = document.body.getAttribute('data-bs-theme') === 'dark';
    const initialCenter = isValid && locationTranslated?.address ? position : initPos;

    mapRef.current = new window.google.maps.Map(ref.current, {
      center: initialCenter,
      zoom: 16,
      mapId: googleMapId,
      zoomControl: false,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      disableDefaultUI: true,
      gestrueHandling: 'cooperative',
      clickableIcons: false,
      colorScheme: isDark
        ? window.google.maps.ColorScheme.DARK
        : window.google.maps.ColorScheme.LIGHT,
    });

    setTimeout(() => {
      window.google.maps.event.trigger(mapRef.current, 'resize');
      mapRef.current.setCenter(initialCenter);

      setupGoogleMapControls(mapRef.current);
      initializeGoogleMarker(mapRef.current, initPos);
      setupGoogleMapEvents(mapRef.current);

      if (isValid) {
        if (locationTranslated?.address) {
          handleMapClick(position, true);
        } else {
          handleMapClick(position, false);
        }
      }

      if (onMapReady) {
        const refs = {
          mapRef: mapRef.current,
          markerRef: markerRef.current,
          geocRef: geocRef.current,
          googlePlacesRef: googlePlacesRef.current,
        };

        if (mapRefs) {
          mapRefs.current.googleMap = mapRef.current;
          mapRefs.current.googleMarker = markerRef.current;
        }

        onMapReady(refs);
      }
    }, 10);
  }, [
    position,
    locationTranslated?.address,
    setupGoogleMapControls,
    initializeGoogleMarker,
    setupGoogleMapEvents,
    handleMapClick,
    onMapReady,
    mapRefs,
  ]);

  const renderBaiduMapRef = useRef();
  const renderGoogleMapRef = useRef();

  renderBaiduMapRef.current = renderBaiduMap;
  renderGoogleMapRef.current = renderGoogleMap;

  const initializeMap = useCallback(() => {
    const { type: mapType, key } = initMapInfo({ baiduMapKey, googleMapKey });
    if (mapType === MAP_TYPE.B_MAP) {
      if (!window.BMapGL) {
        window.renderBaiduMap = () => renderBaiduMapRef.current?.();
        loadMapSource(mapType, key);
      } else {
        renderBaiduMapRef.current?.();
      }
    } else if (mapType === MAP_TYPE.G_MAP) {
      if (!window.google?.maps.Map) {
        window.renderGoogleMap = () => renderGoogleMapRef.current?.();
        loadMapSource(mapType, key);
      } else {
        renderGoogleMapRef.current?.();
      }
    }
  }, []);

  useEffect(() => {
    markerRef.current = null;
    const timeoutId = setTimeout(initializeMap, 10);
    return () => {
      clearTimeout(timeoutId);
      markerRef.current = null;
    };
  }, [initializeMap]);

  useEffect(() => {
    if (mapRef.current) {
      const timeoutId = setTimeout(() => {
        if (type === MAP_TYPE.B_MAP && window.BMapGL) {
          mapRef.current.resize();
        } else if (type === MAP_TYPE.G_MAP && window.google?.maps) {
          window.google.maps.event.trigger(mapRef.current, 'resize');
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isFullScreen, type]);

  // Handle position updates from search results
  useEffect(() => {
    if (mapRef.current && position && isValidPosition(position.lng, position.lat)) {
      if (type === MAP_TYPE.B_MAP) {
        const point = new window.BMapGL.Point(position.lng, position.lat);
        if (markerRef.current) {
          if (mapRef.current.getOverlays().indexOf(markerRef.current) === -1) {
            mapRef.current.addOverlay(markerRef.current);
          }
          markerRef.current.setPosition(point);
        } else {
          markerRef.current = new window.BMapGL.Marker(point, {
            offset: new window.BMapGL.Size(-2, -5),
          });
          mapRef.current.addOverlay(markerRef.current);
        }
        mapRef.current.setCenter(point);
      } else if (type === MAP_TYPE.G_MAP) {
        const latLng = new window.google.maps.LatLng(position.lat, position.lng);
        if (markerRef.current) {
          markerRef.current.position = latLng;
          if (!markerRef.current.map) {
            markerRef.current.map = mapRef.current;
          }
        } else {
          markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            position: latLng,
            map: mapRef.current,
          });
        }
        mapRef.current.panTo(latLng);
      }
    }
  }, [position, type, updateTrigger]);

  return (
    <div
      ref={ref}
      className="w-100 h-100 sf-metadata-geolocation-editor-container"
    />
  );
};

MapContainer.propTypes = {
  position: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
  }),
  locationTranslated: PropTypes.shape({
    address: PropTypes.string,
  }),
  type: PropTypes.string.isRequired,
  mapRefs: PropTypes.object.isRequired,
  onPositionChange: PropTypes.func.isRequired,
  onAddressChange: PropTypes.func,
  onLocationTranslatedChange: PropTypes.func,
  onMapReady: PropTypes.func,
  isFullScreen: PropTypes.bool,
  updateTrigger: PropTypes.number,
};

export default MapContainer;
