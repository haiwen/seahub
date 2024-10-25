import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { MAP_TYPE, DOMESTIC_MAP_TYPE } from '../../../../constants';
import Loading from '../../../../components/loading';
import { gettext, baiduMapKey, googleMapKey, googleMapId } from '../../../../utils/constants';
import { CellType, GEOLOCATION_FORMAT, PRIVATE_COLUMN_KEY } from '../../../constants';
import { getGeolocationDisplayString } from '../../../utils/cell';
import { isValidPosition } from '../../../utils/validate';
import toaster from '../../../../components/toast';
import ObjectUtils from '../../../utils/object-utils';
import DetailItem from '../../../../components/dirent-detail/detail-item';
import { getColumnDisplayName } from '../../../utils/column';

import './index.css';

class Location extends React.Component {

  constructor(props) {
    super(props);
    const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
    this.mapType = type;
    this.mapKey = key;
    this.map = null;
    this.currentPosition = {};
    this.state = {
      address: '',
      isLoading: true,
    };
  }

  componentDidMount() {
    this.initMap(this.props.position);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { position } = nextProps;
    if (!ObjectUtils.isSameObject(position, this.props.position)) {
      this.initMap(position);
    }
  }

  componentWillUnmount() {
    if (this.map && DOMESTIC_MAP_TYPE.includes(this.mapType)) {
      this.mineMapMarker = null;
    } else if (this.map && this.mapType === MAP_TYPE.G_MAP) {
      this.googleMarker = null;
    }
    this.map = null;
    this.setState = (state, callback) => {
      return;
    };
  }

  initMap = (position) => {
    this.setState({ isLoading: true });
    if (this.mapType === MAP_TYPE.B_MAP) {
      if (!window.BMap) {
        window.renderBaiduMap = () => this.renderBaiduMap(position);
        loadMapSource(this.mapType, this.mapKey);
      } else {
        this.renderBaiduMap(position);
      }
      return;
    }
    if (this.mapType === MAP_TYPE.G_MAP) {
      if (!window.google) {
        window.renderGoogleMap = () => this.renderGoogleMap(position);
        loadMapSource(this.mapType, this.mapKey);
      } else {
        this.renderGoogleMap(position);
      }
      return;
    }
    this.setState({ isLoading: false });
  };

  addMarkerByPosition = (lng, lat) => {
    if (this.mapType === MAP_TYPE.B_MAP) {
      let point = new window.BMap.Point(lng, lat);
      const marker = new window.BMap.Marker(point, { offset: new window.BMap.Size(-2, -5) });
      this.map && this.map.clearOverlays();
      this.map && this.map.addOverlay(marker);
      return;
    }
    if (this.mapType === MAP_TYPE.G_MAP) {
      if (!this.googleMarker) {
        this.googleMarker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lng, lat },
          map: this.map,
        });
        return;
      }
      this.googleMarker.setPosition({ lng, lat });
      return;
    }
    if (this.mapType === MAP_TYPE.M_MAP) {
      if (!this.mineMapMarker) {
        this.mineMapMarker = new window.minemap.Marker({
          draggable: false,
          anchor: 'top-left',
          color: 'red',
          rotation: 0,
          pitchAlignment: 'map',
          rotationAlignment: 'map',
          scale: 0.8
        }).setLngLat({ lng, lat }).addTo(this.map);
        return;
      }
      this.mineMapMarker.setLngLat({ lng, lat });
    }
  };

  renderBaiduMap = (position = {}) => {
    this.setState({ isLoading: false }, () => {
      if (!window.BMap.Map) return;
      const { lng, lat } = position || {};
      if (!isValidPosition(lng, lat)) return;
      this.map = new window.BMap.Map('sf-geolocation-map-container', { enableMapClick: false });
      this.addMarkerByPosition(lng, lat);
      const point = new window.BMap.Point(lng, lat);
      this.map.centerAndZoom(point, 14);
      this.map.enableScrollWheelZoom(true);
      const geocoder = new window.BMap.Geocoder();
      geocoder.getLocation(point, (res) => {
        const address = res.address;
        this.setState({ address });
      });
    });
  };

  renderGoogleMap = (position) => {
    this.setState({ isLoading: false }, () => {
      if (!window.google.maps.Map) return;
      const { lng, lat } = position || {};
      const isValid = isValidPosition(lng, lat);
      if (!isValid) return;
      this.map = new window.google.maps.Map(this.ref, {
        zoom: 14,
        center: position,
        mapId: googleMapId,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
      });
      this.addMarkerByPosition(lng, lat);
      this.map.setCenter(position);
      var geocoder = new window.google.maps.Geocoder();
      var latLng = new window.google.maps.LatLng(lat, lng);
      geocoder.geocode({ 'location': latLng }, (results, status) => {
        if (status === 'OK') {
          if (results[0]) {
            var address = results[0].formatted_address.split(' ')[1];
            this.setState({ address });
          } else {
            toaster.warning(gettext('No address found for the given coordinates.'));
          }
        }
      });
    });
  };

  render() {
    const { isLoading, address } = this.state;
    const { position } = this.props;
    const isValid = isValidPosition(position?.lng, position?.lat);
    return (
      <>
        <DetailItem field={{ key: PRIVATE_COLUMN_KEY.LOCATION, type: CellType.GEOLOCATION, name: getColumnDisplayName(PRIVATE_COLUMN_KEY.LOCATION) }} readonly={true}>
          {isValid ? (
            <div className="sf-metadata-ui cell-formatter-container geolocation-formatter sf-metadata-geolocation-formatter">
              {!isLoading && this.mapType && address && (
                <>
                  <span>{address}</span>
                  <br />
                </>
              )}
              <span>{getGeolocationDisplayString(position, { geo_format: GEOLOCATION_FORMAT.LNG_LAT })}</span>
            </div>
          ) : (
            <div className="sf-metadata-record-cell-empty" placeholder={gettext('Empty')}></div>
          )}
        </DetailItem>
        {isLoading ? (<Loading />) : this.mapType && (
          <div className={classnames('dirent-detail-item-value-map', { 'd-none': !isValid })}>
            <div className="w-100 h-100" ref={ref => this.ref = ref} id="sf-geolocation-map-container"></div>
          </div>
        )}
      </>
    );
  }

}

Location.propTypes = {
  location: PropTypes.object,
};

export default Location;
