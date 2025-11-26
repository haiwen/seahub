import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { wgs84_to_gcj02 } from '../../../utils/coord-transform';

export const createGeolocationControl = ({ map, callback }) => {
  const container = document.createElement('div');
  container.className = classnames(
    'sf-map-control-container sf-map-geolocation-control-container d-flex align-items-center justify-content-center',
    { 'sf-map-geolocation-control-mobile': !Utils.isDesktop() }
  );

  const button = document.createElement('div');
  button.className = 'sf-map-control sf-map-geolocation-control d-flex align-items-center justify-content-center';
  button.innerHTML = '<svg class="sf-map-control-icon" viewBox="0 0 32 32" width="20" height="20"><path fill="currentColor" d="M16,1c8.3,0,15,6.7,15,15s-6.7,15-15,15S1,24.3,1,16S7.7,1,16,1z M17.5,4.7v3c0,0.8-0.7,1.5-1.5,1.5s-1.5-0.7-1.5-1.5v-3c-5,0.7-9,4.7-9.7,9.7h3c0.8,0,1.5,0.7,1.5,1.5c0,0.8-0.7,1.5-1.5,1.5h-3c0.7,5.1,4.7,9.1,9.7,9.8v-3.1c0-0.8,0.7-1.5,1.5-1.5c0.8,0,1.5,0.7,1.5,1.5v3.1c5.1-0.7,9.1-4.7,9.8-9.8h-3.1c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h3.1C26.6,9.4,22.5,5.4,17.5,4.7z M16,12c2.2,0,4,1.8,4,4s-1.8,4-4,4s-4-1.8-4-4S13.8,12,16,12z"/></svg>';
  container.appendChild(button);

  container.addEventListener('click', async (e) => {
    e.preventDefault();
    const originalClass = container.className;
    container.className = classnames(originalClass, 'sf-map-control-loading');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((userInfo) => {
        const gcPosition = wgs84_to_gcj02(userInfo.coords.longitude, userInfo.coords.latitude);
        map.setCenter(gcPosition);
        callback(gcPosition);
      });
    }
  });

  return container;
};

export function createBMapGeolocationControl({ anchor, offset, callback }) {
  function GeolocationControl() {
    this.defaultAnchor = anchor || window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new window.BMapGL.Size(offset?.x || 30, offset?.y || 90);
  }
  GeolocationControl.prototype = new window.BMapGL.Control();
  GeolocationControl.prototype.initialize = function (map) {
    const div = document.createElement('div');
    let className = classnames('sf-map-control-container sf-map-geolocation-control-container d-flex align-items-center justify-content-center', {
      'sf-map-control-container-mobile': !Utils.isDesktop()
    });

    const locationButton = document.createElement('div');
    locationButton.className = 'sf-map-control sf-map-geolocation-control d-flex align-items-center justify-content-center';
    locationButton.innerHTML = '<svg class="sf-map-control-icon" viewBox="0 0 32 32" width="16" height="16"><path fill="currentColor" d="M16,1c8.3,0,15,6.7,15,15s-6.7,15-15,15S1,24.3,1,16S7.7,1,16,1z M17.5,4.7v3c0,0.8-0.7,1.5-1.5,1.5s-1.5-0.7-1.5-1.5v-3c-5,0.7-9,4.7-9.7,9.7h3c0.8,0,1.5,0.7,1.5,1.5c0,0.8-0.7,1.5-1.5,1.5h-3c0.7,5.1,4.7,9.1,9.7,9.8v-3.1c0-0.8,0.7-1.5,1.5-1.5c0.8,0,1.5,0.7,1.5,1.5v3.1c5.1-0.7,9.1-4.7,9.8-9.8h-3.1c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5h3.1C26.6,9.4,22.5,5.4,17.5,4.7z M16,12c2.2,0,4,1.8,4,4s-1.8,4-4,4s-4-1.8-4-4S13.8,12,16,12z"/></svg>';
    div.appendChild(locationButton);

    div.className = className;
    div.onclick = (e) => {
      e.preventDefault();
      const geolocation = new window.BMapGL.Geolocation();
      div.className = classnames(className, 'sf-map-control-loading');
      geolocation.getCurrentPosition((result) => {
        div.className = className;
        if (result) {
          const point = result.point;
          callback(point);
        } else {
          // Positioning failed
          callback();
        }
      });
    };
    map.getContainer().appendChild(div);
    return div;
  };

  return GeolocationControl;
}
