import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { createBMapGeolocationControl, createBMapZoomControl } from '../../map-controller';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { baiduMapKey, gettext, googleMapId, googleMapKey, lang } from '../../../../utils/constants';
import { KeyCodes, MAP_TYPE } from '../../../../constants';
import Icon from '../../../../components/icon';
import IconBtn from '../../../../components/icon-btn';
import toaster from '../../../../components/toast';
import { DEFAULT_POSITION } from '../../../constants';
import { createZoomControl } from '../../map-controller/zoom';
import { createGeolocationControl } from '../../map-controller/geolocation';
import { customBMapLabel, customGMapLabel } from './custom-label';

import './index.css';

const GeolocationEditor = ({ position, isFullScreen, onSubmit, onFullScreen, onReadyToEraseLocation }) => {
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
          let searchResults = [];
          for (let i = 0; i < results.getCurrentNumPois(); i++) {
            const value = results.getPoi(i);
            const position = {
              address: value.address || '',
              title: value.title || '',
              tag: value.tags || [],
              lngLat: {
                lng: value.point.lng,
                lat: value.point.lat,
              }
            };
            searchResults.push(position);
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
        if (status === 'OK' && results[0]) {
          let searchResults = [];
          for (let i = 0; i < results.length; i++) {
            const value = {
              address: results[i].formatted_address || '',
              title: results[i].name || '',
              tag: results[i].types || [],
              lngLat: {
                lng: results[i].geometry.location.lng(),
                lat: results[i].geometry.location.lat(),
              }
            };
            searchResults.push(value);
          }
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
      mapRef.current.clearOverlays();
    } else {
      labelRef.current.setMap(null);
      labelRef.current = null;
    }
    onReadyToEraseLocation();
  }, [type, onReadyToEraseLocation]);

  const close = useCallback((e) => {
    e.stopPropagation();
    if (type === MAP_TYPE.B_MAP) {
      markerRef.current.getLabel()?.remove();
    } else {
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
    let value = {};
    const { surroundingPois, address, addressComponents, point } = result;
    if (surroundingPois.length === 0) {
      const { province, city, district, street } = addressComponents;
      value.position = { lng: point.lng, lat: point.lat };
      value.location_translated = {
        address,
        country: '',
        province,
        city,
        district,
        street,
      };
      value.title = '';
      value.tags = [];
    } else {
      const position = surroundingPois[0];
      const { address, title, tags, point, city, province } = position;
      value.position = { lng: point.lng, lat: point.lat };
      value.location_translated = {
        address,
        country: '',
        province,
        city,
        district: '',
        street: '',
      };
      value.title = title || '';
      value.tags = tags || [];
    }
    return value;
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

  const addLabel = useCallback((point) => {
    if (type === MAP_TYPE.B_MAP) {
      markerRef.current.getLabel()?.remove();
      geocRef.current.getLocation(point, (result) => {
        const info = parseBMapAddress(result);
        const { title, location_translated } = info;
        setInputValue(title || location_translated.address);
        const label = customBMapLabel(info);
        markerRef.current.setLabel(label);

        setTimeout(() => {
          const label = document.getElementById('selection-label-content');
          if (label) {
            label.addEventListener('click', (e) => e.stopPropagation());
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
      });
    } else {
      geocRef.current.geocode({ location: point, language: lang }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const info = parseGMapAddress(results[0]);
          labelRef.current = customGMapLabel(info, submit);
          labelRef.current.setMap(mapRef.current);
          setInputValue(info.location_translated.address);
        }
      });
    }
  }, [type, close, submit, parseBMapAddress, parseGMapAddress]);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL.Map) return;

    mapRef.current = new window.BMapGL.Map(ref.current);
    const initPos = position || DEFAULT_POSITION;
    const point = new window.BMapGL.Point(initPos.lng, initPos.lat);
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
        addLabel(point);
      }
    });
    const geolocationControl = new GeolocationControl();
    mapRef.current.addControl(geolocationControl);

    markerRef.current = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
    geocRef.current = new window.BMapGL.Geocoder();
    if (position) {
      mapRef.current.addOverlay(markerRef.current);
      addLabel(point);
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
      addLabel(point);
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lng, position?.lat]);

  const renderGoogleMap = useCallback(() => {
    mapRef.current = new window.google.maps.Map(ref.current, {
      center: position || DEFAULT_POSITION,
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
    });

    // control
    const zoomControl = createZoomControl({ map: mapRef.current });
    const geolocationControl = createGeolocationControl({
      map: mapRef.current,
      callback: (lngLat) => {
        geocRef.current.geocode({ location: lngLat, language: lang }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const info = parseGMapAddress(results[0]);
            setInputValue(info.location_translated.address);
            markerRef.current.position = lngLat;
            if (!labelRef.current) {
              addLabel(lngLat);
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
    markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
      position,
      map: mapRef.current,
    });

    // geocoder
    geocRef.current = new window.google.maps.Geocoder();
    addLabel(position);

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
            addLabel(point);
          } else {
            labelRef.current.setPosition(latLng);
            labelRef.current.setInfo(info);
          }
          setInputValue(info.location_translated.address);
        }
      });
    });
  }, [searchResults, position, addLabel, parseGMapAddress]);

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
      addLabel(point);
    } else {
      const point = { lat: lngLat.lat, lng: lngLat.lng };
      markerRef.current.position = point;
      if (!labelRef.current) {
        addLabel(point);
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
    if (mapRef.current) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={classNames('sf-geolocation-editor-container', { 'full-screen': isFullScreen })}>
      <div className="editor-header">
        <div className="title">
          <Icon symbol="location" size={24} />
          <span className="ml-2">{gettext('Address')}</span>
        </div>
        <div className="full-screen">
          <IconBtn symbol="full-screen" size={24} onClick={toggleFullScreen} />
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

export default GeolocationEditor;
