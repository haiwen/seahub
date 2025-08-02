import { appAvatarURL, googleMapId, mediaUrl } from '../../../utils/constants';
import { createGeolocationControl } from '../../components/map-controller/geolocation';
import { createZoomControl } from '../../components/map-controller/zoom';
import { MIN_ZOOM, MAX_ZOOM } from '../../constants';
import { customImageOverlay, googleCustomAvatarOverlay } from './overlay';
import { wgs84_to_gcj02 } from '../../../utils/coord-transform';

let clickTimeout = null;

export const createGoogleMarkerClusterer = (map, images, onClusterLeaveIds) => {
  const markers = images.map(image => {
    const overlay = customImageOverlay({ isCluster: false, src: image.src, className: 'custom-image-overlay google-custom-overlay' });
    overlay.addEventListener('click', () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        const zoom = map.getZoom();
        map.setZoom(Math.min(zoom + 1, MAX_ZOOM));
        map.setCenter(image.gcPosition);
        return;
      }
      clickTimeout = setTimeout(() => {
        onClusterLeaveIds([image.id]);
        clickTimeout = null;
      }, 300);
    });

    return new window.google.maps.marker.AdvancedMarkerElement({
      position: image.gcPosition,
      map,
      content: overlay,
    });
  });

  return new window.markerClusterer.MarkerClusterer({
    map,
    markers,
    renderer: {
      render: (cluster) => {
        const imagesInBounds = images.filter(image => cluster.bounds.contains(image.gcPosition));
        const overlay = customImageOverlay({ isCluster: true, reduces: { src: imagesInBounds[0].src }, pointCount: cluster.count, className: 'custom-image-overlay google-custom-overlay' });
        overlay.addEventListener('click', () => {
          if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            const zoom = map.getZoom();
            map.setZoom(Math.min(zoom + 1, MAX_ZOOM));
            map.setCenter(cluster.position);
            return;
          }
          clickTimeout = setTimeout(() => {
            const imagesInBounds = images.filter(image => cluster.bounds.contains(image.gcPosition));
            onClusterLeaveIds(imagesInBounds.map(image => image.id));
            clickTimeout = null;
          }, 300);
        });

        return new window.google.maps.marker.AdvancedMarkerElement({
          position: imagesInBounds[0].gcPosition,
          content: overlay,
        });
      }
    },
    onClusterClick: () => {},
  });
};

export const createGoogleMap = ({ center, zoom, onMapState }) => {
  if (!window.google?.maps?.Map) return;

  const map = new window.google.maps.Map(document.getElementById('sf-metadata-map-container'), {
    mapId: googleMapId,
    center,
    zoom,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    cameraControl: false,
    disableDefaultUI: true,
    mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
  });

  const zoomControl = createZoomControl({ map });
  const geolocationControl = createGeolocationControl({ map });

  map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(zoomControl);
  map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(geolocationControl);

  map.addListener('center_changed', () => onMapState());
  map.addListener('zoom_changed', () => onMapState());

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((userInfo) => {
      let lat = userInfo.coords.latitude;
      let lng = userInfo.coords.longitude;
      const userPosition = wgs84_to_gcj02(lng, lat);
      const imageUrl = `${mediaUrl}img/marker.png`;
      googleCustomAvatarOverlay(map, userPosition, appAvatarURL, imageUrl);
      onMapState();
    });
  }

  return map;
};

