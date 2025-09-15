import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {
  createBMapGeolocationControl,
  createBMapZoomControl,
} from '../../map-controller';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import {
  baiduMapKey,
  gettext,
  googleMapId,
  googleMapKey,
  lang,
} from '../../../../utils/constants';
import { KeyCodes, MAP_TYPE } from '../../../../constants';
import Icon from '../../../../components/icon';
import IconBtn from '../../../../components/icon-btn';
import { createZoomControl } from '../../map-controller/zoom';
import { createGeolocationControl } from '../../map-controller/geolocation';
import { isValidPosition } from '../../../utils/validate';
import { DEFAULT_POSITION } from '../../../constants';

import './index.css';

const MapInstanceCache = {
  instances: new Map(),

  getKey(containerId, type) {
    return `${type}_${containerId}`;
  },

  get(containerId, type) {
    const key = this.getKey(containerId, type);
    return this.instances.get(key);
  },

  set(containerId, type, mapInstance) {
    const key = this.getKey(containerId, type);
    this.instances.set(key, mapInstance);
  },

  remove(containerId, type) {
    const key = this.getKey(containerId, type);
    this.instances.delete(key);
  },

  clear() {
    this.instances.clear();
  },
};

const GeolocationEditor = ({
  position,
  locationTranslated,
  isFullScreen,
  onSubmit,
  onFullScreen,
  onDeleteLocation,
  onMapReady,
  editorId = 'default',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isMapInitialized, setMapInitialized] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [hasPositionChanged, setHasPositionChanged] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const type = useMemo(() => {
    const { type } = initMapInfo({ baiduMapKey, googleMapKey });
    return type;
  }, []);

  useEffect(() => {
    setCurrentPosition(position);
    setHasPositionChanged(false);
  }, [position]);

  const ref = useRef(null);
  const mapRef = useRef(null);
  const geocRef = useRef(null);
  const markerRef = useRef(null);
  const googlePlacesRef = useRef(null);
  const containerIdRef = useRef(`geolocation-editor-${editorId}-${Date.now()}`);

  useEffect(() => {
    if (locationTranslated?.address) {
      setInputValue(locationTranslated.address);
    }
  }, [locationTranslated]);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
    if (searchError) {
      setSearchError('');
    }
  }, [searchError]);

  const search = useCallback(() => {
    if (!mapRef.current || isSearching) return;
    if (!inputValue.trim()) {
      setSearchError(gettext('Please enter a search term'));
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    if (type === MAP_TYPE.B_MAP) {
      const options = {
        onSearchComplete: (results) => {
          setIsSearching(false);

          try {
            if (!results) {
              setSearchError(gettext('Search service unavailable. Please try again.'));
              return;
            }

            if (typeof results.getCurrentNumPois !== 'function' || typeof results.getPoi !== 'function') {
              setSearchError(gettext('Search service unavailable. Please try again.'));
              return;
            }

            let status = null;
            if (typeof results.getStatus === 'function') {
              status = results.getStatus();

              if (status !== undefined && status !== null && typeof window.BMAP_STATUS_SUCCESS !== 'undefined') {
                if (status !== window.BMAP_STATUS_SUCCESS) {
                  let errorMessage = gettext('Search failed, please enter detailed address.');

                  if (status === window.BMAP_STATUS_CITY_LIST) {
                    errorMessage = gettext('Multiple cities found. Please be more specific.');
                  } else if (status === window.BMAP_STATUS_UNKNOWN_LOCATION) {
                    errorMessage = gettext('Location not found. Please check your input.');
                  } else if (status === window.BMAP_STATUS_UNKNOWN_ROUTE) {
                    errorMessage = gettext('No route found for this location.');
                  } else if (status === window.BMAP_STATUS_INVALID_KEY) {
                    errorMessage = gettext('Map service error. Please contact support.');
                  } else if (status === window.BMAP_STATUS_INVALID_REQUEST) {
                    errorMessage = gettext('Invalid search request. Please try different keywords.');
                  }

                  setSearchError(errorMessage);
                  return;
                }
              }
            }

            const numPois = results.getCurrentNumPois();

            if (numPois === 0) {
              setSearchError(gettext('No results found. Try different keywords or check spelling.'));
              return;
            }

            const searchResults = [];
            for (let i = 0; i < numPois; i++) {
              const value = results.getPoi(i);
              if (value && value.point) {
                searchResults.push({
                  address: value.address || '',
                  title: value.title || '',
                  tag: value.tags || [],
                  lngLat: {
                    lng: value.point.lng,
                    lat: value.point.lat,
                  },
                });
              }
            }

            if (searchResults.length === 0) {
              setSearchError(gettext('No valid results found. Try different keywords.'));
              return;
            }

            setSearchResults(searchResults);
          } catch (error) {
            setIsSearching(false);
            setSearchError(gettext('Search failed due to technical issues. Please try again.'));
          }
        },
        onSearchError: () => {
          setIsSearching(false);
          setSearchError(gettext('Network error occurred. Please check your connection and try again.'));
        }
      };

      try {
        const local = new window.BMapGL.LocalSearch(mapRef.current, options);
        local.search(inputValue);
      } catch (error) {
        setIsSearching(false);
        setSearchError(gettext('Map service is not available. Please try again later.'));
      }
    } else if (type === MAP_TYPE.G_MAP) {
      const request = {
        query: inputValue,
        language: lang,
      };

      if (!googlePlacesRef.current) {
        setIsSearching(false);
        setSearchError(gettext('Google Maps service is not available. Please try again later.'));
        return;
      }

      try {
        googlePlacesRef.current.textSearch(request, (results, status) => {
          setIsSearching(false);

          if (status === 'OK' && results?.length) {
            const searchResults = results.map((result) => ({
              address: result.formatted_address || '',
              title: result.name || '',
              tag: result.types || [],
              lngLat: {
                lng: result.geometry.location.lng(),
                lat: result.geometry.location.lat(),
              },
            }));
            setSearchResults(searchResults);
          } else {
            let errorMessage = gettext('No results found. Try different keywords or check spelling.');

            if (status === 'ZERO_RESULTS') {
              errorMessage = gettext('No results found. Try different keywords or check spelling.');
            } else if (status === 'OVER_QUERY_LIMIT') {
              errorMessage = gettext('Search limit exceeded. Please try again later.');
            } else if (status === 'REQUEST_DENIED') {
              errorMessage = gettext('Search request denied. Please contact support.');
            } else if (status === 'INVALID_REQUEST') {
              errorMessage = gettext('Invalid search request. Please try different keywords.');
            } else if (status !== 'OK') {
              errorMessage = gettext('Search failed due to technical issues. Please try again.');
            }

            setSearchError(errorMessage);
          }
        });
      } catch (error) {
        setIsSearching(false);
        setSearchError(gettext('Search failed due to technical issues. Please try again.'));
      }
    }
  }, [type, inputValue, isSearching]);

  const onKeyDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      if (e.keyCode === KeyCodes.Enter) {
        search();
      } else if (e.keyCode === KeyCodes.Backspace) {
        setSearchResults([]);
      }
    },
    [search]
  );

  const clear = useCallback(() => {
    setInputValue('');
    setSearchResults([]);
    setSearchError('');
    setIsSearching(false);
    if (type === MAP_TYPE.B_MAP) {
      mapRef.current?.clearOverlays();
    }
  }, [type]);

  const handleDeleteLocation = useCallback(() => {
    setInputValue('');
    setSearchResults([]);
    setSearchError('');
    setIsSearching(false);
    if (type === MAP_TYPE.B_MAP) {
      mapRef.current?.clearOverlays();
    }
    onDeleteLocation && onDeleteLocation();
  }, [type, onDeleteLocation]);

  const submit = useCallback(
    (value) => {
      const { position, location_translated } = value;
      const location = {
        position,
        location_translated,
      };
      onSubmit(location);
    },
    [onSubmit]
  );

  const handleSubmitLocation = useCallback(() => {
    if (!currentPosition || !inputValue) return;

    const locationData = {
      position: currentPosition,
      location_translated: {
        address: inputValue,
        country: locationTranslated?.country || '',
        province: locationTranslated?.province || '',
        city: locationTranslated?.city || '',
        district: locationTranslated?.district || '',
        street: locationTranslated?.street || '',
      },
    };
    submit(locationData);
  }, [currentPosition, inputValue, locationTranslated, submit]);

  const parseBMapAddress = useCallback((result) => {
    const { surroundingPois, address, addressComponents, point } = result;
    const hasNearbyPoi = surroundingPois.length > 0;
    const poi = hasNearbyPoi ? surroundingPois[0] : null;

    return {
      position: { lng: point.lng, lat: point.lat },
      location_translated: {
        address: hasNearbyPoi ? poi.address : address,
        country: '',
        province: hasNearbyPoi ? poi.province : addressComponents.province,
        city: hasNearbyPoi ? poi.city : addressComponents.city,
        district: hasNearbyPoi ? '' : addressComponents.district,
        street: hasNearbyPoi ? '' : addressComponents.street,
      },
      title: hasNearbyPoi ? poi.title || '' : '',
      tags: hasNearbyPoi ? poi.tags || [] : [],
    };
  }, []);

  const parseGMapAddress = useCallback((result) => {
    const location_translated = {
      country: '',
      province: '',
      city: '',
      district: '',
      street: '',
    };

    result.address_components.forEach((component) => {
      if (component.types.includes('country')) {
        location_translated.country = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        location_translated.province = component.long_name;
      } else if (component.types.includes('locality')) {
        location_translated.city = component.long_name;
      } else if (component.types.includes('sublocality')) {
        location_translated.district = component.long_name;
      } else if (component.types.includes('route')) {
        location_translated.street = component.long_name;
      }
    });
    location_translated.address = result.formatted_address;

    const position = {
      lng: result.geometry.location.lng(),
      lat: result.geometry.location.lat(),
    };

    return { position, location_translated };
  }, []);

  const updateMarkerAndAddress = useCallback(
    (point, useStoredData = false) => {
      if (type === MAP_TYPE.B_MAP) {
        if (useStoredData && locationTranslated?.address && position) {
          const storedPoint = new window.BMapGL.Point(
            position.lng,
            position.lat
          );

          if (markerRef.current) {
            markerRef.current.setPosition(storedPoint);
          }
          if (mapRef.current) {
            mapRef.current.setCenter(storedPoint);
          }
          setInputValue(locationTranslated.address);
          return;
        }

        if (markerRef.current) {
          markerRef.current.setPosition(point);
        }
        if (mapRef.current) {
          mapRef.current.setCenter(point);
        }

        const newPosition = { lng: point.lng, lat: point.lat };
        setCurrentPosition(newPosition);
        setHasPositionChanged(true);

        geocRef.current.getLocation(point, (result) => {
          const info = parseBMapAddress(result);
          const { title, location_translated } = info;
          setInputValue(location_translated.address || title);
        });
      } else {
        if (useStoredData && locationTranslated?.address && position) {
          if (markerRef.current) {
            markerRef.current.position = position;
          } else {
            markerRef.current =
              new window.google.maps.marker.AdvancedMarkerElement({
                position: position,
                map: mapRef.current,
              });
          }
          if (mapRef.current) {
            mapRef.current.panTo(position);
          }
          setInputValue(locationTranslated.address);
          return;
        }

        if (markerRef.current) {
          markerRef.current.position = point;
        } else {
          markerRef.current =
            new window.google.maps.marker.AdvancedMarkerElement({
              position: point,
              map: mapRef.current,
            });
        }
        if (mapRef.current) {
          mapRef.current.panTo(point);
        }

        setCurrentPosition(point);
        setHasPositionChanged(true);

        geocRef.current.geocode(
          { location: point, language: lang },
          (results, status) => {
            if (status === 'OK' && results[0]) {
              const info = parseGMapAddress(results[0]);
              setInputValue(info.location_translated.address);
            }
          }
        );
      }
    },
    [type, parseBMapAddress, parseGMapAddress, locationTranslated, position]
  );

  const initializeOrReuseMap = useCallback(() => {
    if (!ref.current) return;

    const containerId = containerIdRef.current;

    const cachedMap = MapInstanceCache.get(containerId, type);

    if (
      cachedMap &&
      cachedMap.getContainer &&
      cachedMap.getContainer() === ref.current
    ) {
      mapRef.current = cachedMap;
      setMapInitialized(true);

      const targetPosition = isValidPosition(position?.lng, position?.lat)
        ? position
        : DEFAULT_POSITION;

      if (type === MAP_TYPE.B_MAP) {
        const point = new window.BMapGL.Point(
          targetPosition.lng,
          targetPosition.lat
        );
        mapRef.current.setCenter(point);

        if (markerRef.current) {
          markerRef.current.setPosition(point);
        }

        if (locationTranslated?.address) {
          updateMarkerAndAddress(point, true);
        }
      } else if (type === MAP_TYPE.G_MAP) {
        mapRef.current.setCenter(targetPosition);

        if (markerRef.current) {
          markerRef.current.position = targetPosition;
        } else if (isValidPosition(position?.lng, position?.lat)) {
          markerRef.current =
            new window.google.maps.marker.AdvancedMarkerElement({
              position: targetPosition,
              map: mapRef.current,
            });
        }

        if (locationTranslated?.address) {
          updateMarkerAndAddress(targetPosition, true);
        }
      }

      onMapReady?.();
      return;
    }

    if (type === MAP_TYPE.B_MAP) {
      renderBaiduMap();
    } else if (type === MAP_TYPE.G_MAP) {
      renderGoogleMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, position, locationTranslated, updateMarkerAndAddress, onMapReady]);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL.Map || !ref.current) return;

    mapRef.current = new window.BMapGL.Map(ref.current);
    const initPos = isValidPosition(position?.lng, position?.lat)
      ? position
      : DEFAULT_POSITION;
    const point = new window.BMapGL.Point(initPos.lng, initPos.lat);

    setTimeout(() => {
      mapRef.current.centerAndZoom(point, 16);
      mapRef.current.enableScrollWheelZoom();
      mapRef.current.clearOverlays();

      MapInstanceCache.set(containerIdRef.current, type, mapRef.current);

      const ZoomControl = createBMapZoomControl({
        anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
        offset: { x: 16, y: 30 },
      });
      const zoomControl = new ZoomControl();
      mapRef.current.addControl(zoomControl);

      const GeolocationControl = createBMapGeolocationControl({
        anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
        offset: { x: 16, y: 96 },
        callback: (point) => {
          if (mapRef.current.getOverlays().length === 0) {
            mapRef.current.addOverlay(markerRef.current);
          }
          mapRef.current.centerAndZoom(point, 16);
          markerRef.current.setPosition(point);
          updateMarkerAndAddress(point, false);
        },
      });
      const geolocationControl = new GeolocationControl();
      mapRef.current.addControl(geolocationControl);

      markerRef.current = new window.BMapGL.Marker(point, {
        offset: new window.BMapGL.Size(-2, -5),
      });
      geocRef.current = new window.BMapGL.Geocoder();

      if (isValidPosition(position?.lng, position?.lat)) {
        mapRef.current.addOverlay(markerRef.current);

        if (locationTranslated?.address) {
          const actualPoint = new window.BMapGL.Point(
            position.lng,
            position.lat
          );
          markerRef.current.setPosition(actualPoint);
          mapRef.current.setCenter(actualPoint);
          updateMarkerAndAddress(actualPoint, true);
        } else {
          updateMarkerAndAddress(point, false);
        }
      }

      mapRef.current.addEventListener('click', (e) => {
        if (searchResults.length > 0) {
          setSearchResults([]);
          return;
        }
        const { lng, lat } = e.latlng;
        const point = new window.BMapGL.Point(lng, lat);
        if (mapRef.current.getOverlays().length === 0) {
          mapRef.current.addOverlay(markerRef.current);
        }
        markerRef.current.setPosition(point);
        mapRef.current.setCenter(point);
        updateMarkerAndAddress(point, false);
      });

      setMapInitialized(true);
      onMapReady?.();
    }, 10);
  }, [
    position,
    onMapReady,
    updateMarkerAndAddress,
    locationTranslated?.address,
    searchResults.length,
    type,
  ]);

  const renderGoogleMap = useCallback(() => {
    if (!window.google?.maps?.Map || !ref.current) return;

    const isValid = isValidPosition(position?.lng, position?.lat);
    const initPos = isValid ? position : DEFAULT_POSITION;
    const isDark = document.body.getAttribute('data-bs-theme') === 'dark';

    const initialCenter =
      isValid && locationTranslated?.address ? position : initPos;

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

      MapInstanceCache.set(containerIdRef.current, type, mapRef.current);

      const zoomControl = createZoomControl({ map: mapRef.current });
      const geolocationControl = createGeolocationControl({
        map: mapRef.current,
        callback: (lngLat) => {
          if (!markerRef.current) {
            markerRef.current =
              new window.google.maps.marker.AdvancedMarkerElement({
                position: lngLat,
                map: mapRef.current,
              });
          } else {
            markerRef.current.position = lngLat;
          }
          updateMarkerAndAddress(lngLat, false);
        },
      });
      mapRef.current.controls[
        window.google.maps.ControlPosition.RIGHT_BOTTOM
      ].push(zoomControl);
      mapRef.current.controls[
        window.google.maps.ControlPosition.RIGHT_BOTTOM
      ].push(geolocationControl);

      if (isValid) {
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement(
          {
            position,
            map: mapRef.current,
          }
        );
      }

      geocRef.current = new window.google.maps.Geocoder();
      if (isValid) {
        if (locationTranslated?.address) {
          updateMarkerAndAddress(position, true);
        } else {
          updateMarkerAndAddress(position, false);
        }
      }

      googlePlacesRef.current = new window.google.maps.places.PlacesService(
        mapRef.current
      );

      window.google.maps.event.addListener(mapRef.current, 'click', (e) => {
        if (searchResults.length > 0) {
          setSearchResults([]);
          return;
        }
        const latLng = e.latLng;
        const point = { lat: latLng.lat(), lng: latLng.lng() };

        if (!markerRef.current) {
          markerRef.current =
            new window.google.maps.marker.AdvancedMarkerElement({
              position: point,
              map: mapRef.current,
            });
        } else {
          markerRef.current.position = latLng;
        }
        mapRef.current.panTo(latLng);
        updateMarkerAndAddress(point, false);
      });

      setMapInitialized(true);
      onMapReady?.();
    }, 10);
  }, [
    position,
    locationTranslated?.address,
    onMapReady,
    updateMarkerAndAddress,
    searchResults.length,
    type,
  ]);

  const toggleFullScreen = useCallback(
    (e) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      onFullScreen();
    },
    [onFullScreen]
  );

  const onSelect = useCallback(
    (result) => {
      if (!mapRef.current) return;

      const { lngLat, title, address } = result;
      let point = lngLat;
      if (type === MAP_TYPE.B_MAP) {
        const { lng, lat } = lngLat;
        point = new window.BMapGL.Point(lng, lat);
        if (mapRef.current.getOverlays().length === 0) {
          mapRef.current.addOverlay(markerRef.current);
        }
        markerRef.current.setPosition(point);
        mapRef.current.setCenter(point);

        const newPosition = { lng, lat };
        setCurrentPosition(newPosition);
        setHasPositionChanged(true);
      } else {
        const point = { lat: lngLat.lat, lng: lngLat.lng };
        if (markerRef.current) {
          markerRef.current.position = point;
        } else {
          markerRef.current =
            new window.google.maps.marker.AdvancedMarkerElement({
              position: point,
              map: mapRef.current,
            });
        }
        mapRef.current.panTo(point);

        setCurrentPosition(point);
        setHasPositionChanged(true);
      }
      setSearchResults([]);
      setSearchError('');
      setInputValue(title || address);
    },
    [type]
  );

  useEffect(() => {
    markerRef.current = null;
    setMapInitialized(false);

    const initializeMap = () => {
      const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
      if (type === MAP_TYPE.B_MAP) {
        if (!window.BMapGL) {
          window.renderBaiduMap = () => initializeOrReuseMap();
          loadMapSource(type, key);
        } else {
          initializeOrReuseMap();
        }
      } else if (type === MAP_TYPE.G_MAP) {
        if (!window.google?.maps.Map) {
          window.renderGoogleMap = () => initializeOrReuseMap();
          loadMapSource(type, key);
        } else {
          initializeOrReuseMap();
        }
      }
    };

    const timeoutId = setTimeout(initializeMap, 10);

    return () => {
      clearTimeout(timeoutId);
      markerRef.current = null;
    };
  }, [initializeOrReuseMap]);

  useEffect(() => {
    if (!isMapInitialized || !mapRef.current) return;

    const targetPosition = isValidPosition(position?.lng, position?.lat)
      ? position
      : DEFAULT_POSITION;

    if (type === MAP_TYPE.B_MAP) {
      const point = new window.BMapGL.Point(
        targetPosition.lng,
        targetPosition.lat
      );

      if (locationTranslated?.address && position) {
        if (markerRef.current) {
          markerRef.current.setPosition(point);
          mapRef.current.setCenter(point);
          updateMarkerAndAddress(point, true);
        }
      }
    } else if (type === MAP_TYPE.G_MAP) {
      if (locationTranslated?.address && position) {
        if (markerRef.current) {
          markerRef.current.position = targetPosition;
          mapRef.current.panTo(targetPosition);
          updateMarkerAndAddress(targetPosition, true);
        }
      }
    }
  }, [
    position,
    locationTranslated,
    isMapInitialized,
    type,
    updateMarkerAndAddress,
  ]);

  return (
    <div
      className={classNames('sf-geolocation-editor-container', {
        'full-screen': isFullScreen,
      })}
    >
      <div className="editor-header">
        <div className="title">
          <Icon symbol="location" size={24} className="location-icon" />
          <span className="ml-2">{gettext('Address')}</span>
        </div>
        <div className="header-actions">
          <IconBtn
            className="full-screen"
            symbol="full-screen"
            size={24}
            onClick={toggleFullScreen}
          />
          <span
            className="cur-view-path-btn sf3-font sf3-font-delete1"
            aria-label={gettext('Delete location')}
            title={gettext('Delete location')}
            onClick={handleDeleteLocation}
          >
          </span>
          <button
            className="btn btn-primary"
            onClick={handleSubmitLocation}
            disabled={!hasPositionChanged || !inputValue}
          >
            {gettext('Save')}
          </button>
        </div>
      </div>
      <div className="w-100 h-100 position-relative">
        <div className="search-container">
          <div className="flex-1 d-flex position-relative">
            <input
              type="text"
              value={inputValue}
              className="form-control search-input"
              placeholder={gettext('Please enter the address')}
              title={inputValue}
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
            {inputValue && (
              <IconBtn
                symbol="close"
                className="clean-btn"
                size={24}
                onClick={clear}
              />
            )}
          </div>
          <span
            className="search-btn"
            onClick={search}
            disabled={isSearching || !inputValue.trim()}
            style={{
              opacity: (!inputValue.trim() || isSearching) ? 0.6 : 1,
              cursor: (!inputValue.trim() || isSearching) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSearching ? (
              <i className="fa fa-spinner fa-spin"></i>
            ) : (
              <i className="sf3-font sf3-font-search"></i>
            )}
          </span>
        </div>

        {searchError && (
          <div className="search-error-container">
            <div className="search-error-message">
              <Icon symbol="warning" size={16} className="error-icon" />
              <span>{searchError}</span>
            </div>
          </div>
        )}

        <div
          ref={ref}
          className="w-100 h-100 sf-metadata-geolocation-editor-container"
        >
        </div>

        {isSearching && (
          <div className="search-loading-container">
            <div className="search-loading-message">
              <i className="fa fa-spinner fa-spin"></i>
              <span className="ml-2">{gettext('Searching...')}</span>
            </div>
          </div>
        )}

        {searchResults.length > 0 && !isSearching && (
          <div className="search-results-container">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={() => onSelect(result)}
              >
                <span className="search-result-item-title">
                  {result.title || ''}
                </span>
                <span className="search-result-item-address">
                  {result.address || ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

GeolocationEditor.propTypes = {
  position: PropTypes.shape({
    lat: PropTypes.number,
    lng: PropTypes.number,
  }),
  locationTranslated: PropTypes.shape({
    address: PropTypes.string,
    city: PropTypes.string,
    country: PropTypes.string,
    district: PropTypes.string,
    province: PropTypes.string,
  }),
  isFullScreen: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onFullScreen: PropTypes.func.isRequired,
  onDeleteLocation: PropTypes.func,
  onMapReady: PropTypes.func,
  editorId: PropTypes.string,
};

export default GeolocationEditor;
