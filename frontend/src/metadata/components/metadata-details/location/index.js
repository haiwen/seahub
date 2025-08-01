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
      isReadyToEraseLocation: false,
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
        isReadyToEraseLocation: false,
      });
    }
    if (!this.map) return;
    if (!isValidPosition(latLng?.lng, latLng?.lat)) return;

    if (prevState.latLng?.lat !== latLng.lat || prevState.latLng?.lng !== latLng.lng) {
      if (this.mapType === MAP_TYPE.B_MAP) {
        this.marker.setPosition(latLng);
        this.map.panTo(latLng);
      } else if (this.mapType === MAP_TYPE.G_MAP) {
        this.marker.position = latLng;
        this.map.panTo(latLng);
      }
    }
  }

  componentWillUnmount() {
    this.unsubscribeClearMapInstance();
    this.map = null;
  }

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

  addMarker = () => {
    const { latLng } = this.state;
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
      this.map = new window.BMapGL.Map('sf-geolocation-map-container');
      this.map.disableScrollWheelZoom(true);
      this.map.centerAndZoom(latLng, 16);

      const offset = { x: 10, y: Utils.isDesktop() ? 16 : 40 };
      const ZoomControl = createBMapZoomControl(window.BMapGL, { maxZoom: 21, minZoom: 3, offset });
      const zoomControl = new ZoomControl();
      this.map.addControl(zoomControl);
      this.addMarker();
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

      this.addMarker();
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
    if (this.state.isReadyToEraseLocation) {
      this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED, null);
      this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION, null);
      this.setState({ latLng: null, address: '', isReadyToEraseLocation: false });
      this.mapType === MAP_TYPE.B_MAP && this.map.destroy();
      this.map = null;
    }
  };

  onSubmit = (value) => {
    const { position, location_translated } = value;
    this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION_TRANSLATED, location_translated);
    this.props.onChange(PRIVATE_COLUMN_KEY.LOCATION, position);
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

  onReadyToEraseLocation = () => {
    this.setState({ isReadyToEraseLocation: true });
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
                <GeolocationEditor position={latLng} onSubmit={this.onSubmit} onFullScreen={this.onFullScreen} onReadyToEraseLocation={this.onReadyToEraseLocation} />
              </Popover>
            </ClickOutside>
          ) : (
            <Modal
              size='lg'
              isOpen={true}
              toggle={this.onFullScreen}
              zIndex={1052}
            >
              <GeolocationEditor position={latLng} isFullScreen={isFullScreen} onSubmit={this.onSubmit} onFullScreen={this.onFullScreen} onReadyToEraseLocation={this.onReadyToEraseLocation} />
            </Modal>
          )
        )}
      </>
    );
  }

}

export default Location;
