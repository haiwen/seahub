import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { initMapInfo } from '../../../../utils/map-utils';
import { baiduMapKey, googleMapKey } from '../../../../utils/constants';
import { MAP_TYPE } from '../../../../constants';
import LocationControls from './location-controls';
import SearchComponent from './search-component';
import MapContainer from './map-container';

import './index.css';

const GeolocationEditor = ({
  position,
  locationTranslated,
  isFullScreen,
  onSubmit,
  onFullScreen,
  onDeleteLocation,
  onMapReady,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [hasPositionChanged, setHasPositionChanged] = useState(false);
  const [currentLocationTranslated, setCurrentLocationTranslated] = useState(null);

  const [mapUpdateTrigger, setMapUpdateTrigger] = useState(0);

  const mapRefs = useRef({
    baiduMap: null,
    googleMap: null,
    baiduMarker: null,
    googleMarker: null,
  });

  const { type } = useMemo(() => initMapInfo({ baiduMapKey, googleMapKey }), []);

  useEffect(() => {
    setCurrentPosition(position);
    setHasPositionChanged(false);
  }, [position]);

  useEffect(() => {
    setInputValue(locationTranslated?.address || '');
    setCurrentLocationTranslated(locationTranslated);
  }, [locationTranslated]);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const submit = useCallback((value) => {
    const { position, location_translated } = value;
    const location = {
      position,
      location_translated,
    };
    onSubmit(location);
  }, [onSubmit]);

  const handleMapPositionChange = useCallback((newPosition) => {
    setCurrentPosition(newPosition);
    setHasPositionChanged(true);
  }, []);

  const handleAddressChange = useCallback((newAddress) => {
    setInputValue(newAddress);
  }, []);

  const handleLocationTranslatedChange = useCallback((newLocationTranslated) => {
    setCurrentLocationTranslated(newLocationTranslated);
  }, []);

  const handleMapReady = useCallback((refs) => {
    if (refs?.mapRef) {
      if (type === MAP_TYPE.B_MAP) {
        mapRefs.current.baiduMap = refs.mapRef;
        mapRefs.current.baiduMarker = refs.markerRef;
      } else if (type === MAP_TYPE.G_MAP) {
        mapRefs.current.googleMap = refs.mapRef;
        mapRefs.current.googleMarker = refs.markerRef;
      }
    }

    if (onMapReady) {
      onMapReady(refs.mapRef);
    }
  }, [onMapReady, type]);

  const selectSearchResult = useCallback((result) => {
    setInputValue(result.address || result.title);
    const position = result.lngLat;
    setCurrentPosition(position);
    setHasPositionChanged(true);

    setCurrentLocationTranslated({
      address: result.address || result.title,
      country: '',
      province: '',
      city: '',
      district: '',
      street: '',
    });

    setTimeout(() => {
      setSearchResults([]);
    }, 50);

    setMapUpdateTrigger(prev => prev + 1);
  }, []);

  const clearSearch = useCallback(() => {
    setInputValue('');
    setSearchResults([]);
    setSearchError('');
  }, []);

  const clearPosition = useCallback(() => {
    setCurrentPosition(null);
    setCurrentLocationTranslated(null);
    setHasPositionChanged(true);
    setInputValue('');
    setSearchResults([]);
    setSearchError('');

    if (onDeleteLocation) {
      onDeleteLocation();
    }
  }, [onDeleteLocation]);

  const save = useCallback(() => {
    if (!currentPosition || !inputValue) return;

    const locationData = {
      position: currentPosition,
      location_translated: {
        address: inputValue,
        country: currentLocationTranslated?.country || locationTranslated?.country || '',
        province: currentLocationTranslated?.province || locationTranslated?.province || '',
        city: currentLocationTranslated?.city || locationTranslated?.city || '',
        district: currentLocationTranslated?.district || locationTranslated?.district || '',
        street: currentLocationTranslated?.street || locationTranslated?.street || '',
      },
    };
    submit(locationData);
  }, [currentPosition, inputValue, currentLocationTranslated, locationTranslated, submit]);

  const toggleFullScreen = useCallback((e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const locationData = {
      position: currentPosition,
      location_translated: currentLocationTranslated.address,
    };
    onFullScreen(locationData);
  }, [currentLocationTranslated, currentPosition, onFullScreen]);

  return (
    <div
      className={classNames('sf-geolocation-editor-container', {
        'full-screen': isFullScreen,
      })}
    >
      <LocationControls
        hasLocationChanged={hasPositionChanged}
        onFullScreen={toggleFullScreen}
        onClear={clearPosition}
        onSave={save}
        position={currentPosition}
        inputValue={inputValue}
      />

      <div className="w-100 h-100 position-relative">
        <SearchComponent
          type={type}
          value={inputValue}
          onChange={onChange}
          onSelect={selectSearchResult}
          onClear={clearSearch}
          mapRefs={mapRefs}
          searchResults={searchResults}
          setSearchResults={setSearchResults}
          searchError={searchError}
          setSearchError={setSearchError}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
        />

        <MapContainer
          type={type}
          mapRefs={mapRefs}
          position={currentPosition}
          locationTranslated={currentLocationTranslated}
          onPositionChange={handleMapPositionChange}
          onAddressChange={handleAddressChange}
          onLocationTranslatedChange={handleLocationTranslatedChange}
          onMapReady={handleMapReady}
          isFullScreen={isFullScreen}
          updateTrigger={mapUpdateTrigger}
        />
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
};

export default GeolocationEditor;
