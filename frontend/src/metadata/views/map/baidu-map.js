import { toaster } from 'dtable-ui-component';
import { getTableColumnByName } from 'dtable-utils';
import { getCanUseAdvancedPerms } from '../utils/common-utils';
import loadBMap from '../utils/load-BMap';
import { MAP_MODE, COLORS, DEFAULT_MARK_COLOR, INITIAL_BUBBLE_RADIUS, IS_MOBILE } from '../constants';
import getConfigItemByType from '../utils/get-config-item-by-type';
import pluginContext from '../plugin-context';
import SerialPromise from '../utils/serial-promise';
import { getFormattedLocation, renderMarks, getPoint, getLabelContent } from '../utils/location-utils';
import { generateDirectLabel } from '../utils/set-direct-label';
import { EVENT_BUS_TYPE } from '../constants/event-bus-type';
import * as image from '../image/index';
import eventBus from '../utils/event-bus';
import ImageMarker from '../components/custom-image-marker';
import Bubble from '../components/custom-marker';
import { createBMapGeolocationControl } from '../components/geolocation-control';
import { BMAP_STATUS_SUCCESS } from '../constants/index';
import { CustomCircleOverlay } from './avatar-overlay';

const BUTTON_CLOSED = 'buttonInitialClosed';

class BaiduMap {

  constructor(props) {
    this.mapKey = props.mapKey;
    this.mapType = props.mapType;
    this.map = null;
    this.geocoder = null;
    this.eventBus = eventBus;
    this.markerClusterer = null;
    this.sameLocationList = [];
    this.mapMarkers = new window.Map();
    this.serialPromise = new SerialPromise(this.addMarker, 100);
    this.userInfo = null;

    this.errorHandler = props.errorHandler;
    this.userAvatarUrl = props.userAvatarUrl;

    this.avatarMarker = null;
    this.userLocationPoint = null;
  }

  loadMapScript = (locations, configSettings, showUserLocation) => {
    if (!this.mapKey) return;
    if (!window.BMap) {
      return loadBMap(this.mapKey).then(() => {
        // render map
        window.renderMap = () => this.renderMap(locations, configSettings);
        this.renderMap(locations, configSettings);
        return Promise.resolve();
      }).then(() => { // Get current user info
        if (!showUserLocation) {
          return Promise.reject(BUTTON_CLOSED);
        }
        // locate user position
        return pluginContext.getUserCommonInfo();
      }).then((res) => { // Get current user location
        // render marker
        this.userInfo = res;
        return this.getUserLocation();
      }).then(() => { // Add current user avatar overlay
        this.initUserLocationAvatar();
        return Promise.resolve();
      }).catch((err) => {
        if (err === BUTTON_CLOSED) return;
        let errMessage = err;
        if (typeof err !== 'string') {
          errMessage = err.message || JSON.stringify(err);
        }
        this.errorHandler(errMessage);
      });
    }

    return Promise.resolve();
  };

  getUserLocation = () => {
    const geolocation = new window.BMap.Geolocation();
    const that = this;
    return new Promise((resolve, reject) => {
      geolocation.getCurrentPosition(function (r) {
        if (this.getStatus() === BMAP_STATUS_SUCCESS) {
          that.userLocationPoint = r.point;
          resolve();
        } else {
          reject(`error_code: ${this.getStatus()} 获取用户当前位置失败`);
        }
      });
    });
  };

  // after user avatar loaded, add user avatar marker
  loadUserAvatarMarker = (userAvatarUrl) => {
    // if default marker exits , then remove it
    if (this.defaultMarker) {
      this.map.removeOverlay(this.defaultMarker);
    }
    const CircleImgOverlay = CustomCircleOverlay();
    this.avatarMarker = new CircleImgOverlay(this.userLocationPoint, userAvatarUrl, {});
  };

  initUserLocationAvatar = () => {
    this.loadUserAvatarMarker(this.userInfo.avatar_url);
    this.addUserLocationMarker();
  };

  addUserLocationMarker = () => {
    this.map.addOverlay(this.avatarMarker);
    this.map.panTo(this.userLocationPoint);
  };

  removeUserLocationMarker = () => {
    this.map.removeOverlay(this.avatarMarker);
  };

  resetUserLocationMarker = async (isShowMarker) => {
    if (isShowMarker) {
      try {
        if (!this.userInfo) {
          const result = await pluginContext.getUserCommonInfo();
          this.userInfo = result;
        }
        await this.getUserLocation();
        this.loadUserAvatarMarker(this.userInfo.avatar_url);
        this.addUserLocationMarker();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(error);
      }
    } else {
      this.removeUserLocationMarker();
    }
  };

  renderMap = (locations, configSettings) => {
    if (!getCanUseAdvancedPerms() && locations.length > 100) {
      toaster.danger('地理位置超过 100 个限制，请升级到团队付费版本');
      return;
    }
    if (window.BMap && window.BMap.Map) {
      // init map
      if (!this.map) {
        this.map = new window.BMap.Map('map-container');
        this.addMapController();
        let BMapCenter = window.localStorage.getItem('BMapCenter');
        let point; let zoom;
        if (BMapCenter) {
          BMapCenter = JSON.parse(BMapCenter);
          const center = BMapCenter.point;
          zoom = BMapCenter.zoom;
          point = new window.BMap.Point(center.lng, center.lat);
        } else {
          point = new window.BMap.Point(116.404, 39.915);
          zoom = 3;
        }
        this.renderLocations(locations, configSettings);
        this.map.centerAndZoom(point, zoom);
        this.map.enableScrollWheelZoom(true);
        if (window.BMapLib) {
          this.markerClusterer = new window.BMapLib.MarkerClusterer(this.map, { markers: this.newMarkers });
        }
        this.map.addEventListener('click', () => {
          this.eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_LOCATION_DETAILS);
        });
      } else {
        // update marker
        this.renderLocations(locations, configSettings);
      }
    }
  };

  renderLocations = (locations, configSettings) => {
    const locationItem = locations[0] || {};
    const addressType = locationItem.type;
    if (!addressType) return;
    if (addressType === 'geolocation' || addressType === 'province_city' || addressType === 'province' || addressType === 'province_city_district') {
      this.serialPromise.clearTask();
      if (!this.geocoder) {
        this.geocoder = new window.BMap.Geocoder();
      }
      this.geocoding(locations, configSettings);
    } else {
      renderMarks(locations, configSettings, this.addMarker, this.mapMarkers, this.mapType);
    }
  };

  addMarker = (locations, configSettings, location, point, addressType = 'geolocation') => {
    if (!location || !point) {
      return;
    }
    if (!locations.find(i => i.rowId === location.rowId)) return;
    const tableName = getConfigItemByType(configSettings, 'table').active;
    const currentTable = pluginContext.getTableByName(tableName);
    const row = pluginContext.getRow(currentTable, location.rowId);
    const sameLocationItem = this.sameLocationList.find(item => item.point.lng === point.lng && item.point.lat === point.lat);

    if (sameLocationItem) {
      sameLocationItem.rows.push(row);
      sameLocationItem.rows = Array.from(new Map(sameLocationItem.rows.map(item => [item._id, item])).values());
    } else {
      const locationItem = {
        point,
        rows: [row],
      };
      this.sameLocationList.push(locationItem);
    }
    if (addressType === 'geolocation') {
      const columnSetting = configSettings.find(settingItem => settingItem.type === 'column');
      if (location.columnName !== columnSetting.active) {
        return;
      }
    }
    let mapMode = configSettings[0].active;
    let marker;
    if (mapMode === MAP_MODE.DEFAULT) {
      let markerIcon = new window.BMap.Icon(image['marker'], new window.BMap.Size(19, 25));
      marker = new window.BMap.Marker(point, { icon: markerIcon, offset: new window.BMap.Size(-2, -12) });
      if (location.color) {
        const colorIndex = COLORS.findIndex((item) => location.color === item.COLOR);
        if (colorIndex > -1) {
          markerIcon = new window.BMap.Icon(image['image' + (colorIndex + 1)], new window.BMap.Size(19, 25), { imageSize: new window.BMap.Size(19, 25) });
          marker = new window.BMap.Marker(point, { icon: markerIcon, offset: new window.BMap.Size(-3, -10) });
        }
      }
      if (location.directShownLabel) {
        const Label = generateDirectLabel(location.directShownLabel, point);
        marker.setLabel(Label);
      }
      if (IS_MOBILE) {
        this.addMarkerMobileHandler(marker, location, currentTable, row);
      } else {
        this.addMarkerHandler(marker, location, currentTable, row);
      }
    } else if (mapMode === MAP_MODE.IMAGE) {
      const imageColumn = getTableColumnByName(currentTable, location.imageColumnName) || {};
      const imageUrlList = row[imageColumn.key] || [];
      marker = ImageMarker(point, currentTable, row, imageUrlList); // custom overlay
    } else {
      let bubbleBorderColor = DEFAULT_MARK_COLOR['BORDER_COLOR'];
      let radius = location.rate * INITIAL_BUBBLE_RADIUS < 10 ? 10 : location.rate * INITIAL_BUBBLE_RADIUS;
      radius *= location.bubbleSize;
      const colorIndex = COLORS.findIndex((item) => location.color === item.COLOR);
      let label = getLabelContent(location);
      if (colorIndex > -1) {
        bubbleBorderColor = COLORS[colorIndex]['BORDER_COLOR'];
        marker = Bubble(point, radius, COLORS[colorIndex]['RGB_COLOR'], bubbleBorderColor, label, location.directShownLabel, currentTable, row);
      } else {
        marker = Bubble(point, radius, DEFAULT_MARK_COLOR['BG_COLOR'], bubbleBorderColor, label, location.directShownLabel, currentTable, row);
      }
    }
    this.mapMarkers.set(location.rowId, marker);
    if (mapMode === MAP_MODE.IMAGE) {
      this.createdMarkerClusterer(locations);
      return;
    }
    this.map.addOverlay(marker);
  };

  createdMarkerClusterer = (locations) => {
    if (this.mapMarkers.size === locations.length) {
      this.addMarkerClusterer(locations);
      return;
    }
    const locationItem = locations[0] || {};
    const addressType = locationItem.type;
    if (!addressType) return;
    if ((addressType === 'geolocation'
    || addressType === 'province_city'
    || addressType === 'province'
    || addressType === 'province_city_district')
    && this.mapMarkers.size % 200 === 0) {
      this.addMarkerClusterer(locations);
    }
  };

  addMarkerClusterer = (locations) => {
    this.markerClusterer.clearMarkers();
    let newMarkers = [];
    locations.forEach(location => {
      const newMarker = this.mapMarkers.get(location.rowId);
      if (newMarker) {
        newMarkers.push(newMarker);
      }
    });
    this.markerClusterer.addMarkers(newMarkers);
  };

  addMarkerHandler = (marker, location, table, row) => {
    marker.addEventListener('click', (e) => {
      e.domEvent.stopPropagation();
      this.eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, marker.point);
    });
    // marker.addEventListener('dblclick', (e) => {
    //   pluginContext.expandRow(row);
    // });
    marker.addEventListener('mouseover', (e) => {
      const content = getLabelContent(location);
      const label = new window.BMap.Label(content, { offset: new window.BMap.Size(9, -5) });
      label.setStyle({
        display: 'block',
        border: 'none',
        backgroundColor: '#ffffff',
        boxShadow: '1px 2px 1px rgba(0,0,0,.15)',
        padding: '3px 10px',
        transform: 'translate(-50%, -100%)',
        borderRadius: '3px',
        fontWeight: '500'
      });
      e.target.setTop(true);
      e.target.setLabel(label);
    });
    marker.addEventListener('mouseout', (e) => {
      e.target.setTop(false);
      e.target.getLabel().remove();
    });
  };

  addMarkerMobileHandler = (marker, location, table, row) => {
    marker.addEventListener('click', (e) => {
      const content = getLabelContent(location);
      const markerLabel = e.target.getLabel();
      if (markerLabel) {
        if (markerLabel.content.indexOf('direct-shown-label-container') < 0) {
          markerLabel.remove();
          e.target.setTop(false);
          return;
        }
      }
      const label = new window.BMap.Label(content, { offset: new window.BMap.Size(9, -5) });
      label.setStyle({
        display: 'block',
        border: 'none',
        backgroundColor: '#ffffff',
        boxShadow: '1px 2px 1px rgba(0,0,0,.15)',
        padding: '3px 10px',
        transform: 'translate(-50%, -100%)',
        borderRadius: '3px',
        fontWeight: '500'
      });
      e.target.setTop(true);
      e.target.setLabel(label);
      this.eventBus.dispatch(EVENT_BUS_TYPE.SHOW_LOCATION_DETAILS, marker.point);
    });
    // marker.addEventListener('dblclick', () => {
    //   pluginContext.expandRow(row);
    // });
  };

  geocoding = (locations, configSettings) => {
    for (let i = 0; i < locations.length; i++) {
      const { detailLocation } = getFormattedLocation(locations[i]);
      if (!detailLocation || this.mapMarkers.get(locations[i].rowId)) {
        continue;
      }
      const task = getPoint(locations, configSettings, this.geocoder, locations[i]);
      this.serialPromise.addTask(task);
    }
  };

  getLocation = (point, callback) => {
    if (!this.geocoder) {
      this.geocoder = new window.BMap.Geocoder();
    }
    return this.geocoder.getLocation(point, (location) => {
      callback(location);
    });
  };

  addMapController = () => {
    var navigation = new window.BMap.NavigationControl();
    const GeolocationControl = createBMapGeolocationControl(window.BMap, this.geolocationCallback);
    let geolocationControl = new GeolocationControl();
    this.map.addControl(geolocationControl);
    this.map.addControl(navigation);
  };

  geolocationCallback = (error, point) => {
    if (!error) {
      this.map.setCenter({ lng: point.lng, lat: point.lat });
    }
  };

  clearAllMarkers = () => {
    this.mapMarkers.clear();
    this.markerClusterer && this.markerClusterer.clearMarkers();
    this.map && this.map.clearOverlays();
  };

  clearTargetMarker = (item) => {
    const marker = this.mapMarkers.get(item.rowId);
    this.map && this.map.removeOverlay(marker);
    this.mapMarkers.delete(item.rowId);
  };

}

export default BaiduMap;
