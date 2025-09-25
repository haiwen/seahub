import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Modal, Popover } from 'reactstrap';
import { initMapInfo, loadMapSource } from '../../../../utils/map-utils';
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
import ClickOutside from '../../../../components/click-outside';
import GeolocationEditor from '../../cell-editors/geolocation-editor';
import { bd09_to_gcj02, gcj02_to_bd09, gcj02_to_wgs84, wgs84_to_gcj02 } from '../../../../utils/coord-transform';

import './index.css';

class Location extends React.Component {

  static propTypes = {
    position: PropTypes.object,
    record: PropTypes.object,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    const { type, key } = initMapInfo({ baiduMapKey, googleMapKey });
    this.mapType = type;
    this.mapKey = key;
    this.map = null;
    this.marker = null;
    this.state = {
      latLng: this.props.position,
      address: this.props.record?._location_translated?.address || '',
      isLoading: false,
      isEditorShown: false,
      isFullScreen: false,
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

  componentDidUpdate(prevProps, prevState) {
    const { latLng } = this.state;
    if (prevProps.record._id !== this.props.record._id) {
      this.setState({
        latLng: this.props.position,
        address: this.props.record?._location_translated?.address || '',
      });
    }

    if (prevProps.record?._location_translated?.address !== this.props.record?._location_translated?.address) {
      this.setState({
        address: this.props.record?._location_translated?.address || '',
      });
    }

    if (prevProps.position !== this.props.position) {
      this.setState({
        latLng: this.props.position,
      }, () => {
        if (isValidPosition(this.props.position?.lng, this.props.position?.lat) && !this.map) {
          this.initMap();
        }
      });
    }

    if (!this.map) return;
    if (!isValidPosition(latLng?.lng, latLng?.lat)) return;

    if (prevState.latLng?.lat !== latLng.lat || prevState.latLng?.lng !== latLng.lng) {
      const position = this.convertToMapCoords(latLng);
      if (this.mapType === MAP_TYPE.B_MAP) {
        this.marker.setPosition(position);
        this.map.panTo(position);
      } else if (this.mapType === MAP_TYPE.G_MAP) {
        this.marker.position = position;
        this.map.panTo(position);
      }
    }
  }

  componentWillUnmount() {
    this.unsubscribeClearMapInstance();
    this.map = null;
  }
  // Converts WGS84 coordinates to the map's native coordinate system
  convertToMapCoords = (position) => {
    if (!isValidPosition(position?.lng, position?.lat)) {
      return null;
    }
    if (this.mapType === MAP_TYPE.B_MAP) {
      const gcjPos = wgs84_to_gcj02(position.lng, position.lat);
      const bdPos = gcj02_to_bd09(gcjPos.lng, gcjPos.lat);
      return bdPos;
    }
    return position;
  };

  // Converts coordinates from the map's native system to WGS84
  convertFromMapCoords = (position) => {
    if (!isValidPosition(position?.lng, position?.lat)) {
      return null;
    }
    if (this.mapType === MAP_TYPE.B_MAP) {
      const gcjPos = bd09_to_gcj02(position.lng, position.lat);
      const wgsPos = gcj02_to_wgs84(gcjPos.lng, gcjPos.lat);
      return wgsPos;
    }
    return position;
  };

  initMap = () => {
    const { record } = this.props;
    const { latLng } = this.state;
    if (!isValidPosition(latLng?.lng, latLng?.lat) || typeof record !== 'object') return;
    this.setState({ isLoading: true }, () => {
      if (this.mapType === MAP_TYPE.B_MAP) {
        if (!window.BMapGL) {
          window.renderBaiduMap = () => this.renderBaiduMap();
          loadMapSource(this.mapType, this.mapKey);
        } else {
          this.renderBaiduMap();
        }
      } else if (this.mapType === MAP_TYPE.G_MAP) {
        if (!window.google?.maps.Map) {
          window.renderGoogleMap = () => this.renderGoogleMap();
          loadMapSource(this.mapType, this.mapKey);
        } else {
          this.renderGoogleMap();
        }
      }
    });
  };

  addMarker = (latLng) => {
    if (this.mapType === MAP_TYPE.B_MAP) {
      this.marker = new window.BMapGL.Marker(latLng);
      this.map.addOverlay(this.marker);
    } else if (this.mapType === MAP_TYPE.G_MAP) {
      this.marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: latLng,
        map: this.map,
      });
    }
  };

  renderBaiduMap = () => {
    this.setState({ isLoading: false }, () => {
      if (!window.BMapGL.Map) return;

      const { latLng } = this.state;
      const gcPos = wgs84_to_gcj02(latLng.lng, latLng.lat);
      const bdPos = gcj02_to_bd09(gcPos.lng, gcPos.lat);
      this.map = new window.BMapGL.Map('sf-geolocation-map-container');
      this.map.disableScrollWheelZoom(true);
      this.map.centerAndZoom(bdPos, 16);

      const offset = { x: 10, y: Utils.isDesktop() ? 16 : 40 };
      const ZoomControl = createBMapZoomControl(window.BMapGL, { maxZoom: 21, minZoom: 3, offset });
      const zoomControl = new ZoomControl();
      this.map.addControl(zoomControl);
      this.addMarker(bdPos);
    });
  };

  renderGoogleMap = () => {
    const { latLng } = this.state;
    this.setState({ isLoading: false }, () => {
      if (!window.google.maps.Map) return;
      this.map = new window.google.maps.Map(this.ref, {
        zoom: 16,
        center: latLng,
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

      this.addMarker(latLng);
      const zoomControl = createZoomControl({ map: this.map });
      this.map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomControl);
      this.map.panTo(latLng);
    });
  };

  openEditor = () => {
    this.setState({ isEditorShown: true });
  };

  onFullScreen = () => {
    this.setState({ isFullScreen: !this.state.isFullScreen });
  };

  closeEditor = () => {
    this.setState({ isEditorShown: false });
  };

  onSubmit = (value) => {
    const { position, location_translated } = value;
    const latLng = this.convertFromMapCoords(position);
    this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED, location_translated);
    this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION, latLng);
    this.setState({
      latLng: position,
      address: location_translated?.address,
      isEditorShown: false,
      isFullScreen: false,
    }, () => {
      if (!this.map) {
        this.initMap();
      }
    });
  };

  onDeleteLocation = () => {
    this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED, null);
    this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION, null);
    this.setState({
      latLng: null,
      address: '',
      isEditorShown: false,
      isFullScreen: false
    });
    if (this.map) {
      this.mapType === MAP_TYPE.B_MAP && this.map.destroy();
      this.map = null;
    }
  };

  render() {
    const { isLoading, latLng, address, isEditorShown, isFullScreen } = this.state;
    const isValid = isValidPosition(latLng?.lng, latLng?.lat);
    return (
      <>
        <DetailItem
          id="location-item"
          field={{
            key: PRIVATE_COLUMN_KEY.LOCATION,
            type: CellType.GEOLOCATION,
            name: getColumnDisplayName(PRIVATE_COLUMN_KEY.LOCATION)
          }}
          readonly={false}
        >
          {isValid ? (
            <div ref={ref => this.editorRef = ref} className="sf-metadata-ui cell-formatter-container geolocation-formatter sf-metadata-geolocation-formatter w-100 cursor-pointer" onClick={this.openEditor}>
              {!isLoading && this.mapType && address ? (
                <span>{address}</span>
              ) : (
                <span>{getGeolocationDisplayString(latLng, { geo_format: GEOLOCATION_FORMAT.LNG_LAT })}</span>
              )}
            </div>
          ) : (
            <div ref={ref => this.editorRef = ref} className="sf-metadata-property-detail-editor sf-metadata-record-cell-empty cursor-pointer" placeholder={gettext('Empty')} onClick={this.openEditor}></div>
          )}
        </DetailItem>
        {isLoading ? (<Loading />) : this.mapType && (
          <div className={classnames('dirent-detail-item dirent-detail-item-value-map', { 'd-none': !isValid })}>
            <div className="w-100 h-100" ref={ref => this.ref = ref} id="sf-geolocation-map-container"></div>
          </div>
        )}
        {isEditorShown && (
          !isFullScreen ? (
            <ClickOutside onClickOutside={this.closeEditor}>
              <Popover
                target="location-item"
                isOpen={true}
                hideArrow={true}
                fade={false}
                placement="left"
                className="sf-metadata-property-detail-editor-popover sf-metadata-geolocation-property-detail-editor-popover"
                boundariesElement="viewport"
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                }}
              >
                <GeolocationEditor
                  position={this.convertToMapCoords(latLng)}
                  locationTranslated={this.props.record?._location_translated}
                  onSubmit={this.onSubmit}
                  onFullScreen={this.onFullScreen}
                  onDeleteLocation={this.onDeleteLocation}
                />
              </Popover>
            </ClickOutside>
          ) : (
            <Modal
              size='lg'
              isOpen={true}
              toggle={this.onFullScreen}
              zIndex={1052}
            >
              <GeolocationEditor
                position={this.convertToMapCoords(latLng)}
                locationTranslated={this.props.record?._location_translated}
                isFullScreen={isFullScreen}
                onSubmit={this.onSubmit}
                onFullScreen={this.onFullScreen}
                onDeleteLocation={this.onDeleteLocation}
              />
            </Modal>
          )
        )}
      </>
    );
  }

}

export default Location;
