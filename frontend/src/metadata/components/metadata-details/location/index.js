import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
import { wgs84_to_gcj02, gcj02_to_bd09 } from '../../../../utils/coord-transform';
import { MAP_TYPE } from '../../../../constants';
import Loading from '../../../../components/loading';
import { gettext, baiduMapKey, googleMapKey, googleMapId } from '../../../../utils/constants';
import { CellType, EVENT_BUS_TYPE, GEOLOCATION_FORMAT, PRIVATE_COLUMN_KEY } from '../../../constants';
import { getGeolocationDisplayString } from '../../../utils/cell';
import { isValidPosition } from '../../../utils/validate';
import DetailItem from '../../../../components/dirent-detail/detail-item';
import { getColumnDisplayName } from '../../../utils/column';
import { createBMapZoomControl } from '../../map-controller';
import { Utils } from '../../../../utils/utils';
import { eventBus } from '../../../../components/common/event-bus';
import { createZoomControl } from '../../map-controller/zoom';

import './index.css';

class Location extends React.Component {

  static propTypes = {
    position: PropTypes.object,
    record: PropTypes.object,
  };

  constructor(props) {
    super(props);
    const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
    this.mapType = type;
    this.mapKey = key;
    this.map = null;
    this.state = {
      address: '',
      isLoading: false,
    };
  }

  componentDidMount() {
    this.initMap();

    this.unsubscribeClearMapInstance = eventBus.subscribe(EVENT_BUS_TYPE.CLEAR_MAP_INSTANCE, () => {
      if (window.mapInstance) {
        window.mapInstance = null;
        delete window.mapInstance;
      }
    });
  }

  componentDidUpdate(prevProps) {
    const { position, record } = this.props;
    if (!isValidPosition(position?.lng, position?.lat) || typeof record !== 'object') return;
    if (prevProps.position?.lng === position?.lng && prevProps.position?.lat === position?.lat) return;
    let transformedPos = wgs84_to_gcj02(position.lng, position.lat);
    if (this.mapType === MAP_TYPE.B_MAP) {
      transformedPos = gcj02_to_bd09(transformedPos.lng, transformedPos.lat);
    }
    this.addMarkerByPosition(transformedPos.lng, transformedPos.lat);

    this.setState({ address: record._location_translated?.address });
  }

  componentWillUnmount() {
    this.unsubscribeClearMapInstance();
  }

  initMap = () => {
    if (this.map) return;

    const { position, record } = this.props;
    if (!isValidPosition(position?.lng, position?.lat) || typeof record !== 'object') return;

    this.setState({ isLoading: true, address: record._location_translated?.address });
    if (this.mapType === MAP_TYPE.B_MAP) {
      if (!window.BMapGL) {
        window.renderBaiduMap = () => this.renderBaiduMap(position);
        loadMapSource(this.mapType, this.mapKey);
      } else {
        this.renderBaiduMap(position);
      }
    } else if (this.mapType === MAP_TYPE.G_MAP) {
      if (!window.google?.maps.Map) {
        window.renderGoogleMap = () => this.renderGoogleMap(position);
        loadMapSource(this.mapType, this.mapKey);
      } else {
        this.renderGoogleMap(position);
      }
    }
  };

  addMarkerByPosition = (lng, lat) => {
    if (!this.map) {
      this.initMap(this.props.position);
      return;
    }
    if (this.mapType === MAP_TYPE.B_MAP) {
      if (this.lastLng === lng && this.lastLat === lat) return;
      this.lastLng = lng;
      this.lastLat = lat;

      const point = new window.BMapGL.Point(lng, lat);
      const marker = new window.BMapGL.Marker(point, { offset: new window.BMapGL.Size(-2, -5) });
      this.map.clearOverlays();
      this.map.addOverlay(marker);
      this.map.setCenter(point);
    }
    if (this.mapType === MAP_TYPE.G_MAP) {
      if (!this.googleMarker) {
        this.googleMarker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat, lng },
          map: this.map,
        });
        return;
      }

      this.googleMarker.position = { lat, lng };
      this.map.setCenter({ lat, lng });
      return;
    }
  };

  renderBaiduMap = (position = {}) => {
    this.setState({ isLoading: false }, () => {
      if (!window.BMapGL.Map) return;

      window.mapInstance = new window.BMapGL.Map('sf-geolocation-map-container', { enableMapClick: false });
      this.map = window.mapInstance;

      const gcPosition = wgs84_to_gcj02(position.lng, position.lat);
      const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
      const { lng, lat } = bdPosition;
      const point = new window.BMapGL.Point(lng, lat);
      this.map.centerAndZoom(point, 16);
      this.map.disableScrollWheelZoom(true);

      const offset = { x: 10, y: Utils.isDesktop() ? 16 : 40 };
      const ZoomControl = createBMapZoomControl(window.BMapGL, { maxZoom: 21, minZoom: 3, offset });
      const zoomControl = new ZoomControl();
      this.map.addControl(zoomControl);
      this.addMarkerByPosition(lng, lat);
    });
  };

  renderGoogleMap = (position) => {
    this.setState({ isLoading: false }, () => {
      if (!window.google.maps.Map) return;

      const gcPosition = wgs84_to_gcj02(position.lng, position.lat);
      const { lng, lat } = gcPosition || {};
      window.mapInstance = new window.google.maps.Map(this.ref, {
        zoom: 16,
        center: gcPosition,
        mapId: googleMapId,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
      });
      this.map = window.mapInstance;

      this.addMarkerByPosition(lng, lat);
      const zoomControl = createZoomControl(this.map);
      this.map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomControl);
      this.map.setCenter(gcPosition);
    });
  };

  render() {
    const { isLoading, address } = this.state;
    const { position } = this.props;
    const isValid = isValidPosition(position?.lng, position?.lat);
    return (
      <>
        <DetailItem
          field={{
            key: PRIVATE_COLUMN_KEY.LOCATION,
            type: CellType.GEOLOCATION,
            name: getColumnDisplayName(PRIVATE_COLUMN_KEY.LOCATION)
          }}
          readonly={true}
        >
          {isValid ? (
            <div className="sf-metadata-ui cell-formatter-container geolocation-formatter sf-metadata-geolocation-formatter">
              {!isLoading && this.mapType && address ? (
                <span>{address}</span>
              ) : (
                <span>{getGeolocationDisplayString(position, { geo_format: GEOLOCATION_FORMAT.LNG_LAT })}</span>
              )}
            </div>
          ) : (
            <div className="sf-metadata-record-cell-empty" placeholder={gettext('Empty')}></div>
          )}
        </DetailItem>
        {isLoading ? (<Loading />) : this.mapType && (
          <div className={classnames('dirent-detail-item dirent-detail-item-value-map', { 'd-none': !isValid })}>
            <div className="w-100 h-100" ref={ref => this.ref = ref} id="sf-geolocation-map-container"></div>
          </div>
        )}
      </>
    );
  }

}

export default Location;
