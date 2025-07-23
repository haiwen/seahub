import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../../utils/coord-transform';
import { createBMapGeolocationControl, createBMapZoomControl } from '../../map-controller';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { baiduMapKey, gettext, googleMapKey } from '../../../../utils/constants';
import { KeyCodes, MAP_TYPE } from '../../../../constants';
import Icon from '../../../../components/icon';
import IconBtn from '../../../../components/icon-btn';
import toaster from '../../../../components/toast';

import './index.css';

const GeolocationEditor = ({ position, onSubmit }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const ref = useRef(null);
  const mapRef = useRef(null);
  const geocRef = useRef(null);

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
        for (const i in results.getCurrentNumPois()) {
          const value = results.getPoi(i);
          const position = {
            address: value.address || '',
            title: value.title || '',
            tag: value.tag || [],
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const { surroundingPois, address, point } = result;
    if (surroundingPois.length === 0) {
      value.address = address;
      value.lngLat = { lng: point.lng, lat: point.lat };
      value.tag = [];
      value.title = '';
    } else {
      const position = surroundingPois[0];
      const { address, title, tags, point } = position;
      value.address = address || '';
      value.title = title || '';
      value.tag = tags || [];
      value.lngLat = { lng: point.lng, lat: point.lat };
    }
    return value;
  };

  const createInfoOverlay = useCallback((info) => {
    const { address, title, tag } = info;
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

    label.addEventListener('click', (e) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    });
    return label;
  }, []);

  const renderBaiduMap = useCallback((position = { lat: '', lng: '' }) => {
    if (!window.BMapGL.Map) return;

    mapRef.current = new window.BMapGL.Map(ref.current);
    geocRef.current = new window.BMapGL.Geocoder();
    const gcPosition = wgs84_to_gcj02(position.lng, position.lat);
    const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
    const { lng, lat } = bdPosition;
    const point = new window.BMapGL.Point(lng, lat);
    mapRef.current.centerAndZoom(point, 16);
    mapRef.current.enableScrollWheelZoom();
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
        // const gcPosition = wgs84_to_gcj02(point.lng, point.lat);
        // const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
        const marker = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
        mapRef.current.clearOverlays();
        mapRef.current.addOverlay(marker);
        mapRef.current.setCenter(point);

        geocRef.current.getLocation(point, (result) => {
          const info = getInfo(result);
          const { title, address } = info;
          setInputValue(title || address);
          const label = createInfoOverlay(info);
          marker.setLabel(label);
        });
      }
    });
    const geolocationControl = new GeolocationControl();
    mapRef.current.addControl(geolocationControl);

    const marker = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
    mapRef.current.clearOverlays();
    mapRef.current.addOverlay(marker);
    mapRef.current.setCenter(point);
    geocRef.current.getLocation(point, (result) => {
      const info = getInfo(result);
      const { title, address } = info;
      setInputValue(title || address);
      const label = createInfoOverlay(info);
      marker.setLabel(label);
    });

    mapRef.current.addEventListener('click', (e) => {
      if (searchResults.length > 0) {
        setSearchResults([]);
        return;
      }
      const { lng, lat } = e.latlng;
      const point = new window.BMapGL.Point(lng, lat);
      const marker = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
      mapRef.current.clearOverlays();
      mapRef.current.addOverlay(marker);
      mapRef.current.setCenter(point);

      geocRef.current.getLocation(point, (result) => {
        const info = getInfo(result);
        const label = createInfoOverlay(info);
        marker.setLabel(label);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expandEditor = useCallback(() => {

  }, []);

  useEffect(() => {
    if (mapRef.current) return;
    const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
    if (type === MAP_TYPE.B_MAP) {
      if (!window.BMapGL) {
        window.renderBaiduMap = () => renderBaiduMap(position);
        loadMapSource(type, key);
      } else {
        renderBaiduMap(position);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-geolocation-editor-container">
      <div className="editor-header">
        <div className="title">
          <Icon symbol="location" size={24} />
          <span className="ml-2">{gettext('Address')}</span>
        </div>
        <div className="expand">
          <IconBtn symbol="expand" size={24} onClick={expandEditor} />
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
          <span className="search-btn">
            <i className="sf3-font sf3-font-search"></i>
          </span>
        </div>
        <div ref={ref} className="w-100 h-100 sf-metadata-geolocation-editor-container"></div>
      </div>
    </div>
  );
};

export default GeolocationEditor;
