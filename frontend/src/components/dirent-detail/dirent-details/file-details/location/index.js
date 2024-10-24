import React from 'react';
import PropTypes from 'prop-types';
import { initMapInfo, loadMapSource, getMineMapUrl } from '../../../../../utils/map-utils';
import { MAP_TYPE, DOMESTIC_MAP_TYPE } from '../../../../../constants';
import Loading from '../../../../loading';
import { gettext } from '../../../../../utils/constants';
import { GEOLOCATION_FORMAT } from '../../../../../metadata/constants';
import { getGeolocationDisplayString } from '../../../../../metadata/utils/cell';
import { isValidPosition } from '../../../../../metadata/utils/validate';
import toaster from '../../../../toast';
import ObjectUtils from '../../../../../metadata/utils/object-utils';

import './index.css';

class Location extends React.Component {

  constructor(props) {
    super(props);
    const { baiduMapKey, googleMapKey, mineMapKey } = props;
    const { type, key } = initMapInfo({ baiduMapKey, googleMapKey, mineMapKey });
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
    const { position: customPosition } = this.props;
    window.navigator.geolocation.getCurrentPosition((position) => {
      const lng = position.coords.longitude;
      const lat = position.coords.latitude;
      this.currentPosition = { lng, lat };
      this.initMap(customPosition);
    }, (e) => {
      this.initMap(customPosition);
    }, { timeout: 5000 });
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
    if (this.mapType === MAP_TYPE.M_MAP) {
      if (!window.minemap) {
        loadMapSource(this.mapType, this.mapKey, this.loadMineMapCallBack);
      } else {
        this.renderMineMap(position);
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
      this.map = new window.BMap.Map('sf-geolocation-map-container', { enableMapClick: false });
      this.map.enableScrollWheelZoom(true);
      const { lng, lat } = position || {};
      if (!isValidPosition(lng, lat)) {
        const point = new window.BMap.Point(this.currentPosition.lng, this.currentPosition.lat);
        this.map.centerAndZoom(point, 18);
        return;
      }
      this.addMarkerByPosition(lng, lat);
      const point = new window.BMap.Point(lng, lat);
      this.map.centerAndZoom(point, 18);
      const geocoder = new window.BMap.Geocoder();
      geocoder.getLocation(point, (res) => {
        const addressRes = res.addressComponents;
        const addressArray = [addressRes.province, addressRes.city, addressRes.district, addressRes.street, addressRes.streetNumber];
        const address = addressArray.filter(item => item).join('');
        this.setState({ address });
      });
    });
  };

  renderGoogleMap = (position) => {
    const { lng, lat } = position || {};
    const isValid = isValidPosition(lng, lat);
    this.setState({ isLoading: false }, () => {
      const initCenter = isValid ? position : this.currentPosition;
      this.map = new window.google.maps.Map(this.ref, {
        zoom: 14,
        center: initCenter,
        mapId: this.props.googleMapId,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false
      });
      const { lng, lat } = position || {};
      if (!isValid) return;

      this.addMarkerByPosition(lng, lat);
      this.map.setCenter(position);
      var geocoder = new window.google.maps.Geocoder();
      var latLng = new window.google.maps.LatLng(lat, lng);
      geocoder.geocode({ 'location': latLng }, (results, status) => {
        if (status === 'OK') {
          if (results[0]) {
            var address = results[0].formatted_address;
            this.setState({ address });
          } else {
            toaster.warning(gettext('No address found for the given coordinates.'));
          }
        }
      });
    });
  };

  loadMineMapCallBack = () => {
    if (!this.timer) {
      this.timer = setTimeout(() => {
        const { domainUrl, dataDomainUrl, serverDomainUrl, spriteUrl, serviceUrl } = getMineMapUrl();
        window.minemap.domainUrl = domainUrl;
        window.minemap.dataDomainUrl = dataDomainUrl;
        window.minemap.serverDomainUrl = serverDomainUrl;
        window.minemap.spriteUrl = spriteUrl;
        window.minemap.serviceUrl = serviceUrl;
        window.minemap.key = this.mapKey;
        window.minemap.solution = 11001;
        this.renderMineMap();
        clearTimeout(this.timer);
        this.timer = null;
      }, 1000);
    }
  };

  renderMineMap = (position) => {
    this.setState({ isLoading: false }, () => {
      if (!window.minemap.key) return;
      this.map = new window.minemap.Map({
        container: 'sf-geolocation-map-container',
        style: 'https://service.minedata.cn/map/solu/style/11001',
        pitch: 0,
        maxZoom: 17,
        minZoom: 3,
        projection: 'MERCATOR'
      });
      this.map.setZoom(14);
      const { lng, lat } = position || {};
      if (!isValidPosition(lng, lat)) {
        this.map.setCenter([this.currentPosition.lng, this.currentPosition.lat]);
        return;
      }
      this.addMarkerByPosition(lng, lat);
      this.map.setCenter([lng, lat]);
    });
  };

  render() {
    const { isLoading, address } = this.state;
    const { position } = this.props;
    const isValid = isValidPosition(position?.lng, position?.lat);
    return (
      <>
        <div className="dirent-detail-item sf-metadata-property-detail-capture-information-item" key={'location'}>
          <div className="dirent-detail-item-name">{gettext('Location')}</div>
          <div className="dirent-detail-item-value" placeholder={gettext('Empty')}>
            {isValid && (
              <>
                {!isLoading && this.mapType && address && (
                  <>
                    <span>{address}</span>
                    <br />
                  </>
                )}
                <span>{getGeolocationDisplayString(position, { geo_format: GEOLOCATION_FORMAT.LNG_LAT })}</span>
              </>
            )}
          </div>
        </div>
        {isLoading ? (<Loading />) : (
          <>
            {this.mapType ? (
              <div className="dirent-detail-item-value-map">
                {!isLoading && (<div className="w-100 h-100" ref={ref => this.ref = ref} id="sf-geolocation-map-container"></div>)}
              </div>
            ) : (
              <div className="dirent-detail-item-value-map alert-danger error-message d-flex justify-content-center">
                {gettext('The map plugin is not properly configured. Contact the administrator.')}
              </div>
            )}
          </>
        )}
      </>
    );
  }

}

Location.propTypes = {
  location: PropTypes.object,
  baiduMapKey: PropTypes.string,
  googleMapKey: PropTypes.string,
  googleMapId: PropTypes.string,
  mineMapKey: PropTypes.string,
};

export default Location;
