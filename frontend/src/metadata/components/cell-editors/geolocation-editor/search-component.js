import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext, lang } from '../../../../utils/constants';
import { MAP_TYPE, KeyCodes } from '../../../../constants';
import IconBtn from '../../../../components/icon-btn';
import Icon from '../../../../components/icon';

const performSearch = (type, inputValue, map, callbacks) => {
  if (!inputValue.trim()) return;

  if (!map) {
    callbacks.onSearchError(gettext('Map is not ready'));
    return;
  }

  callbacks.onSearchStart();

  if (type === MAP_TYPE.B_MAP) {
    performBaiduSearch(inputValue, map, callbacks);
  } else if (type === MAP_TYPE.G_MAP) {
    performGoogleSearch(inputValue, map, callbacks);
  }
};

const performBaiduSearch = (inputValue, map, callbacks) => {
  if (!map || !window.BMapGL) {
    callbacks.onSearchError(gettext('Search service unavailable'));
    return;
  }

  const options = {
    onSearchComplete: (results) => {
      try {
        if (!results || typeof results.getCurrentNumPois !== 'function') {
          callbacks.onSearchError(gettext('Search service unavailable'));
          return;
        }

        const numPois = results.getCurrentNumPois();
        if (numPois === 0) {
          callbacks.onSearchError(gettext('No results found'));
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
          callbacks.onSearchError(gettext('No results found'));
          return;
        }

        callbacks.onSearchComplete(searchResults);
      } catch (error) {
        callbacks.onSearchError(gettext('Search service unavailable'));
      }
    },
    onSearchError: () => {
      callbacks.onSearchError(gettext('Search service unavailable'));
    }
  };

  try {
    const local = new window.BMapGL.LocalSearch(map, options);
    local.search(inputValue);
  } catch (error) {
    callbacks.onSearchError(gettext('Search service unavailable'));
  }
};

const performGoogleSearch = (inputValue, map, callbacks) => {
  if (!map || !window.google?.maps?.places?.PlacesService) {
    callbacks.onSearchError(gettext('Search service unavailable'));
    return;
  }

  const request = {
    query: inputValue,
    language: lang,
  };

  try {
    const placesService = new window.google.maps.places.PlacesService(map);
    placesService.textSearch(request, (results, status) => {
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
        callbacks.onSearchComplete(searchResults);
      } else {
        const errorMessage = status === 'ZERO_RESULTS'
          ? gettext('No results found')
          : gettext('Search service unavailable');
        callbacks.onSearchError(errorMessage);
      }
    });
  } catch (error) {
    callbacks.onSearchError(gettext('Search service unavailable'));
  }
};

const SearchComponent = ({
  type,
  value,
  onChange,
  onSelect,
  onClear,
  mapRefs,
  searchResults,
  setSearchResults,
  searchError,
  setSearchError,
  isSearching,
  setIsSearching,
}) => {
  const search = useCallback(() => {
    const callbacks = {
      onSearchStart: () => {
        setIsSearching(true);
        setSearchError('');
        setSearchResults([]);
      },
      onSearchComplete: (results) => {
        setIsSearching(false);
        setSearchResults(results);
      },
      onSearchError: (error) => {
        setIsSearching(false);
        setSearchError(error);
      },
    };

    let currentMap = null;
    if (type === MAP_TYPE.B_MAP) {
      currentMap = mapRefs.current?.baiduMap;
    } else if (type === MAP_TYPE.G_MAP) {
      currentMap = mapRefs.current?.googleMap;
    }

    if (!currentMap) {
      setTimeout(() => {
        if (type === MAP_TYPE.B_MAP) {
          currentMap = mapRefs.current?.baiduMap;
        } else if (type === MAP_TYPE.G_MAP) {
          currentMap = mapRefs.current?.googleMap;
        }

        if (currentMap) {
          performSearch(type, value, currentMap, callbacks);
        } else {
          callbacks.onSearchError(gettext('Map is not ready'));
        }
      }, 500);
      return;
    }

    performSearch(type, value, currentMap, callbacks);
  }, [type, value, mapRefs, setIsSearching, setSearchError, setSearchResults]);

  const onKeyDown = useCallback((e) => {
    if (e.keyCode === KeyCodes.Enter) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      search();
    } else if (e.keyCode === KeyCodes.Backspace) {
      setSearchResults([]);
    }
  }, [search, setSearchResults]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onClear();
    setSearchResults([]);
    setSearchError('');
  }, [onClear, setSearchResults, setSearchError]);

  const handleChange = useCallback((e) => {
    onChange(e);
    if (searchError) {
      setSearchError('');
    }
  }, [onChange, searchError, setSearchError]);

  const handleSelectResult = useCallback((result) => {
    onSelect(result);
    setSearchError('');
  }, [onSelect, setSearchError]);

  return (
    <>
      <div className="search-container">
        <div className="flex-1 d-flex position-relative">
          <input
            type="text"
            value={value}
            className="form-control search-input"
            placeholder={gettext('Please enter the address')}
            title={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
          />
          {value && (
            <IconBtn
              symbol="close"
              className="clean-btn"
              size={24}
              onClick={handleClear}
            />
          )}
        </div>
        <span
          className="search-btn"
          onClick={(!value.trim() || isSearching) ? undefined : search}
          disabled={isSearching || !value.trim()}
          style={{ cursor: (!value.trim() || isSearching) ? 'not-allowed' : 'pointer' }}
        >
          {isSearching ? (
            <i className="fa fa-spinner fa-spin"></i>
          ) : (
            <i className="sf3-font sf3-font-search"></i>
          )}
        </span>
      </div>

      {/* Search Error */}
      {searchError && (
        <div className="search-error-container">
          <div className="search-error-message">
            <Icon symbol="warning" size={16} className="error-icon" />
            <span>{searchError}</span>
          </div>
        </div>
      )}

      {/* Search Loading */}
      {isSearching && (
        <div className="search-loading-container">
          <div className="search-loading-message">
            <i className="fa fa-spinner fa-spin"></i>
            <span className="ml-2">{gettext('Searching...')}</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && !isSearching && (
        <div className="search-results-container">
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="search-result-item"
              onClick={() => handleSelectResult(result)}
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
    </>
  );
};

SearchComponent.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  mapRefs: PropTypes.object.isRequired,
  searchResults: PropTypes.array.isRequired,
  setSearchResults: PropTypes.func.isRequired,
  searchError: PropTypes.string.isRequired,
  setSearchError: PropTypes.func.isRequired,
  isSearching: PropTypes.bool.isRequired,
  setIsSearching: PropTypes.func.isRequired,
};

export default SearchComponent;
