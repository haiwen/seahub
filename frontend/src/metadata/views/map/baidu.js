import { appAvatarURL, mediaUrl } from '../../../utils/constants';
import { gcj02_to_bd09, wgs84_to_gcj02 } from '../../../utils/coord-transform';
import { Utils } from '../../../utils/utils';
import { createBMapGeolocationControl, createBMapZoomControl } from '../../components/map-controller';
import { MIN_ZOOM, MAX_ZOOM } from '../../constants';
import { customAvatarOverlay, customImageOverlay } from './overlay';

const getPoints = (images) => {
  if (!window.Cluster || !images) return [];
  return window.Cluster.pointTransformer(images, (data) => ({
    point: [data.location.lng, data.location.lat],
    properties: {
      id: data.id,
      src: data.src,
    }
  }));
};

const createClusterer = (map, images, onClusterLeaveIds) => {
  let clickTimeout = null;
  const cluster = new window.Cluster.View(map, {
    clusterRadius: 60,
    updateRealTime: true,
    fitViewOnClick: false,
    isAnimation: true,
    clusterMap: (properties) => ({ src: properties.src, id: properties.id }),
    clusterReduce: (acc, properties) => {
      if (!acc.properties) {
        acc.properties = [];
      }
      acc.properties.push(properties);
    },
    renderClusterStyle: {
      type: window.Cluster.ClusterRender.DOM,
      style: { offsetX: -40, offsetY: -80 },
      inject: (props) => customImageOverlay(props),
    },
  });

  cluster.setData(getPoints(images));

  cluster.on(window.Cluster.ClusterEvent.CLICK, (element) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      return;
    } else {
      clickTimeout = setTimeout(() => {
        let imageIds = [];
        if (element.isCluster) {
          imageIds = cluster.getLeaves(element.id).map(item => item.properties.id).filter(Boolean);
        } else {
          imageIds = [element.properties.id];
        }
        clickTimeout = null;
        onClusterLeaveIds(imageIds);
      }, 300);
    }
  });

  return cluster;
};

export const createBaiduMap = ({ type, images, center, zoom, onMapState, onClusterLeaveIds }) => {
  if (!window.BMapGL) return;
  const map = new window.BMapGL.Map('sf-metadata-map-container', {
    enableMapClick: false,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    mapType: type,
  });

  map.centerAndZoom(center, zoom);
  map.enableScrollWheelZoom(true);

  // add controls
  const ZoomControl = createBMapZoomControl({
    anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
    offset: new window.BMapGL.Size(66, Utils.isDesktop() ? 30 : 90),
  });
  const zoomControl = new ZoomControl();

  const GeolocationControl = createBMapGeolocationControl({
    anchor: window.BMAP_ANCHOR_BOTTOM_RIGHT,
    offset: new window.BMapGL.Size(30, Utils.isDesktop() ? 30 : 90),
    callback: (point) => {
      const gcPosition = wgs84_to_gcj02(point.lng, point.lat);
      const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
      map.centerAndZoom(new window.BMapGL.Point(bdPosition.lng, bdPosition.lat), map.getZoom());
    }
  });
  const geolocationControl = new GeolocationControl();

  map.addControl(zoomControl);
  map.addControl(geolocationControl);

  map.addEventListener('zoomend', () => onMapState());

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((userInfo) => {
      const gcPosition = wgs84_to_gcj02(userInfo.coords.longitude, userInfo.coords.latitude);
      const bdPosition = gcj02_to_bd09(gcPosition.lng, gcPosition.lat);
      const { lng, lat } = bdPosition;
      const userPosition = new window.BMapGL.Point(lng, lat);
      const imageUrl = `${mediaUrl}img/marker.png`;
      const avatarMarker = customAvatarOverlay(userPosition, appAvatarURL, imageUrl);
      map.addOverlay(avatarMarker);
      onMapState();
    });
  }

  window.BMapCluster = createClusterer(map, images, onClusterLeaveIds);

  return map;
};
