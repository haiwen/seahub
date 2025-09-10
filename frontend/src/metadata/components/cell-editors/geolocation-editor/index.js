import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { createBMapGeolocationControl, createBMapZoomControl } from '../../map-controller';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { baiduMapKey, gettext, googleMapId, googleMapKey, lang } from '../../../../utils/constants';
import { KeyCodes, MAP_TYPE } from '../../../../constants';
import Icon from '../../../../components/icon';
import IconBtn from '../../../../components/icon-btn';
import toaster from '../../../../components/toast';
import { createZoomControl } from '../../map-controller/zoom';
import { createGeolocationControl } from '../../map-controller/geolocation';
import { customBMapLabel, customGMapLabel } from './custom-label';
import { isValidPosition } from '../../../utils/validate';
import { DEFAULT_POSITION } from '../../../constants';

import './index.css';

const GeolocationEditor = ({ position, locationTranslated, isFullScreen, onSubmit, onFullScreen, onReadyToEraseLocation, onMapReady }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const type = useMemo(() => {
    const { type } = initMapInfo({ baiduMapKey, googleMapKey });
    return type;
  }, []);

  const ref = useRef(null);
  const mapRef = useRef(null);
  const geocRef = useRef(null);
  const markerRef = useRef(null);
  const labelRef = useRef(null);
  const googlePlacesRef = useRef(null);

  // Initialize input value with stored address if available
  useEffect(() => {
    if (locationTranslated?.address) {
      setInputValue(locationTranslated.address);
    }
  }, [locationTranslated]);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const search = useCallback(() => {
    if (type === MAP_TYPE.B_MAP) {
      const options = {
        onSearchComplete: (results) => {
          const status = local.getStatus();
          if (status !== window.BMAP_STATUS_SUCCESS) {
            toaster.danger(gettext('Search failed, please enter detailed address.'));
            return;
          }
          const searchResults = [];
          const numPois = results.getCurrentNumPois();
          for (let i = 0; i < numPois; i++) {
            const value = results.getPoi(i);
            searchResults.push({
              address: value.address || '',
              title: value.title || '',
              tag: value.tags || [],
              lngLat: {
                lng: value.point.lng,
                lat: value.point.lat,
              }
            });
          }
          setSearchResults(searchResults);
        }
      };

      const local = new window.BMapGL.LocalSearch(mapRef.current, options);
      local.search(inputValue);
    } else if (type === MAP_TYPE.G_MAP) {
      const request = {
        query: inputValue,
        language: lang,
      };
      googlePlacesRef.current.textSearch(request, (results, status) => {
        if (status === 'OK' && results?.length) {
          const searchResults = results.map(result => ({
            address: result.formatted_address || '',
            title: result.name || '',
            tag: result.types || [],
            lngLat: {
              lng: result.geometry.location.lng(),
              lat: result.geometry.location.lat(),
            }
          }));
          setSearchResults(searchResults);
        }
      });
    }
  }, [type, inputValue]);

  const onKeyDown = useCallback((e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (e.keyCode === KeyCodes.Enter) {
      search();
    } else if (e.keyCode === KeyCodes.Backspace) {
      setSearchResults([]);
    }
  }, [search]);

  const clear = useCallback(() => {
    setInputValue('');
    setSearchResults([]);
    if (type === MAP_TYPE.B_MAP) {
      mapRef.current?.clearOverlays();
    } else if (labelRef.current) {
      labelRef.current.setMap(null);
      labelRef.current = null;
    }
    onReadyToEraseLocation();
  }, [type, onReadyToEraseLocation]);

  const close = useCallback((e) => {
    e.stopPropagation();
    if (type === MAP_TYPE.B_MAP) {
      markerRef.current?.getLabel()?.remove();
    } else if (labelRef.current) {
      labelRef.current.setMap(null);
      labelRef.current = null;
    }
  }, [type]);

  const submit = useCallback((value) => {
    const { position, location_translated } = value;
    const location = {
      position,
      location_translated,
    };
    onSubmit(location);
  }, [onSubmit]);

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
      title: hasNearbyPoi ? (poi.title || '') : '',
      tags: hasNearbyPoi ? (poi.tags || []) : []
    };
  }, []);

  const parseGMapAddress = useCallback((result) => {
    const location_translated = {
      country: '',
      province: '',
      city: '',
      district: '',
      street: ''
    };

    result.address_components.forEach(component => {
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
      lat: result.geometry.location.lat()
    };

    return { position, location_translated };
  }, []);

  const setupLabelEventListeners = useCallback((info) => {
    setTimeout(() => {
      const labelElement = document.getElementById('selection-label-content');
      if (labelElement) {
        labelElement.addEventListener('click', (e) => e.stopPropagation());
      }

      const closeBtn = document.getElementById('selection-label-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', close);
      }

      const submitBtn = document.getElementById('selection-label-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => submit(info));
      }
    }, 100);
  }, [close, submit]);

  const addLabel = useCallback((point, useStoredData = false) => {
    if (type === MAP_TYPE.B_MAP) {
      markerRef.current?.getLabel()?.remove();

      if (useStoredData && locationTranslated?.address && position) {
        const storedPoint = new window.BMapGL.Point(position.lng, position.lat);
        const storedInfo = {
          position: position,
          location_translated: locationTranslated,
          title: locationTranslated.address,
          tags: []
        };

        // Ensure marker and map are positioned correctly
        if (markerRef.current) {
          markerRef.current.setPosition(storedPoint);
        }
        if (mapRef.current) {
          mapRef.current.setCenter(storedPoint);
        }
        setInputValue(locationTranslated.address);

        const label = customBMapLabel(storedInfo);
        markerRef.current?.setLabel(label);
        setupLabelEventListeners(storedInfo);
        return;
      }

      geocRef.current.getLocation(point, (result) => {
        const info = parseBMapAddress(result);
        const { title, location_translated } = info;
        setInputValue(location_translated.address || title);

        const label = customBMapLabel(info);
        markerRef.current?.setLabel(label);
        setupLabelEventListeners(info);
      });
    } else {
      if (useStoredData && locationTranslated?.address && position) {
        const storedInfo = {
          position: position,
          location_translated: locationTranslated
        };

        // Ensure marker and map are positioned correctly
        if (markerRef.current) {
          markerRef.current.position = position;
        } else {
          markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            position: position,
            map: mapRef.current,
          });
        }
        if (mapRef.current) {
          mapRef.current.panTo(position);
        }

        labelRef.current = customGMapLabel(storedInfo, submit);
        labelRef.current?.setMap(mapRef.current);
        setInputValue(locationTranslated.address);
        return;
      }

      geocRef.current.geocode({ location: point, language: lang }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const info = parseGMapAddress(results[0]);
          labelRef.current = customGMapLabel(info, submit);
          labelRef.current?.setMap(mapRef.current);
          setInputValue(info.location_translated.address);
        }
      });
    }
  }, [type, setupLabelEventListeners, parseBMapAddress, parseGMapAddress, locationTranslated, position, submit]);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL.Map || !ref.current) return;

    // Always create a fresh map instance
    mapRef.current = new window.BMapGL.Map(ref.current);
    const initPos = isValidPosition(position?.lng, position?.lat) ? position : DEFAULT_POSITION;
    const point = new window.BMapGL.Point(initPos.lng, initPos.lat);

    // Small delay to ensure map container has proper dimensions
    setTimeout(() => {
      mapRef.current.centerAndZoom(point, 16);
      mapRef.current.enableScrollWheelZoom();
      mapRef.current.clearOverlays();

      const ZoomControl = createBMapZoomControl({
        anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
        offset: { x: 16, y: 30 }
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
          addLabel(point, false);
        }
      });
      const geolocationControl = new GeolocationControl();
      mapRef.current.addControl(geolocationControl);

      markerRef.current = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
      geocRef.current = new window.BMapGL.Geocoder();
      if (isValidPosition(position?.lng, position?.lat)) {
        mapRef.current.addOverlay(markerRef.current);

        // If we have stored address, ensure map is centered on the actual stored position
        if (locationTranslated?.address) {
          const actualPoint = new window.BMapGL.Point(position.lng, position.lat);
          markerRef.current.setPosition(actualPoint);
          mapRef.current.setCenter(actualPoint);
          addLabel(actualPoint, true);
        } else {
          addLabel(point, false);
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
        addLabel(point, false);
      });

      // Notify parent that map is ready
      onMapReady?.();
    }, 10);

  }, [position, onMapReady, addLabel, locationTranslated?.address, searchResults.length]);

  const renderGoogleMap = useCallback(() => {
    if (!window.google?.maps?.Map || !ref.current) return;

    const isValid = isValidPosition(position?.lng, position?.lat);
    const initPos = isValid ? position : DEFAULT_POSITION;
    const isDark = document.body.getAttribute('data-bs-theme') === 'dark';

    // Use stored position for initial center if available, otherwise use initPos
    const initialCenter = isValid && locationTranslated?.address ? position : initPos;

    // Always create a fresh map instance
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
      colorScheme: isDark ? window.google.maps.ColorScheme.DARK : window.google.maps.ColorScheme.LIGHT,
    });

    // Small delay to ensure map container has proper dimensions
    setTimeout(() => {
      // Force resize trigger to ensure proper map layout
      window.google.maps.event.trigger(mapRef.current, 'resize');

      // Re-center the map after resize
      mapRef.current.setCenter(initialCenter);

      // control
      const zoomControl = createZoomControl({ map: mapRef.current });
      const geolocationControl = createGeolocationControl({
        map: mapRef.current,
        callback: (lngLat) => {
          geocRef.current.geocode({ location: lngLat, language: lang }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const info = parseGMapAddress(results[0]);
              setInputValue(info.location_translated.address);
              if (!markerRef.current) {
                markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
                  position: lngLat,
                  map: mapRef.current,
                });
              } else {
                markerRef.current.position = lngLat;
              }
              if (!labelRef.current) {
                addLabel(lngLat, false);
              } else {
                labelRef.current.setPosition(lngLat);
                labelRef.current.setInfo(info);
              }
            }
          });
        }
      });
      mapRef.current.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomControl);
      mapRef.current.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(geolocationControl);

      // marker
      if (isValid) {
        markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
          position,
          map: mapRef.current,
        });
      }

      // geocoder
      geocRef.current = new window.google.maps.Geocoder();
      if (isValid) {
        if (locationTranslated?.address) {
          addLabel(position, true);
        } else {
          addLabel(position, false);
        }
      }

      googlePlacesRef.current = new window.google.maps.places.PlacesService(mapRef.current);

      // map click event
      window.google.maps.event.addListener(mapRef.current, 'click', (e) => {
        if (searchResults.length > 0) {
          setSearchResults([]);
          return;
        }
        const latLng = e.latLng;
        const point = { lat: latLng.lat(), lng: latLng.lng() };

        if (!markerRef.current) {
          markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
            position: point,
            map: mapRef.current,
          });
        } else {
          markerRef.current.position = latLng;
        }
        mapRef.current.panTo(latLng);

        geocRef.current.geocode({ location: point, language: lang }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const info = parseGMapAddress(results[0]);
            if (!labelRef.current) {
              addLabel(point, false);
            } else {
              labelRef.current.setPosition(latLng);
              labelRef.current.setInfo(info);
            }
            setInputValue(info.location_translated.address);
          }
        });
      });

      // Notify parent that map is ready
      onMapReady?.();
    }, 10);
  }, [position, locationTranslated?.address, onMapReady, parseGMapAddress, addLabel, searchResults.length]);

  const toggleFullScreen = useCallback((e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onFullScreen();
  }, [onFullScreen]);

  const onSelect = useCallback((result) => {
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
      addLabel(point, false);
    } else {
      const point = { lat: lngLat.lat, lng: lngLat.lng };
      if (markerRef.current) {
        markerRef.current.position = point;
      }
      if (!labelRef.current) {
        addLabel(point, false);
      } else {
        labelRef.current.setPosition(point);
        labelRef.current.setInfo({
          title,
          tag: [],
          position: point,
          location_translated: {
            address,
            country: '',
            province: '',
            city: '',
            district: '',
            street: '',
          }
        });
      }
      mapRef.current.panTo(point);
    }
    setSearchResults([]);
    setInputValue(title || address);
  }, [type, addLabel]);

  useEffect(() => {
    // Reset map reference to ensure fresh initialization
    mapRef.current = null;
    markerRef.current = null;
    labelRef.current = null;

    // Always re-initialize the map to ensure proper centering
    // Add a small delay to ensure DOM is fully rendered when component re-mounts
    const initializeMap = () => {
      const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
      if (type === MAP_TYPE.B_MAP) {
        if (!window.BMapGL) {
          window.renderBaiduMap = () => renderBaiduMap();
          loadMapSource(type, key);
        } else {
          renderBaiduMap();
        }
      } else if (type === MAP_TYPE.G_MAP) {
        if (!window.google?.maps.Map) {
          window.renderGoogleMap = () => renderGoogleMap();
          loadMapSource(type, key);
        } else {
          renderGoogleMap();
        }
      }
    };

    // Use setTimeout to ensure DOM is ready, especially important for re-mounted components
    const timeoutId = setTimeout(initializeMap, 50);

    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        if (type === MAP_TYPE.B_MAP) {
          mapRef.current.clearOverlays?.();
        } else if (labelRef.current) {
          labelRef.current.setMap?.(null);
        }
        mapRef.current = null;
        markerRef.current = null;
        labelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={classNames('sf-geolocation-editor-container', { 'full-screen': isFullScreen })}>
      <div className="editor-header">
        <div className="title">
          <Icon symbol="location" size={24} className="location-icon" />
          <span className="ml-2">{gettext('Address')}</span>
        </div>
        <IconBtn className="full-screen" symbol="full-screen" size={24} onClick={toggleFullScreen} />
      </div>
      <div className="w-100 h-100 position-relative">
        <div className="search-container">
          <div className="flex-1 d-flex position-relative">
            <input
              type="text"
              value={inputValue}
              className="form-control search-input"
              placeholder={gettext('Please enter the address')}
              onChange={onChange}
              onKeyDown={onKeyDown}
              autoFocus
            />
            {inputValue && <IconBtn symbol="close" className="clean-btn" size={24} onClick={clear} />}
          </div>
          <span className="search-btn" onClick={search}>
            <i className="sf3-font sf3-font-search"></i>
          </span>
        </div>
        <div ref={ref} className="w-100 h-100 sf-metadata-geolocation-editor-container"></div>
        {searchResults.length > 0 && (
          <div className="search-results-container">
            {searchResults.map((result, index) => (
              <div key={index} className="search-result-item" onClick={() => onSelect(result)}>
                <span className="search-result-item-title">{result.title || ''}</span>
                <span className="search-result-item-address">{result.address || ''}</span>
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
    lng: PropTypes.number
  }),
  locationTranslated: PropTypes.shape({
    address: PropTypes.string,
    city: PropTypes.string,
    country: PropTypes.string,
    district: PropTypes.string,
    province: PropTypes.string
  }),
  isFullScreen: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onFullScreen: PropTypes.func.isRequired,
  onReadyToEraseLocation: PropTypes.func.isRequired,
  onMapReady: PropTypes.func
};

export default GeolocationEditor;
