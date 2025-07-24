import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { createBMapGeolocationControl, createBMapZoomControl } from '../../map-controller';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { baiduMapKey, gettext, googleMapKey } from '../../../../utils/constants';
import { KeyCodes, MAP_TYPE } from '../../../../constants';
import Icon from '../../../../components/icon';
import IconBtn from '../../../../components/icon-btn';
import toaster from '../../../../components/toast';
import { DEFAULT_POSITION } from '../../../constants';

import './index.css';

const GeolocationEditor = ({ position = DEFAULT_POSITION, isFullScreen, onSubmit, onFullScreen }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const ref = useRef(null);
  const mapRef = useRef(null);
  const geocRef = useRef(null);
  const markerRef = useRef(null);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const onSearch = useCallback(() => {
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
  }, [inputValue]);

  const onKeyDown = useCallback((e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    if (e.keyCode === KeyCodes.Enter) {
      onSearch();
    } else if (e.keyCode === KeyCodes.Backspace) {
      setSearchResults([]);
    }
  }, [onSearch]);

  const onClean = useCallback(() => {
    setInputValue('');
    setSearchResults([]);
  }, []);

  const getInfo = (result) => {
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
  };

  const createLabel = useCallback((info) => {
    const { location_translated, title, tag } = info;
    const { address } = location_translated;
    const tagContent = Array.isArray(tag) && tag.length > 0 ? tag[0] : '';
    let content = '';
    if (title) {
      content = `
        <div class='selection-label-content' id='selection-label-content'>
          <div class='w-100 d-flex align-items-center'>
            <span class='label-title text-truncate' title=${title}>${title}</span>
            <span class='close-btn' id='selection-label-close'>
              <i class='sf3-font sf3-font-x-01'></i>
            </span>
          </div>
          ${tagContent && `<span class='label-tag'>${tagContent}</span>`}
          <span class='label-address-tip'>${gettext('Address')}</span>
          <span class='label-address text-truncate' title=${address}>${address}</span>
          <div class='label-submit btn btn-primary' id='selection-label-submit'>${gettext('Fill in')}</div>
        </div>
      `;
    } else {
      content = `
      <div class='selection-label-content simple' id='selection-label-content'>
        <div class='w-100 d-flex align-items-center'>
          <span class='label-address text-truncate simple' title=${address}>${address}</span>
          <span class='close-btn' id='selection-label-close'>
            <i class='sf3-font sf3-font-x-01'></i>
          </span>
        </div>
        <div class='label-submit btn btn-primary' id='selection-label-submit'>${gettext('Fill in')}</div>
      </div>
    `;
    }

    const translateY = title ? '10%' : '15%';
    const label = new window.BMapGL.Label(content, { offset: new window.BMapGL.Size(9, -5) });
    label.setStyle({
      display: 'block',
      border: 'none',
      backgroundColor: '#ffffff',
      boxShadow: '1px 2px 1px rgba(0,0,0,.15)',
      padding: '3px 10px',
      transform: `translate(-50%, ${translateY})`,
      borderRadius: '3px',
      fontWeight: '500',
      left: '7px'
    });

    return label;
  }, []);

  const addLabelEventListener = useCallback((info) => {
    setTimeout(() => {
      const label = document.getElementById('selection-label-content');
      if (label) {
        label.addEventListener('click', (e) => e.stopPropagation());
      }

      const closeBtn = document.getElementById('selection-label-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          markerRef.current.getLabel().remove();
        });
      }

      const submitBtn = document.getElementById('selection-label-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const { position, location_translated } = info;
          // const gcPosition = bd09_to_gcj02(position.lng, position.lat);
          // const wgsPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
          const value = {
            position: { lng: position.lng, lat: position.lat },
            location_translated,
          };
          onSubmit(value);
        });
      }
    });
  }, [onSubmit]);

  const addLabel = useCallback((point) => {
    markerRef.current.getLabel()?.remove();
    geocRef.current.getLocation(point, (result) => {
      const info = getInfo(result);
      const { title, location_translated } = info;
      setInputValue(title || location_translated.address);
      const label = createLabel(info);
      markerRef.current.setLabel(label);
      addLabelEventListener(info);
    });
  }, [createLabel, addLabelEventListener]);

  const renderBaiduMap = useCallback(() => {
    if (!window.BMapGL.Map) return;

    mapRef.current = new window.BMapGL.Map(ref.current);
    const point = new window.BMapGL.Point(position.lng, position.lat);
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
        mapRef.current.setCenter(point);
        markerRef.current.setPosition(point);
        addLabel(point);
      }
    });
    const geolocationControl = new GeolocationControl();
    mapRef.current.addControl(geolocationControl);

    markerRef.current = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
    mapRef.current.addOverlay(markerRef.current);

    geocRef.current = new window.BMapGL.Geocoder();
    addLabel(point);

    mapRef.current.addEventListener('click', (e) => {
      if (searchResults.length > 0) {
        setSearchResults([]);
        return;
      }
      const { lng, lat } = e.latlng;
      const point = new window.BMapGL.Point(lng, lat);
      markerRef.current.setPosition(point);
      mapRef.current.setCenter(point);
      addLabel(point);
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lng, position.lat]);

  const toggleFullScreen = useCallback((e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    onFullScreen();
  }, [onFullScreen]);

  const onSelect = useCallback((result) => {
    const { lngLat, title, address } = result;
    const { lng, lat } = lngLat;
    const point = new window.BMapGL.Point(lng, lat);
    markerRef.current.setPosition(point);
    mapRef.current.setCenter(point);
    addLabel(point);
    setSearchResults([]);
    setInputValue(title || address);
  }, [addLabel]);

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
            {inputValue && <IconBtn symbol="close" className="clean-btn" size={24} onClick={onClean} />}
          </div>
          <span className="search-btn" onClick={onSearch}>
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
